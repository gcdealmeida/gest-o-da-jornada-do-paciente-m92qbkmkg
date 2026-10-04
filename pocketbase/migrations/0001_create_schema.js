migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Add role field if missing
    try {
      if (!users.fields.getByName('role')) {
        users.fields.add(
          new SelectField({
            name: 'role',
            values: ['Gestor', 'Coordenador', 'Recepcionista'],
            maxSelect: 1,
          }),
        )
        app.save(users)
      }
    } catch (_) {}

    // 1. patients collection
    const patients = new Collection({
      name: 'patients',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'phone', type: 'text' },
        { name: 'email', type: 'text' },
        { name: 'instagram', type: 'text' },
        {
          name: 'channel_origin',
          type: 'select',
          values: ['whatsapp', 'instagram', 'email', 'outros'],
          maxSelect: 1,
        },
        {
          name: 'stage',
          type: 'select',
          values: [
            'primeiro_contato',
            'avaliacao',
            'fechamento_programa',
            'acompanhamento',
            'renovacao',
            'reativacao',
          ],
          maxSelect: 1,
        },
        {
          name: 'responsible_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        {
          name: 'tags',
          type: 'select',
          values: ['prioridade', 'lead_quente', 'retorno', 'pausa', 'vip'],
          maxSelect: 5,
        },
        { name: 'value_monthly', type: 'number' },
        { name: 'score', type: 'number' },
        { name: 'last_contact_at', type: 'date' },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_patients_stage ON patients (stage)',
        'CREATE INDEX idx_patients_phone ON patients (phone)',
        'CREATE INDEX idx_patients_responsible ON patients (responsible_id)',
        'CREATE INDEX idx_patients_last_contact ON patients (last_contact_at)',
      ],
    })
    app.save(patients)

    const patientsId = app.findCollectionByNameOrId('patients').id

    // 2. journey_events collection
    const journeyEvents = new Collection({
      name: 'journey_events',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        {
          name: 'patient_id',
          type: 'relation',
          collectionId: patientsId,
          required: true,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'type',
          type: 'select',
          values: [
            'contato_inicial',
            'mudanca_estagio',
            'automacao',
            'mensagem',
            'tarefa',
            'agendamento',
            'anotacao',
          ],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'stage',
          type: 'select',
          values: [
            'primeiro_contato',
            'avaliacao',
            'fechamento_programa',
            'acompanhamento',
            'renovacao',
            'reativacao',
          ],
          maxSelect: 1,
        },
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'responsible_id', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
        { name: 'is_automatic', type: 'bool' },
        { name: 'metadata', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_je_patient ON journey_events (patient_id)',
        'CREATE INDEX idx_je_type ON journey_events (type)',
        'CREATE INDEX idx_je_stage ON journey_events (stage)',
        'CREATE INDEX idx_je_created ON journey_events (created)',
      ],
    })
    app.save(journeyEvents)

    // 3. conversations collection
    const conversations = new Collection({
      name: 'conversations',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        { name: 'patient_id', type: 'relation', collectionId: patientsId, maxSelect: 1 },
        {
          name: 'channel',
          type: 'select',
          values: ['whatsapp', 'instagram', 'email', 'outros'],
          maxSelect: 1,
          required: true,
        },
        { name: 'contact_identifier', type: 'text', required: true },
        { name: 'last_message_preview', type: 'text' },
        { name: 'last_message_at', type: 'date' },
        { name: 'unread_count', type: 'number' },
        {
          name: 'status',
          type: 'select',
          values: ['aberta', 'fechada'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_conv_patient ON conversations (patient_id)',
        'CREATE INDEX idx_conv_contact ON conversations (contact_identifier)',
        'CREATE INDEX idx_conv_last_msg ON conversations (last_message_at)',
        'CREATE INDEX idx_conv_status ON conversations (status)',
      ],
    })
    app.save(conversations)

    const convId = app.findCollectionByNameOrId('conversations').id

    // 4. messages collection
    const messages = new Collection({
      name: 'messages',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        {
          name: 'conversation_id',
          type: 'relation',
          collectionId: convId,
          required: true,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'sender',
          type: 'select',
          values: ['inbound', 'outbound', 'system'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'channel',
          type: 'select',
          values: ['whatsapp', 'instagram', 'email', 'outros'],
          maxSelect: 1,
          required: true,
        },
        { name: 'content', type: 'text', required: true },
        { name: 'sent_by', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
        { name: 'is_automatic', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_msg_conv ON messages (conversation_id)',
        'CREATE INDEX idx_msg_created ON messages (created)',
      ],
    })
    app.save(messages)

    // 5. tasks collection
    const tasks = new Collection({
      name: 'tasks',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'patient_id', type: 'relation', collectionId: patientsId, maxSelect: 1 },
        { name: 'assigned_to', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
        { name: 'due_at', type: 'date' },
        {
          name: 'priority',
          type: 'select',
          values: ['alta', 'media', 'baixa'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          values: ['a_fazer', 'em_andamento', 'concluida'],
          maxSelect: 1,
        },
        { name: 'completed_at', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_tasks_patient ON tasks (patient_id)',
        'CREATE INDEX idx_tasks_assigned ON tasks (assigned_to)',
        'CREATE INDEX idx_tasks_due ON tasks (due_at)',
        'CREATE INDEX idx_tasks_status ON tasks (status)',
        'CREATE INDEX idx_tasks_priority ON tasks (priority)',
      ],
    })
    app.save(tasks)

    // 6. appointments collection
    const appointments = new Collection({
      name: 'appointments',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        { name: 'patient_id', type: 'relation', collectionId: patientsId, maxSelect: 1 },
        {
          name: 'type',
          type: 'select',
          values: ['avaliacao', 'consulta', 'retorno', 'reuniao'],
          maxSelect: 1,
          required: true,
        },
        { name: 'start_at', type: 'date', required: true },
        { name: 'end_at', type: 'date', required: true },
        { name: 'responsible_id', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
        {
          name: 'status',
          type: 'select',
          values: ['confirmado', 'pendente', 'concluido', 'cancelado'],
          maxSelect: 1,
        },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_app_patient ON appointments (patient_id)',
        'CREATE INDEX idx_app_start ON appointments (start_at)',
        'CREATE INDEX idx_app_responsible ON appointments (responsible_id)',
        'CREATE INDEX idx_app_status ON appointments (status)',
      ],
    })
    app.save(appointments)

    // 7. automations collection
    const automations = new Collection({
      name: 'automations',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        { name: 'name', type: 'text', required: true },
        {
          name: 'trigger_type',
          type: 'select',
          values: [
            'novo_contato',
            'mudanca_estagio',
            'inatividade',
            'consulta_agendada',
            'data_proxima',
          ],
          maxSelect: 1,
          required: true,
        },
        { name: 'trigger_config', type: 'json', required: true },
        {
          name: 'action_type',
          type: 'select',
          values: [
            'enviar_mensagem',
            'mover_funil',
            'criar_tarefa',
            'criar_lembrete',
            'notificar_membro',
          ],
          maxSelect: 1,
          required: true,
        },
        { name: 'action_config', type: 'json', required: true },
        { name: 'message_template', type: 'text' },
        { name: 'enabled', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_automations_name ON automations (name)'],
    })
    app.save(automations)

    const autoId = app.findCollectionByNameOrId('automations').id

    // 8. automation_logs collection
    const autoLogs = new Collection({
      name: 'automation_logs',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        { name: 'automation_id', type: 'relation', collectionId: autoId, maxSelect: 1 },
        { name: 'patient_id', type: 'relation', collectionId: patientsId, maxSelect: 1 },
        { name: 'trigger', type: 'text', required: true },
        { name: 'action', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          values: ['sucesso', 'falha'],
          maxSelect: 1,
        },
        { name: 'details', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_autologs_auto ON automation_logs (automation_id)',
        'CREATE INDEX idx_autologs_patient ON automation_logs (patient_id)',
        'CREATE INDEX idx_autologs_created ON automation_logs (created)',
      ],
    })
    app.save(autoLogs)
  },
  (app) => {
    const toDelete = [
      'automation_logs',
      'automations',
      'appointments',
      'tasks',
      'messages',
      'conversations',
      'journey_events',
      'patients',
    ]
    for (const name of toDelete) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
