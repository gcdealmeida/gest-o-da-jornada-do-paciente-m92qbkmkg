routerAdd(
  'POST',
  '/backend/v1/whatsapp/disconnect',
  (e) => {
    const userId = e.auth?.id
    if (!userId) {
      return e.unauthorizedError('Autenticação necessária')
    }

    try {
      const records = $app.findRecordsByFilter('whatsapp_settings', '', '-created', 10, 0)
      for (const rec of records) {
        rec.set('is_active', false)
        $app.save(rec)
      }
      return e.json(200, { ok: true, mode: 'demo' })
    } catch (err) {
      return e.badRequestError('Erro ao desconectar: ' + (err.message || String(err)))
    }
  },
  $apis.requireAuth(),
)
