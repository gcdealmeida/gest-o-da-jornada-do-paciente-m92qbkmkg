routerAdd(
  'GET',
  '/backend/v1/whatsapp/status',
  (e) => {
    const userId = e.auth?.id
    if (!userId) {
      return e.unauthorizedError('Autenticação necessária')
    }

    try {
      const records = $app.findRecordsByFilter('whatsapp_settings', '', '-created', 1, 0)
      if (!records || records.length === 0) {
        return e.json(200, {
          is_connected: false,
          mode: 'demo',
          settings: null,
        })
      }

      const rec = records[0]
      const isActive = rec.getBool('is_active')

      // Obfuscate token for security
      const token = rec.getString('access_token') || ''
      const maskedToken =
        token.length > 8 ? token.slice(0, 4) + '...' + token.slice(-4) : token ? '***' : ''

      return e.json(200, {
        is_connected: isActive,
        mode: isActive ? 'connected' : 'demo',
        settings: {
          id: rec.id,
          phone_number_id: rec.getString('phone_number_id'),
          waba_id: rec.getString('waba_id'),
          verify_token: rec.getString('verify_token'),
          masked_token: maskedToken,
          verified_name: rec.getString('verified_name'),
          display_phone_number: rec.getString('display_phone_number'),
          quality_rating: rec.getString('quality_rating'),
          last_tested_at: rec.getString('last_tested_at'),
          last_error: rec.getString('last_error'),
          is_active: isActive,
        },
      })
    } catch (err) {
      return e.json(200, {
        is_connected: false,
        mode: 'demo',
        settings: null,
      })
    }
  },
  $apis.requireAuth(),
)
