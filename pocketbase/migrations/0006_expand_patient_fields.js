migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('patients')

    const newFields = [
      { name: 'cpf', type: 'text' },
      { name: 'birth_date', type: 'date' },
      { name: 'gender', type: 'text' },
      { name: 'reason_for_visit', type: 'text' },
      { name: 'has_pain', type: 'bool' },
      { name: 'pain_location', type: 'text' },
      { name: 'practices_physical_activity', type: 'bool' },
      { name: 'physical_activities', type: 'text' },
      { name: 'activity_frequency', type: 'text' },
      { name: 'activity_duration', type: 'text' },
      { name: 'diet_control', type: 'text' },
      { name: 'street', type: 'text' },
      { name: 'address_number', type: 'text' },
      { name: 'complement', type: 'text' },
      { name: 'neighborhood', type: 'text' },
      { name: 'city', type: 'text' },
      { name: 'state', type: 'text' },
      { name: 'postal_code', type: 'text' },
      { name: 'landmark', type: 'text' },
      { name: 'referral_source', type: 'text' },
      { name: 'referred_by', type: 'text' },
    ]

    for (const f of newFields) {
      if (!col.fields.getByName(f.name)) {
        if (f.type === 'text') {
          col.fields.add(new TextField({ name: f.name }))
        } else if (f.type === 'date') {
          col.fields.add(new DateField({ name: f.name }))
        } else if (f.type === 'bool') {
          col.fields.add(new BoolField({ name: f.name, required: false }))
        }
      }
    }

    // Add index on cpf for fast lookup/deduplication
    try {
      col.addIndex('idx_patients_cpf', false, 'cpf', '')
    } catch (_) {}

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('patients')
    const fieldNames = [
      'cpf',
      'birth_date',
      'gender',
      'reason_for_visit',
      'has_pain',
      'pain_location',
      'practices_physical_activity',
      'physical_activities',
      'activity_frequency',
      'activity_duration',
      'diet_control',
      'street',
      'address_number',
      'complement',
      'neighborhood',
      'city',
      'state',
      'postal_code',
      'landmark',
      'referral_source',
      'referred_by',
    ]

    try {
      col.removeIndex('idx_patients_cpf')
    } catch (_) {}

    for (const name of fieldNames) {
      try {
        col.fields.removeByName(name)
      } catch (_) {}
    }

    app.save(col)
  },
)
