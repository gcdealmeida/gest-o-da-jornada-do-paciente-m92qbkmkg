migrate(
  (app) => {
    // Criação da coleção de configurações de integrações (whatsapp_settings)
    // Permite guardar as credenciais de forma restrita a usuários autenticados
    const collection = new Collection({
      name: 'whatsapp_settings',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        { name: 'phone_number_id', type: 'text', required: true },
        { name: 'waba_id', type: 'text' },
        { name: 'access_token', type: 'text', required: true },
        { name: 'verify_token', type: 'text', required: true },
        { name: 'is_active', type: 'bool' },
        { name: 'verified_name', type: 'text' },
        { name: 'display_phone_number', type: 'text' },
        { name: 'quality_rating', type: 'text' },
        { name: 'last_tested_at', type: 'date' },
        { name: 'last_error', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_wa_is_active ON whatsapp_settings (is_active)'],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('whatsapp_settings')
      app.delete(col)
    } catch (_) {}
  },
)
