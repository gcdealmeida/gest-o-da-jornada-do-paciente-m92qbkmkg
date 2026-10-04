routerAdd(
  'POST',
  '/backend/v1/agent-chat',
  (e) => {
    const userId = e.auth?.id
    if (!userId) {
      return e.unauthorizedError('Autenticação necessária')
    }

    const body = e.requestInfo().body || {}
    const message = (body.message || '').trim()
    if (!message) {
      return e.badRequestError('Mensagem é obrigatória')
    }

    try {
      const conv = $ai.agent('patient-journey-assistant').getOrCreateConversation({
        user_id: userId,
        id: body.conversation_id || null,
        title: message.slice(0, 30),
      })

      const stream = body.stream !== false // default to stream

      if (stream) {
        const iter = $ai.agent('patient-journey-assistant').chat({
          user_id: userId,
          conversation_id: conv.id,
          message: message,
          stream: true,
        })

        e.response.header().set('Content-Type', 'text/event-stream')
        e.response.header().set('Cache-Control', 'no-cache')
        e.response.header().set('X-Conversation-Id', conv.id)
        return $response.stream(e, iter)
      } else {
        const result = $ai.agent('patient-journey-assistant').chat({
          user_id: userId,
          conversation_id: conv.id,
          message: message,
        })

        return e.json(200, {
          conversation_id: result.conversation_id,
          content: result.content,
          citations: result.citations,
          message_id: result.message_id,
        })
      }
    } catch (err) {
      if (err instanceof SkipAiConfigError) {
        return e.json(503, { error: 'Serviço de IA temporariamente indisponível' })
      }
      if (err instanceof SkipAiAgentsError) {
        const status = err.status || 500
        return e.json(status, {
          error: status >= 500 ? 'Falha ao processar mensagem do assistente' : err.message,
        })
      }
      if (err instanceof SkipAiError) {
        const status = err.status || 502
        return e.json(status, {
          error: status >= 500 ? 'IA temporariamente indisponível' : err.message,
        })
      }
      throw err
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/agent-chats',
  (e) => {
    const userId = e.auth?.id
    if (!userId) {
      return e.unauthorizedError('Autenticação necessária')
    }

    try {
      const limit = parseInt(e.requestInfo().query?.limit || '20', 10) || 20
      const convs = $ai.agent('patient-journey-assistant').listConversations({
        user_id: userId,
        limit: limit,
      })
      return e.json(200, convs)
    } catch (err) {
      return e.json(200, { items: [] })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/agent-chats/{conversationId}/messages',
  (e) => {
    const userId = e.auth?.id
    if (!userId) {
      return e.unauthorizedError('Autenticação necessária')
    }

    const convId = e.request.pathValue('conversationId')
    try {
      const msgs = $ai.agent('patient-journey-assistant').listMessages({
        conversation_id: convId,
        user_id: userId,
      })
      return e.json(200, msgs)
    } catch (err) {
      if (err instanceof SkipAiAgentsError) {
        const status = err.status || 500
        return e.json(status, { error: status >= 500 ? 'Falha ao buscar mensagens' : err.message })
      }
      throw err
    }
  },
  $apis.requireAuth(),
)
