routerAdd('POST', '/backend/v1/whatsapp/webhook', (e) => {
  // Inbound WhatsApp Cloud API webhook receiver
  const body = e.requestInfo().body || {}

  // Meta sends { object: "whatsapp_business_account", entry: [...] }
  if (body.object !== 'whatsapp_business_account') {
    return e.json(200, { status: 'ignored_not_whatsapp' })
  }

  const entries = body.entry || []
  for (const entry of entries) {
    const changes = entry.changes || []
    for (const change of changes) {
      if (change.field !== 'messages') continue

      const val = change.value || {}
      const messages = val.messages || []
      const contacts = val.contacts || []

      for (const metaMsg of messages) {
        const from = metaMsg.from // e.g. "5519995191425"
        if (!from) continue

        // Normalizar telefone com +55
        let rawDigits = (from || '').replace(/\D/g, '')
        if (!rawDigits.startsWith('55') && (rawDigits.length === 10 || rawDigits.length === 11)) {
          rawDigits = '55' + rawDigits
        }
        const normalizedPhone = '+' + rawDigits

        // Extrair conteúdo da mensagem
        let textContent = ''
        if (metaMsg.type === 'text') {
          textContent = metaMsg.text?.body || ''
        } else if (metaMsg.type === 'button') {
          textContent = metaMsg.button?.text || '[Botão clicado]'
        } else if (metaMsg.type === 'interactive') {
          textContent =
            metaMsg.interactive?.button_reply?.title ||
            metaMsg.interactive?.list_reply?.title ||
            '[Resposta interativa]'
        } else {
          textContent = '[' + (metaMsg.type || 'mensagem') + ' recebida via WhatsApp]'
        }

        if (!textContent) textContent = '[Mensagem vazia]'

        // Extrair nome do perfil do contato enviado pela Meta
        let contactProfileName = ''
        if (contacts.length > 0) {
          const matched = contacts.find((c) => c.wa_id === from) || contacts[0]
          contactProfileName = matched?.profile?.name || ''
        }
        if (!contactProfileName) {
          contactProfileName = 'Contato ' + normalizedPhone
        }

        // 1. Dedupe / Buscar paciente existente
        let patient = null
        let isNewPatient = false
        try {
          // Tentar por telefone normalizado exato ou sem '+'
          const foundPatients = $app.findRecordsByFilter(
            'patients',
            'phone ~ "' + rawDigits + '" || phone ~ "' + normalizedPhone + '"',
            '-created',
            1,
            0,
          )
          if (foundPatients && foundPatients.length > 0) {
            patient = foundPatients[0]
          }
        } catch (_) {}

        const patientsCol = $app.findCollectionByNameOrId('patients')
        const jeCol = $app.findCollectionByNameOrId('journey_events')
        const autoLogsCol = $app.findCollectionByNameOrId('automation_logs')

        if (!patient) {
          // Criar paciente novo
          isNewPatient = true
          patient = new Record(patientsCol)
          patient.set('name', contactProfileName)
          patient.set('phone', normalizedPhone)
          patient.set('channel_origin', 'whatsapp')
          // REGRA: contato novo que manda mensagem pela primeira vez entra em "Primeiro Contato"
          patient.set('stage', 'primeiro_contato')
          patient.set('last_contact_at', new Date().toISOString())
          patient.set('score', 80)
          patient.set('notes', 'Contato criado automaticamente via mensagem WhatsApp inbound.')
          $app.save(patient)

          // Registrar evento na jornada: Contato Inicial
          try {
            const jeInit = new Record(jeCol)
            jeInit.set('patient_id', patient.id)
            jeInit.set('type', 'contato_inicial')
            jeInit.set('stage', 'primeiro_contato')
            jeInit.set('title', 'Primeiro Contato via WhatsApp')
            jeInit.set(
              'description',
              'Lead iniciou conversa pelo WhatsApp: "' +
                (textContent.length > 80 ? textContent.slice(0, 77) + '...' : textContent) +
                '"',
            )
            jeInit.set('is_automatic', true)
            $app.save(jeInit)
          } catch (_) {}

          // Registrar log de automação para o feed de automações do painel
          try {
            const autoLog = new Record(autoLogsCol)
            autoLog.set('patient_id', patient.id)
            autoLog.set('trigger', 'novo_contato_whatsapp')
            autoLog.set('action', 'mover_para_primeiro_contato')
            autoLog.set('status', 'sucesso')
            autoLog.set(
              'details',
              'Novo contato ' +
                contactProfileName +
                ' (' +
                normalizedPhone +
                ') inserido automaticamente em Primeiro Contato com origem WhatsApp.',
            )
            $app.save(autoLog)
          } catch (_) {}
        } else {
          // Paciente existente: verificar regras de movimentação automática de funil
          const currentStage = patient.getString('stage')
          patient.set('last_contact_at', new Date().toISOString())

          // REGRA: se o paciente estava em "Lead Frio" ou "Reativação" e responde, ele volta para "Primeiro Contato"
          if (currentStage === 'lead_frio' || currentStage === 'reativacao') {
            patient.set('stage', 'primeiro_contato')
            $app.save(patient)

            // Registrar evento na timeline
            try {
              const jeStage = new Record(jeCol)
              jeStage.set('patient_id', patient.id)
              jeStage.set('type', 'mudanca_estagio')
              jeStage.set('stage', 'primeiro_contato')
              jeStage.set('title', 'Retornou pelo WhatsApp')
              jeStage.set(
                'description',
                'Paciente respondeu via WhatsApp e foi automaticamente reativado de ' +
                  currentStage.replace(/_/g, ' ') +
                  ' para Primeiro Contato.',
              )
              jeStage.set('is_automatic', true)
              $app.save(jeStage)
            } catch (_) {}

            // Registrar log de automação para feed de automações
            try {
              const autoLog = new Record(autoLogsCol)
              autoLog.set('patient_id', patient.id)
              autoLog.set('trigger', 'retorno_paciente_whatsapp')
              autoLog.set('action', 'reativacao_para_primeiro_contato')
              autoLog.set('status', 'sucesso')
              autoLog.set(
                'details',
                'Paciente ' +
                  patient.getString('name') +
                  ' retornou pelo WhatsApp saindo de ' +
                  currentStage +
                  ' para Primeiro Contato.',
              )
              $app.save(autoLog)
            } catch (_) {}
          } else {
            $app.save(patient)
          }
        }

        // 2. Encontrar ou criar a conversa (conversations)
        let conv = null
        try {
          const convs = $app.findRecordsByFilter(
            'conversations',
            'contact_identifier ~ "' +
              rawDigits +
              '" || contact_identifier ~ "' +
              normalizedPhone +
              '" || patient_id = "' +
              patient.id +
              '"',
            '-last_message_at',
            1,
            0,
          )
          if (convs && convs.length > 0) {
            conv = convs[0]
          }
        } catch (_) {}

        const convCol = $app.findCollectionByNameOrId('conversations')
        if (!conv) {
          conv = new Record(convCol)
          conv.set('patient_id', patient.id)
          conv.set('channel', 'whatsapp')
          conv.set('contact_identifier', normalizedPhone)
          conv.set('status', 'aberta')
          conv.set('unread_count', 1)
          conv.set('last_message_preview', textContent)
          conv.set('last_message_at', new Date().toISOString())
          $app.save(conv)
        } else {
          const currentUnread = conv.getInt('unread_count') || 0
          conv.set('patient_id', patient.id)
          conv.set('unread_count', currentUnread + 1)
          conv.set('last_message_preview', textContent)
          conv.set('last_message_at', new Date().toISOString())
          conv.set('status', 'aberta')
          $app.save(conv)
        }

        // 3. Salvar mensagem recebida (messages)
        const msgsCol = $app.findCollectionByNameOrId('messages')
        const msg = new Record(msgsCol)
        msg.set('conversation_id', conv.id)
        msg.set('sender', 'inbound')
        msg.set('channel', 'whatsapp')
        msg.set('content', textContent)
        msg.set('is_automatic', false)
        $app.save(msg)

        // 4. Registrar evento na timeline caso não seja criação inicial redundante
        if (!isNewPatient) {
          try {
            const jeMsg = new Record(jeCol)
            jeMsg.set('patient_id', patient.id)
            jeMsg.set('type', 'mensagem')
            jeMsg.set('stage', patient.getString('stage'))
            jeMsg.set('title', 'Mensagem WhatsApp Recebida')
            jeMsg.set(
              'description',
              textContent.length > 80 ? textContent.slice(0, 77) + '...' : textContent,
            )
            jeMsg.set('is_automatic', false)
            $app.save(jeMsg)
          } catch (_) {}
        }
      }
    }
  }

  // Always respond 200 to Meta so it does not retry
  return e.json(200, { status: 'processed' })
})
