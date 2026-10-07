routerAdd(
  'POST',
  '/backend/v1/whatsapp/send',
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

    // Check if WhatsApp is connected
    let isConnected = false
    let settingsRec = null
    try {
      const activeList = $app.findRecordsByFilter(
        'whatsapp_settings',
        'is_active = true',
        '-created',
        1,
        0,
      )
      if (activeList && activeList.length > 0) {
        settingsRec = activeList[0]
        isConnected = true
      }
    } catch (_) {}

    const channel = conv.getString('channel') || 'whatsapp'

    // If channel is not WhatsApp or integration is NOT connected, fallback to demo / local delivery
    if (channel !== 'whatsapp' || !isConnected || !settingsRec) {
      const msgsCol = $app.findCollectionByNameOrId('messages')
      const msg = new Record(msgsCol)
      msg.set('conversation_id', conv.id)
      msg.set('sender', 'outbound')
      msg.set('channel', channel)
      msg.set('content', content)
      msg.set('sent_by', userId)
      msg.set('is_automatic', false)
      $app.save(msg)

      conv.set('last_message_preview', content)
      conv.set('last_message_at', new Date().toISOString())
      $app.save(conv)

      const patientId = conv.getString('patient_id')
      if (patientId) {
        try {
          const patient = $app.findRecordById('patients', patientId)
          const jeCol = $app.findCollectionByNameOrId('journey_events')
          const je = new Record(jeCol)
          je.set('patient_id', patient.id)
          je.set('type', 'mensagem')
          je.set('stage', patient.getString('stage'))
          je.set('title', 'Mensagem WhatsApp Enviada (Demo)')
          je.set('description', content.length > 80 ? content.slice(0, 77) + '...' : content)
          je.set('responsible_id', userId)
          je.set('is_automatic', false)
          $app.save(je)
        } catch (_) {}
      }

      return e.json(200, {
        status: 'enviada',
        mode: 'demo',
        message: {
          id: msg.id,
          conversation_id: msg.getString('conversation_id'),
          sender: msg.getString('sender'),
          channel: msg.getString('channel'),
          content: msg.getString('content'),
          sent_by: msg.getString('sent_by'),
          created: msg.getString('created'),
        },
      })
    }

    // CONNECTED MODE: Real Meta Cloud API send
    // Check 24-hour service window: find last inbound message from contact
    let isWithin24h = false
    try {
      const lastInbounds = $app.findRecordsByFilter(
        'messages',
        'conversation_id = "' + conv.id + '" && sender = "inbound"',
        '-created',
        1,
        0,
      )
      if (lastInbounds && lastInbounds.length > 0) {
        const lastInboundTime = new Date(lastInbounds[0].getString('created')).getTime()
        const diffHours = (Date.now() - lastInboundTime) / (1000 * 60 * 60)
        if (diffHours <= 24) {
          isWithin24h = true
        }
      }
    } catch (_) {}

    // Destinatário
    let recipientPhone = conv.getString('contact_identifier') || ''
    // Tentar pegar do paciente se disponível
    const patientId = conv.getString('patient_id')
    if (patientId) {
      try {
        const p = $app.findRecordById('patients', patientId)
        if (p.getString('phone')) {
          recipientPhone = p.getString('phone')
        }
      } catch (_) {}
    }

    // Limpar telefone para dígitos apenas (ex: 5519995191425)
    let cleanRecipient = recipientPhone.replace(/\D/g, '')
    if (
      !cleanRecipient.startsWith('55') &&
      (cleanRecipient.length === 10 || cleanRecipient.length === 11)
    ) {
      cleanRecipient = '55' + cleanRecipient
    }

    if (!cleanRecipient) {
      return e.badRequestError('Telefone do destinatário inválido na conversa')
    }

    // Regra da Meta: Mensagens iniciadas pela empresa fora da janela de 24h exigem Template de Mensagem aprovado
    // Se estiver fora da janela de 24h e for texto livre, retornar aviso claro
    if (!isWithin24h) {
      // Bloquear e orientar conforme as diretrizes da Meta
      return e.json(422, {
        ok: false,
        requires_template: true,
        error:
          'A janela de atendimento de 24h do WhatsApp está encerrada para este contato. Conforme as regras oficiais da Meta, para iniciar ou retomar conversas fora da janela de 24 horas é obrigatório utilizar um Template de Mensagem (Modelo Aprovado pela Meta) ou aguardar que o paciente envie uma nova mensagem.',
      })
    }

    const phoneNumberId = settingsRec.getString('phone_number_id')
    const accessToken = settingsRec.getString('access_token')

    const metaSendUrl = 'https://graph.facebook.com/v21.0/' + phoneNumberId + '/messages'

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanRecipient,
      type: 'text',
      text: {
        preview_url: false,
        body: content,
      },
    }

    let metaRes
    try {
      metaRes = $http.send({
        url: metaSendUrl,
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        timeout: 15,
      })
    } catch (sendErr) {
      return e.json(502, {
        ok: false,
        error: 'Falha de conexão com a Meta: ' + (sendErr.message || String(sendErr)),
      })
    }

    if (metaRes.statusCode < 200 || metaRes.statusCode >= 300) {
      const errJson = metaRes.json || {}
      const metaErrMsg = errJson.error?.message || 'Erro da Meta: HTTP ' + metaRes.statusCode
      return e.json(400, {
        ok: false,
        error: metaErrMsg,
        details: errJson.error || null,
      })
    }

    // Gravar mensagem enviada com sucesso no banco
    const msgsCol = $app.findCollectionByNameOrId('messages')
    const msg = new Record(msgsCol)
    msg.set('conversation_id', conv.id)
    msg.set('sender', 'outbound')
    msg.set('channel', 'whatsapp')
    msg.set('content', content)
    msg.set('sent_by', userId)
    msg.set('is_automatic', false)
    $app.save(msg)

    conv.set('last_message_preview', content)
    conv.set('last_message_at', new Date().toISOString())
    $app.save(conv)

    if (patientId) {
      try {
        const patient = $app.findRecordById('patients', patientId)
        const jeCol = $app.findCollectionByNameOrId('journey_events')
        const je = new Record(jeCol)
        je.set('patient_id', patient.id)
        je.set('type', 'mensagem')
        je.set('stage', patient.getString('stage'))
        je.set('title', 'Mensagem WhatsApp Enviada (Meta Cloud API)')
        je.set('description', content.length > 80 ? content.slice(0, 77) + '...' : content)
        je.set('responsible_id', userId)
        je.set('is_automatic', false)
        $app.save(je)
      } catch (_) {}
    }

    return e.json(200, {
      status: 'enviada',
      mode: 'connected',
      meta_response: metaRes.json || {},
      message: {
        id: msg.id,
        conversation_id: msg.getString('conversation_id'),
        sender: msg.getString('sender'),
        channel: msg.getString('channel'),
        content: msg.getString('content'),
        sent_by: msg.getString('sent_by'),
        created: msg.getString('created'),
      },
    })
  },
  $apis.requireAuth(),
)
