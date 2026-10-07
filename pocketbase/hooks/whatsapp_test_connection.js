routerAdd(
  'POST',
  '/backend/v1/whatsapp/test-connection',
  (e) => {
    const userId = e.auth?.id
    if (!userId) {
      return e.unauthorizedError('Autenticação necessária')
    }

    const body = e.requestInfo().body || {}
    const phoneNumberId = (body.phone_number_id || '').trim()
    const accessToken = (body.access_token || '').trim()
    const wabaId = (body.waba_id || '').trim()
    const verifyToken = (body.verify_token || '').trim()
    const shouldSave = !!body.save

    if (!phoneNumberId || !accessToken) {
      return e.badRequestError('Phone Number ID e Token de Acesso são obrigatórios para o teste')
    }

    // Call Meta Graph API v21.0
    const metaUrl =
      'https://graph.facebook.com/v21.0/' +
      phoneNumberId +
      '?fields=verified_name,display_phone_number,quality_rating,code_verification_status'

    let metaRes
    try {
      metaRes = $http.send({
        url: metaUrl,
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + accessToken,
        },
        timeout: 15,
      })
    } catch (err) {
      return e.json(502, {
        ok: false,
        error: 'Falha ao conectar aos servidores da Meta: ' + (err.message || String(err)),
      })
    }

    if (metaRes.statusCode < 200 || metaRes.statusCode >= 300) {
      const errBody = metaRes.json || {}
      const errMsg =
        errBody.error?.message || 'Erro retornado pela Meta (HTTP ' + metaRes.statusCode + ')'
      return e.json(400, {
        ok: false,
        error: errMsg,
        details: errBody.error || null,
      })
    }

    const metaData = metaRes.json || {}
    const verifiedName = metaData.verified_name || 'Nome não verificado'
    const displayPhoneNumber = metaData.display_phone_number || ''
    const qualityRating = metaData.quality_rating || 'UNKNOWN'

    // If requested or if valid, save/update in whatsapp_settings
    if (shouldSave) {
      try {
        const settingsCol = $app.findCollectionByNameOrId('whatsapp_settings')
        const existing = $app.findRecordsByFilter('whatsapp_settings', '', '-created', 1, 0)
        let record
        if (existing && existing.length > 0) {
          record = existing[0]
        } else {
          record = new Record(settingsCol)
        }

        record.set('phone_number_id', phoneNumberId)
        if (wabaId) record.set('waba_id', wabaId)
        record.set('access_token', accessToken)
        if (verifyToken) record.set('verify_token', verifyToken)
        record.set('is_active', true)
        record.set('verified_name', verifiedName)
        record.set('display_phone_number', displayPhoneNumber)
        record.set('quality_rating', qualityRating)
        record.set('last_tested_at', new Date().toISOString())
        record.set('last_error', '')
        $app.save(record)
      } catch (saveErr) {
        console.log('Error saving whatsapp_settings:', saveErr)
      }
    }

    return e.json(200, {
      ok: true,
      verified_name: verifiedName,
      display_phone_number: displayPhoneNumber,
      quality_rating: qualityRating,
      phone_number_id: phoneNumberId,
    })
  },
  $apis.requireAuth(),
)
