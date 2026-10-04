migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const patientsCol = app.findCollectionByNameOrId('patients')
    const journeyCol = app.findCollectionByNameOrId('journey_events')
    const convsCol = app.findCollectionByNameOrId('conversations')
    const msgsCol = app.findCollectionByNameOrId('messages')
    const tasksCol = app.findCollectionByNameOrId('tasks')
    const appsCol = app.findCollectionByNameOrId('appointments')
    const autosCol = app.findCollectionByNameOrId('automations')
    const logsCol = app.findCollectionByNameOrId('automation_logs')

    // 1. Seed users
    const teamUsers = [
      { email: 'guivemax@hotmail.com', name: 'Dr. Guilherme Vasconcelos', role: 'Gestor' },
      { email: 'maria@clinica.com.br', name: 'Maria Santos', role: 'Coordenador' },
      { email: 'joao@clinica.com.br', name: 'João Oliveira', role: 'Recepcionista' },
    ]

    const userRecords = {}

    for (const u of teamUsers) {
      let rec
      try {
        rec = app.findAuthRecordByEmail('_pb_users_auth_', u.email)
      } catch (_) {
        rec = new Record(users)
        rec.setEmail(u.email)
        rec.setPassword('Skip@Pass')
        rec.setVerified(true)
        rec.set('name', u.name)
        rec.set('role', u.role)
        app.save(rec)
      }
      userRecords[u.email] = rec.id
    }

    const adminId = userRecords['guivemax@hotmail.com']
    const mariaId = userRecords['maria@clinica.com.br']
    const joaoId = userRecords['joao@clinica.com.br']

    // 2. Seed automations (5 templates)
    const defaultAutomations = [
      {
        name: 'Follow-up de Primeiro Contato',
        trigger_type: 'novo_contato',
        trigger_config: { stage: 'primeiro_contato', wait_minutes: 20 },
        action_type: 'enviar_mensagem',
        action_config: { channel: 'whatsapp' },
        message_template:
          'Olá, {paciente.nome}! Vimos que você demonstrou interesse em cuidar da sua saúde conosco. Como podemos te ajudar hoje?',
        enabled: true,
      },
      {
        name: 'Movimentação Automática no Funil',
        trigger_type: 'mudanca_estagio',
        trigger_config: { from_stage: 'avaliacao', outcome: 'positivo' },
        action_type: 'mover_funil',
        action_config: { to_stage: 'fechamento_programa' },
        message_template:
          'Parabéns pela decisão de iniciar o tratamento, {paciente.nome}! Estamos preparando sua proposta personalizada.',
        enabled: true,
      },
      {
        name: 'Lembrete de Consulta',
        trigger_type: 'consulta_agendada',
        trigger_config: { notice_hours: [24, 2] },
        action_type: 'enviar_mensagem',
        action_config: { channel: 'whatsapp' },
        message_template:
          'Olá {paciente.nome}, confirmamos seu horário na clínica amanhã. Por favor, responda 1 para confirmar.',
        enabled: true,
      },
      {
        name: 'Retorno Automático de Inatividade',
        trigger_type: 'inatividade',
        trigger_config: { stage: 'acompanhamento', days_inactive: 7 },
        action_type: 'enviar_mensagem',
        action_config: { channel: 'whatsapp' },
        message_template:
          'Olá {paciente.nome}, como você está se sentindo após o último procedimento? Sentimos sua falta para a avaliação de progresso!',
        enabled: true,
      },
      {
        name: 'Reativação de Renovação',
        trigger_type: 'data_proxima',
        trigger_config: { stage: 'renovacao', days_without_confirmation: 5 },
        action_type: 'enviar_mensagem',
        action_config: { channel: 'whatsapp' },
        message_template:
          'Oi {paciente.nome}! Seu ciclo de cuidado está se encerrando em breve. Que tal mantermos os resultados alcançados com condições especiais?',
        enabled: true,
      },
    ]

    const autoIds = {}
    for (const a of defaultAutomations) {
      let rec
      try {
        rec = app.findFirstRecordByData('automations', 'name', a.name)
      } catch (_) {
        rec = new Record(autosCol)
        rec.set('name', a.name)
        rec.set('trigger_type', a.trigger_type)
        rec.set('trigger_config', a.trigger_config)
        rec.set('action_type', a.action_type)
        rec.set('action_config', a.action_config)
        rec.set('message_template', a.message_template)
        rec.set('enabled', a.enabled)
        app.save(rec)
      }
      autoIds[a.name] = rec.id
    }

    // 3. Seed patients across the 6 stages
    const samplePatients = [
      {
        name: 'Camila Rodrigues',
        phone: '+55 11 98844-1234',
        email: 'camila.rodrigues@email.com.br',
        instagram: '@camilarodrigues',
        channel_origin: 'whatsapp',
        stage: 'primeiro_contato',
        responsible_id: joaoId,
        tags: ['lead_quente', 'prioridade'],
        value_monthly: 0,
        score: 85,
        last_contact_at: '2025-05-10 14:20:00.000Z',
        notes:
          'Entrou em contato pelo anúncio do Instagram querendo saber valores de protocolo integrativo.',
      },
      {
        name: 'Rodrigo Albuquerque',
        phone: '+55 11 97722-5566',
        email: 'rodrigo.albuquerque@gmail.com',
        instagram: '@rodrigoalbuq',
        channel_origin: 'instagram',
        stage: 'primeiro_contato',
        responsible_id: joaoId,
        tags: ['lead_quente'],
        value_monthly: 0,
        score: 72,
        last_contact_at: '2025-05-11 09:15:00.000Z',
        notes:
          'Pediu informações sobre disponibilidade de horários para avaliação na próxima semana.',
      },
      {
        name: 'Mariana Pires',
        phone: '+55 21 99887-4321',
        email: 'mariana.pires@outlook.com',
        instagram: '@maripires',
        channel_origin: 'whatsapp',
        stage: 'avaliacao',
        responsible_id: mariaId,
        tags: ['prioridade', 'vip'],
        value_monthly: 0,
        score: 92,
        last_contact_at: '2025-05-12 11:30:00.000Z',
        notes:
          'Avaliação presencial confirmada. Queixa principal: dores posturais e fadiga crônica.',
      },
      {
        name: 'Lucas Mendonça',
        phone: '+55 11 96432-8899',
        email: 'lucas.mendonca@empresa.com.br',
        instagram: '@lucasmend',
        channel_origin: 'whatsapp',
        stage: 'fechamento_programa',
        responsible_id: adminId,
        tags: ['vip', 'lead_quente'],
        value_monthly: 1450,
        score: 95,
        last_contact_at: '2025-05-12 16:45:00.000Z',
        notes:
          'Proposta do plano Semestral Performance enviada. Aguardando apenas assinatura digital do contrato.',
      },
      {
        name: 'Beatriz Fonseca',
        phone: '+55 31 99123-4567',
        email: 'beatriz.fonseca@yahoo.com.br',
        instagram: '@biafonseca',
        channel_origin: 'whatsapp',
        stage: 'acompanhamento',
        responsible_id: mariaId,
        tags: ['retorno'],
        value_monthly: 1200,
        score: 88,
        last_contact_at: '2025-05-08 10:00:00.000Z',
        notes: 'Mês 3 do protocolo de reabilitação. Relata 80% de melhora nos sintomas.',
      },
      {
        name: 'Carlos Eduardo Lima',
        phone: '+55 11 98112-7890',
        email: 'cadu.lima@corporativo.com.br',
        instagram: '@cadulima',
        channel_origin: 'email',
        stage: 'renovacao',
        responsible_id: adminId,
        tags: ['vip', 'retorno'],
        value_monthly: 1800,
        score: 90,
        last_contact_at: '2025-05-05 15:10:00.000Z',
        notes:
          'Ciclo anual vencendo em 15 dias. Excelente adesão, perfil favorável para upgrade de plano.',
      },
      {
        name: 'Fernanda Nogueira',
        phone: '+55 41 98455-6677',
        email: 'fernanda.nog@terra.com.br',
        instagram: '@fenogueira',
        channel_origin: 'whatsapp',
        stage: 'reativacao',
        responsible_id: joaoId,
        tags: ['pausa', 'retorno'],
        value_monthly: 950,
        score: 65,
        last_contact_at: '2025-04-15 08:30:00.000Z',
        notes:
          'Interrompeu sessões há 40 dias por motivo de viagem a trabalho. Demonstrando interesse em retomar.',
      },
    ]

    const patientMap = {}

    for (const p of samplePatients) {
      let rec
      try {
        rec = app.findFirstRecordByData('patients', 'name', p.name)
      } catch (_) {
        rec = new Record(patientsCol)
        rec.set('name', p.name)
        rec.set('phone', p.phone)
        rec.set('email', p.email)
        rec.set('instagram', p.instagram)
        rec.set('channel_origin', p.channel_origin)
        rec.set('stage', p.stage)
        rec.set('responsible_id', p.responsible_id)
        rec.set('tags', p.tags)
        rec.set('value_monthly', p.value_monthly)
        rec.set('score', p.score)
        rec.set('last_contact_at', p.last_contact_at)
        rec.set('notes', p.notes)
        app.save(rec)
      }
      patientMap[p.name] = rec
    }

    // 4. Seed conversations & messages
    const conversationsData = [
      {
        patientName: 'Camila Rodrigues',
        channel: 'whatsapp',
        contact: '+55 11 98844-1234',
        preview: 'Qual o valor do programa inicial de avaliação?',
        unread: 1,
        messages: [
          {
            sender: 'inbound',
            content: 'Olá! Gostaria de entender como funciona a avaliação inicial de vocês.',
          },
          {
            sender: 'outbound',
            is_auto: true,
            content:
              'Olá, Camila! Ficamos muito felizes pelo seu contato. Aqui oferecemos uma abordagem 360 integrada.',
          },
          { sender: 'inbound', content: 'Qual o valor do programa inicial de avaliação?' },
        ],
      },
      {
        patientName: 'Mariana Pires',
        channel: 'whatsapp',
        contact: '+55 21 99887-4321',
        preview: 'Perfeito, estarei aí às 14h.',
        unread: 0,
        messages: [
          {
            sender: 'inbound',
            content: 'Boa tarde! Preciso de uma consulta para dor crônica nas costas.',
          },
          {
            sender: 'outbound',
            content:
              'Olá Mariana! Conseguimos agendar sua avaliação para esta quinta às 14h com a Dra. Maria?',
          },
          { sender: 'inbound', content: 'Perfeito, estarei aí às 14h.' },
        ],
      },
      {
        patientName: 'Lucas Mendonça',
        channel: 'whatsapp',
        contact: '+55 11 96432-8899',
        preview: 'Recebi a proposta, vou assinar hoje à noite!',
        unread: 0,
        messages: [
          {
            sender: 'outbound',
            content:
              'Olá Lucas! Conforme conversamos na avaliação, segue o link da proposta do plano semestral.',
          },
          { sender: 'inbound', content: 'Recebi a proposta, vou assinar hoje à noite!' },
          {
            sender: 'outbound',
            content:
              'Excelente! Assim que assinar já liberamos seu acesso ao app de acompanhamento.',
          },
        ],
      },
      {
        patientName: 'Beatriz Fonseca',
        channel: 'whatsapp',
        contact: '+55 31 99123-4567',
        preview: 'Obrigada pelo cuidado de sempre!',
        unread: 0,
        messages: [
          { sender: 'inbound', content: 'Oi equipe! Estou sentindo muito menos dor essa semana.' },
          {
            sender: 'outbound',
            content:
              'Que notícia maravilhosa, Beatriz! Mantendo as orientações da sessão de terça?',
          },
          { sender: 'inbound', content: 'Sim, tudo certinho! Obrigada pelo cuidado de sempre!' },
        ],
      },
      {
        patientName: 'Carlos Eduardo Lima',
        channel: 'email',
        contact: 'cadu.lima@corporativo.com.br',
        preview: 'Gostaria de agendar uma reunião para renovação.',
        unread: 1,
        messages: [
          {
            sender: 'outbound',
            content: 'Olá Carlos, seu plano anual está prestes a renovar com condições exclusivas.',
          },
          { sender: 'inbound', content: 'Gostaria de agendar uma reunião para renovação.' },
        ],
      },
      {
        patientName: 'Fernanda Nogueira',
        channel: 'whatsapp',
        contact: '+55 41 98455-6677',
        preview: 'Oi! Voltei de viagem, podemos retomar?',
        unread: 1,
        messages: [
          {
            sender: 'outbound',
            is_auto: true,
            content:
              'Olá Fernanda, como você está? Sentimos sua falta na clínica para dar sequência ao seu protocolo!',
          },
          { sender: 'inbound', content: 'Oi! Voltei de viagem, podemos retomar?' },
        ],
      },
    ]

    for (const c of conversationsData) {
      const patient = patientMap[c.patientName]
      if (!patient) continue

      let convRec
      try {
        convRec = app.findFirstRecordByData('conversations', 'contact_identifier', c.contact)
      } catch (_) {
        convRec = new Record(convsCol)
        convRec.set('patient_id', patient.id)
        convRec.set('channel', c.channel)
        convRec.set('contact_identifier', c.contact)
        convRec.set('last_message_preview', c.preview)
        convRec.set('last_message_at', new Date().toISOString())
        convRec.set('unread_count', c.unread)
        convRec.set('status', 'aberta')
        app.save(convRec)

        // seed messages
        for (const m of c.messages) {
          const msgRec = new Record(msgsCol)
          msgRec.set('conversation_id', convRec.id)
          msgRec.set('sender', m.sender)
          msgRec.set('channel', c.channel)
          msgRec.set('content', m.content)
          msgRec.set(
            'sent_by',
            m.sender === 'outbound' ? patient.get('responsible_id') || adminId : null,
          )
          msgRec.set('is_automatic', !!m.is_auto)
          app.save(msgRec)
        }
      }
    }

    // 5. Seed journey events for each patient
    const sampleEvents = [
      {
        patientName: 'Camila Rodrigues',
        events: [
          {
            type: 'contato_inicial',
            stage: 'primeiro_contato',
            title: 'Primeiro Contato Recebido',
            desc: 'Paciente enviou mensagem via WhatsApp através de campanha de tráfego pago.',
            is_auto: true,
          },
          {
            type: 'automacao',
            stage: 'primeiro_contato',
            title: 'Automação Disparada',
            desc: 'Mensagem de boas-vindas e qualificação automática enviada.',
            is_auto: true,
          },
        ],
      },
      {
        patientName: 'Mariana Pires',
        events: [
          {
            type: 'contato_inicial',
            stage: 'primeiro_contato',
            title: 'Primeiro Contato Recebido',
            desc: 'Origem WhatsApp orgânico por indicação.',
            is_auto: false,
          },
          {
            type: 'mudanca_estagio',
            stage: 'avaliacao',
            title: 'Avançou para Avaliação',
            desc: 'Horário de avaliação clínica agendado com sucesso.',
            is_auto: false,
          },
          {
            type: 'agendamento',
            stage: 'avaliacao',
            title: 'Avaliação Inicial Agendada',
            desc: 'Consulta agendada para quinta-feira com Dra. Maria Santos.',
            is_auto: false,
          },
        ],
      },
      {
        patientName: 'Lucas Mendonça',
        events: [
          {
            type: 'contato_inicial',
            stage: 'primeiro_contato',
            title: 'Primeiro Contato',
            desc: 'Contato via WhatsApp interessado em protocolo esportivo.',
            is_auto: false,
          },
          {
            type: 'mudanca_estagio',
            stage: 'avaliacao',
            title: 'Avaliação Concluída',
            desc: 'Bioimpedância e anamnese detalhada realizadas.',
            is_auto: false,
          },
          {
            type: 'mudanca_estagio',
            stage: 'fechamento_programa',
            title: 'Avançou para Fechamento de Programa',
            desc: 'Proposta de R$ 1.450/mês apresentada pelo Dr. Guilherme.',
            is_auto: false,
          },
        ],
      },
      {
        patientName: 'Beatriz Fonseca',
        events: [
          {
            type: 'contato_inicial',
            stage: 'primeiro_contato',
            title: 'Primeiro Contato',
            desc: 'Contato inicial telefônico.',
            is_auto: false,
          },
          {
            type: 'mudanca_estagio',
            stage: 'fechamento_programa',
            title: 'Contrato Assinado',
            desc: 'Plano de cuidado trimestral fechado com sucesso.',
            is_auto: false,
          },
          {
            type: 'mudanca_estagio',
            stage: 'acompanhamento',
            title: 'Início do Acompanhamento',
            desc: 'Sessão 1 de reabilitação iniciada.',
            is_auto: false,
          },
          {
            type: 'anotacao',
            stage: 'acompanhamento',
            title: 'Evolução de Sintomas',
            desc: 'Paciente relata excelente resposta ao tratamento, diminuição de analgésicos.',
            is_auto: false,
          },
        ],
      },
      {
        patientName: 'Carlos Eduardo Lima',
        events: [
          {
            type: 'contato_inicial',
            stage: 'primeiro_contato',
            title: 'Primeiro Contato',
            desc: 'Entrada via e-mail corporativo.',
            is_auto: false,
          },
          {
            type: 'mudanca_estagio',
            stage: 'acompanhamento',
            title: 'Acompanhamento Anual',
            desc: 'Completou 11 meses de cuidado contínuo.',
            is_auto: false,
          },
          {
            type: 'mudanca_estagio',
            stage: 'renovacao',
            title: 'Entrou em Renovação',
            desc: 'Gatilho de 30 dias para expiração do contrato acionado.',
            is_auto: true,
          },
        ],
      },
      {
        patientName: 'Fernanda Nogueira',
        events: [
          {
            type: 'contato_inicial',
            stage: 'primeiro_contato',
            title: 'Primeiro Contato',
            desc: 'Contato via WhatsApp.',
            is_auto: false,
          },
          {
            type: 'mudanca_estagio',
            stage: 'reativacao',
            title: 'Movida para Reativação',
            desc: 'Sem comparecimento há 40 dias. Gatilho de inatividade acionado.',
            is_auto: true,
          },
          {
            type: 'automacao',
            stage: 'reativacao',
            title: 'Mensagem de Resgate Enviada',
            desc: 'Follow-up carinhoso disparado via WhatsApp demo.',
            is_auto: true,
          },
        ],
      },
    ]

    for (const item of sampleEvents) {
      const patient = patientMap[item.patientName]
      if (!patient) continue

      for (const ev of item.events) {
        try {
          const jeRec = new Record(journeyCol)
          jeRec.set('patient_id', patient.id)
          jeRec.set('type', ev.type)
          jeRec.set('stage', ev.stage)
          jeRec.set('title', ev.title)
          jeRec.set('description', ev.desc)
          jeRec.set('responsible_id', patient.get('responsible_id') || adminId)
          jeRec.set('is_automatic', ev.is_auto)
          app.save(jeRec)
        } catch (_) {}
      }
    }

    // 6. Seed tasks
    const sampleTasks = [
      {
        title: 'Ligar para confirmar presença na Avaliação',
        description: 'Ligar 2h antes para confirmar deslocamento e estacionamento.',
        patientName: 'Mariana Pires',
        assigned: mariaId,
        due_at: '2025-05-15 12:00:00.000Z',
        priority: 'alta',
        status: 'a_fazer',
      },
      {
        title: 'Enviar link de assinatura da proposta semestral',
        description: 'Conferir se o CPF e dados cadastrais estão completos no contrato.',
        patientName: 'Lucas Mendonça',
        assigned: adminId,
        due_at: '2025-05-15 18:00:00.000Z',
        priority: 'alta',
        status: 'em_andamento',
      },
      {
        title: 'Follow-up de mensagem de reativação',
        description: 'Checar se a paciente respondeu à mensagem de retorno de viagem.',
        patientName: 'Fernanda Nogueira',
        assigned: joaoId,
        due_at: '2025-05-14 17:00:00.000Z', // overdue sample
        priority: 'media',
        status: 'a_fazer',
      },
      {
        title: 'Preparar laudo de evolução trimestral',
        description: 'Imprimir gráficos de evolução para entregar na consulta presencial.',
        patientName: 'Beatriz Fonseca',
        assigned: mariaId,
        due_at: '2025-05-16 10:00:00.000Z',
        priority: 'media',
        status: 'a_fazer',
      },
      {
        title: 'Reunião de alinhamento da proposta de renovação',
        description: 'Apresentar condições exclusivas com 10% de desconto na anuidade.',
        patientName: 'Carlos Eduardo Lima',
        assigned: adminId,
        due_at: '2025-05-13 14:00:00.000Z', // overdue sample
        priority: 'baixa',
        status: 'a_fazer',
      },
    ]

    for (const t of sampleTasks) {
      const patient = patientMap[t.patientName]
      try {
        const taskRec = new Record(tasksCol)
        taskRec.set('title', t.title)
        taskRec.set('description', t.description)
        taskRec.set('patient_id', patient ? patient.id : null)
        taskRec.set('assigned_to', t.assigned)
        taskRec.set('due_at', t.due_at)
        taskRec.set('priority', t.priority)
        taskRec.set('status', t.status)
        app.save(taskRec)
      } catch (_) {}
    }

    // 7. Seed appointments
    const todayStr = new Date().toISOString().split('T')[0]
    const sampleAppointments = [
      {
        patientName: 'Mariana Pires',
        type: 'avaliacao',
        start_at: `${todayStr} 14:00:00.000Z`,
        end_at: `${todayStr} 15:00:00.000Z`,
        responsible: mariaId,
        status: 'confirmado',
        notes: 'Primeira avaliação integrativa com foco em dor crônica.',
      },
      {
        patientName: 'Beatriz Fonseca',
        type: 'retorno',
        start_at: `${todayStr} 16:30:00.000Z`,
        end_at: `${todayStr} 17:15:00.000Z`,
        responsible: mariaId,
        status: 'pendente',
        notes: 'Sessão 6 do protocolo de acompanhamento.',
      },
      {
        patientName: 'Lucas Mendonça',
        type: 'reuniao',
        start_at: `${todayStr} 18:00:00.000Z`,
        end_at: `${todayStr} 18:30:00.000Z`,
        responsible: adminId,
        status: 'confirmado',
        notes: 'Alinhamento dos objetivos do plano semestral.',
      },
      {
        patientName: 'Carlos Eduardo Lima',
        type: 'consulta',
        start_at: '2025-05-18 10:00:00.000Z',
        end_at: '2025-05-18 11:00:00.000Z',
        responsible: adminId,
        status: 'confirmado',
        notes: 'Consulta de revisão anual para renovação do programa.',
      },
    ]

    for (const ap of sampleAppointments) {
      const patient = patientMap[ap.patientName]
      try {
        const apRec = new Record(appsCol)
        apRec.set('patient_id', patient ? patient.id : null)
        apRec.set('type', ap.type)
        apRec.set('start_at', ap.start_at)
        apRec.set('end_at', ap.end_at)
        apRec.set('responsible_id', ap.responsible)
        apRec.set('status', ap.status)
        apRec.set('notes', ap.notes)
        app.save(apRec)
      } catch (_) {}
    }

    // 8. Seed automation logs
    const sampleLogs = [
      {
        autoName: 'Follow-up de Primeiro Contato',
        patientName: 'Camila Rodrigues',
        trigger: 'novo_contato',
        action: 'enviar_mensagem',
        status: 'sucesso',
        details: 'Mensagem demo enviada para Camila Rodrigues (+55 11 98844-1234)',
      },
      {
        autoName: 'Retorno Automático de Inatividade',
        patientName: 'Fernanda Nogueira',
        trigger: 'inatividade',
        action: 'enviar_mensagem',
        status: 'sucesso',
        details: 'Mensagem de retorno enviada após 40 dias de inatividade',
      },
      {
        autoName: 'Lembrete de Consulta',
        patientName: 'Mariana Pires',
        trigger: 'consulta_agendada',
        action: 'enviar_mensagem',
        status: 'sucesso',
        details: 'Lembrete de 24h enviado com sucesso via WhatsApp demo',
      },
    ]

    for (const l of sampleLogs) {
      const patient = patientMap[l.patientName]
      const autoId = autoIds[l.autoName]
      try {
        const logRec = new Record(logsCol)
        logRec.set('automation_id', autoId || null)
        logRec.set('patient_id', patient ? patient.id : null)
        logRec.set('trigger', l.trigger)
        logRec.set('action', l.action)
        logRec.set('status', l.status)
        logRec.set('details', l.details)
        app.save(logRec)
      } catch (_) {}
    }
  },
  (app) => {
    // down migration
  },
)
