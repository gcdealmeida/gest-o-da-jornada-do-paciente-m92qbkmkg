routerAdd(
  'POST',
  '/backend/v1/whatsapp-demo/reply',
  (e) => {
    const userId = e.auth?.id
    if (!userId) {
      return e.unauthorizedError('Autenticação necessária')
    }

    const body = e.requestInfo().body || {}
    const conversationId = body.conversation_id
    const content = (body.content || '').trim()

    if (!conversationId || !content) {
      return e.badRequestError('conversation_id e content são obrigatórios')
    }

    let conv
    try {
      conv = $app.findRecordById('conversations', conversationId)
    } catch (_) {
      return e.notFoundError('Conversa não encontrada')
    }

    const msgsCol = $app.findCollectionByNameOrId('messages')
    const msg = new Record(msgsCol)
    msg.set('conversation_id', conv.id)
    msg.set('sender', 'inbound')
    msg.set('channel', conv.getString('channel') || 'whatsapp')
    msg.set('content', content)
    msg.set('is_automatic', false)
    $app.save(msg)

    // Update conversation
    const currentUnread = conv.getInt('unread_count') || 0
    conv.set('unread_count', currentUnread + 1)
    conv.set('last_message_preview', content)
    conv.set('last_message_at', new Date().toISOString())
    $app.save(conv)

    // Patient journey record & potential auto-qualification
    const patientId = conv.getString('patient_id')
    if (patientId) {
      try {
        const patient = $app.findRecordById('patients', patientId)
        patient.set('last_contact_at', new Date().toISOString())
        $app.save(patient)

        const jeCol = $app.findCollectionByNameOrId('journey_events')
        const je = new Record(jeCol)
        je.set('patient_id', patient.id)
        je.set('type', 'mensagem')
        je.set('stage', patient.getString('stage'))
        je.set('title', 'Mensagem WhatsApp Recebida')
        je.set('description', content.length > 80 ? content.slice(0, 77) + '...' : content)
        je.set('is_automatic', false)
        $app.save(je)
      } catch (_) {}
    }

    return e.json(200, {
      status: 'recebida',
      message: {
        id: msg.id,
        conversation_id: msg.getString('conversation_id'),
        sender: msg.getString('sender'),
        channel: msg.getString('channel'),
        content: msg.getString('content'),
        created: msg.getString('created'),
      },
    })
  },
  $apis.requireAuth(),
)
