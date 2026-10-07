routerAdd('GET', '/backend/v1/whatsapp/webhook', (e) => {
  // Meta Webhook Verification Request
  // Parameters: hub.mode, hub.verify_token, hub.challenge
  const query = e.requestInfo().query || {}
  const mode = query['hub.mode'] || ''
  const verifyToken = query['hub.verify_token'] || ''
  const challenge = query['hub.challenge'] || ''

  if (mode !== 'subscribe') {
    return e.string(400, 'Invalid mode')
  }

  // Compare with configured verify_token in whatsapp_settings
  let configuredToken = ''
  try {
    const records = $app.findRecordsByFilter(
      'whatsapp_settings',
      'is_active = true',
      '-created',
      1,
      0,
    )
    if (records && records.length > 0) {
      configuredToken = records[0].getString('verify_token')
    }
    if (!configuredToken) {
      // Check any saved record even if not yet active
      const allRecords = $app.findRecordsByFilter('whatsapp_settings', '', '-created', 1, 0)
      if (allRecords && allRecords.length > 0) {
        configuredToken = allRecords[0].getString('verify_token')
      }
    }
  } catch (_) {}

  if (!configuredToken) {
    // Fallback default token if user hasn't saved yet
    configuredToken = 'clinica_soul_token_2025'
  }

  if (verifyToken === configuredToken) {
    return e.string(200, challenge)
  }

  return e.string(403, 'Forbidden: verify_token mismatch')
})
