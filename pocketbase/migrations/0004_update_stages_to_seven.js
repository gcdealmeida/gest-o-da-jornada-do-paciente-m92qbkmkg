migrate(
  (app) => {
    // 1. Atualizar campos select de estágio em 'patients' e 'journey_events'
    const stageValues = [
      'lead_frio',
      'primeiro_contato',
      'agendamento',
      'monitoramento',
      'em_negociacao',
      'renovacao',
      'reativacao',
      // manter compatibilidade temporária com legados caso precise migrar
      'avaliacao',
      'fechamento_programa',
      'acompanhamento',
    ]

    const patientsCol = app.findCollectionByNameOrId('patients')
    const patientStageField = patientsCol.fields.getByName('stage')
    if (patientStageField) {
      patientStageField.values = stageValues
      patientStageField.maxSelect = 1
      app.save(patientsCol)
    }

    const journeyCol = app.findCollectionByNameOrId('journey_events')
    const journeyStageField = journeyCol.fields.getByName('stage')
    if (journeyStageField) {
      journeyStageField.values = stageValues
      journeyStageField.maxSelect = 1
      app.save(journeyCol)
    }

    // 2. Mapeamento de dados legados para as novas 7 etapas
    // Legados mapeados:
    // 'avaliacao' -> 'monitoramento'
    // 'fechamento_programa' -> 'em_negociacao'
    // 'acompanhamento' -> 'renovacao' (ou mantido conforme contexto)
    app
      .db()
      .newQuery("UPDATE patients SET stage = 'monitoramento' WHERE stage = 'avaliacao'")
      .execute()
    app
      .db()
      .newQuery("UPDATE patients SET stage = 'em_negociacao' WHERE stage = 'fechamento_programa'")
      .execute()
    app
      .db()
      .newQuery("UPDATE patients SET stage = 'renovacao' WHERE stage = 'acompanhamento'")
      .execute()

    app
      .db()
      .newQuery("UPDATE journey_events SET stage = 'monitoramento' WHERE stage = 'avaliacao'")
      .execute()
    app
      .db()
      .newQuery(
        "UPDATE journey_events SET stage = 'em_negociacao' WHERE stage = 'fechamento_programa'",
      )
      .execute()
    app
      .db()
      .newQuery("UPDATE journey_events SET stage = 'renovacao' WHERE stage = 'acompanhamento'")
      .execute()

    // 3. Redistribuir os 7 pacientes de exemplo pelas 7 etapas de forma exata e coerente:
    // 1. Rodrigo Albuquerque -> 'lead_frio' (Lead que não respondeu mais mensagens sobre horários)
    // 2. Camila Rodrigues -> 'primeiro_contato' (Prospect recém-chegado via WhatsApp/Instagram)
    // 3. Mariana Pires -> 'agendamento' (Conversando sobre avaliação, tentando converter para agendar)
    // 4. Beatriz Fonseca -> 'monitoramento' (Avaliação agendada, monitorando presença até o dia)
    // 5. Lucas Mendonça -> 'em_negociacao' (Avaliação realizada, monitorando retorno da proposta de tratamento)
    // 6. Carlos Eduardo Lima -> 'renovacao' (A menos de 30 dias do fim do programa)
    // 7. Fernanda Nogueira -> 'reativacao' (Interrompeu/não renovou, oportunidade de revenda)

    app
      .db()
      .newQuery(
        "UPDATE patients SET stage = 'lead_frio', notes = 'Lead frio: não respondeu contatos há mais de 15 dias após perguntar valores e sumir.' WHERE name = 'Rodrigo Albuquerque'",
      )
      .execute()
    app
      .db()
      .newQuery(
        "UPDATE patients SET stage = 'primeiro_contato', notes = 'Prospect recém-chegado demonstrando interesse inicial. Objetivo: agendar avaliação.' WHERE name = 'Camila Rodrigues'",
      )
      .execute()
    app
      .db()
      .newQuery(
        "UPDATE patients SET stage = 'agendamento', notes = 'Em conversa ativa para conversão e definição de horário para avaliação inicial.' WHERE name = 'Mariana Pires'",
      )
      .execute()
    app
      .db()
      .newQuery(
        "UPDATE patients SET stage = 'monitoramento', notes = 'Avaliação agendada para quinta-feira. Monitorando confirmação de comparecimento.' WHERE name = 'Beatriz Fonseca'",
      )
      .execute()
    app
      .db()
      .newQuery(
        "UPDATE patients SET stage = 'em_negociacao', notes = 'Avaliação concluída. Monitorando retorno da proposta (R$ 1.450/mês). Se recusar, mover para Reativação.' WHERE name = 'Lucas Mendonça'",
      )
      .execute()
    app
      .db()
      .newQuery(
        "UPDATE patients SET stage = 'renovacao', notes = 'A menos de 30 dias de finalizar o ciclo de tratamento. Fomentando continuidade e qualidade de vida.' WHERE name = 'Carlos Eduardo Lima'",
      )
      .execute()
    app
      .db()
      .newQuery(
        "UPDATE patients SET stage = 'reativacao', notes = 'Não renovou ciclo anterior ou pausou sem retorno. Oportunidade para novo programa de cuidado.' WHERE name = 'Fernanda Nogueira'",
      )
      .execute()

    // Adicionar eventos de jornada específicos para Rodrigo em lead_frio se não houver
    try {
      const rodrigo = app.findFirstRecordByData('patients', 'name', 'Rodrigo Albuquerque')
      if (rodrigo) {
        const je = new Record(journeyCol)
        je.set('patient_id', rodrigo.id)
        je.set('type', 'mudanca_estagio')
        je.set('stage', 'lead_frio')
        je.set('title', 'Movido para Lead Frio')
        je.set(
          'description',
          'Sem resposta ou retorno a mensagens há mais de 15 dias. Classificado como lead frio.',
        )
        je.set('responsible_id', rodrigo.get('responsible_id'))
        je.set('is_automatic', true)
        app.save(je)
      }
    } catch (_) {}

    // 4. Agora atualizar os campos select para conter estritamente as 7 etapas oficiais
    const finalStageValues = [
      'lead_frio',
      'primeiro_contato',
      'agendamento',
      'monitoramento',
      'em_negociacao',
      'renovacao',
      'reativacao',
    ]

    patientStageField.values = finalStageValues
    app.save(patientsCol)

    journeyStageField.values = finalStageValues
    app.save(journeyCol)

    // 5. Atualizar automações existentes e adicionar automações para as novas etapas
    const automationsCol = app.findCollectionByNameOrId('automations')

    const autoUpdates = [
      {
        name: 'Follow-up de Primeiro Contato',
        trigger_type: 'novo_contato',
        trigger_config: { stage: 'primeiro_contato', wait_minutes: 20 },
        action_type: 'enviar_mensagem',
        action_config: { channel: 'whatsapp' },
        message_template:
          'Olá {paciente.nome}! Vimos seu contato e gostaríamos de te convidar para agendar sua Avaliação Inicial de saúde. Qual o melhor horário para você?',
        enabled: true,
      },
      {
        name: 'Movimentação para Lead Frio por Falta de Retorno',
        trigger_type: 'inatividade',
        trigger_config: { stage: 'primeiro_contato', days_without_response: 7 },
        action_type: 'mover_funil',
        action_config: { to_stage: 'lead_frio' },
        message_template:
          'Lead sem interação há 7+ dias movido automaticamente para Lead Frio para posterior campanha.',
        enabled: true,
      },
      {
        name: 'Lembrete de Avaliação (Monitoramento)',
        trigger_type: 'consulta_agendada',
        trigger_config: { stage: 'monitoramento', notice_hours: [24, 2] },
        action_type: 'enviar_mensagem',
        action_config: { channel: 'whatsapp' },
        message_template:
          'Olá {paciente.nome}, confirmamos sua Avaliação Inicial amanhã na clínica. Responda 1 para confirmar presença ou 2 para reagendar.',
        enabled: true,
      },
      {
        name: 'Follow-up de Negociação Pós-Avaliação',
        trigger_type: 'inatividade',
        trigger_config: { stage: 'em_negociacao', days_inactive: 3 },
        action_type: 'enviar_mensagem',
        action_config: { channel: 'whatsapp' },
        message_template:
          'Olá {paciente.nome}! Ficamos muito felizes com a sua avaliação. Teve tempo de analisar qual programa de tratamento irá seguir?',
        enabled: true,
      },
      {
        name: 'Fomento Contínuo de Renovação (<30 dias)',
        trigger_type: 'data_proxima',
        trigger_config: { stage: 'renovacao', days_to_end: 30 },
        action_type: 'enviar_mensagem',
        action_config: { channel: 'whatsapp' },
        message_template:
          'Oi {paciente.nome}! Você está a menos de 30 dias de finalizar seu programa. Como tem se sentido e que tal mantermos seu cuidado contínuo de saúde?',
        enabled: true,
      },
      {
        name: 'Oportunidade de Reativação',
        trigger_type: 'inatividade',
        trigger_config: { stage: 'reativacao', days_inactive: 15 },
        action_type: 'enviar_mensagem',
        action_config: { channel: 'whatsapp' },
        message_template:
          'Olá {paciente.nome}! Sentimos sua falta. Preparamos uma condição exclusiva para você retomar o seu cuidado com a saúde hoje.',
        enabled: true,
      },
    ]

    for (const a of autoUpdates) {
      let rec
      try {
        rec = app.findFirstRecordByData('automations', 'name', a.name)
      } catch (_) {
        rec = new Record(automationsCol)
      }
      rec.set('name', a.name)
      rec.set('trigger_type', a.trigger_type)
      rec.set('trigger_config', a.trigger_config)
      rec.set('action_type', a.action_type)
      rec.set('action_config', a.action_config)
      rec.set('message_template', a.message_template)
      rec.set('enabled', a.enabled)
      app.save(rec)
    }

    // 6. Atualizar a definição do Agente IA com as 7 etapas
    $ai.agents.define(app, {
      slug: 'patient-journey-assistant',
      name: 'Assistente da Jornada',
      description:
        'Assistente de IA para qualificação de pacientes, gestão de funil nas 7 etapas, acompanhamento de jornada e automações clínicas.',
      systemPrompt: `Você é o Assistente da Jornada, um assistente acolhedor, profissional e prestativo em português brasileiro (pt-BR) da clínica médica/multidisciplinar.
Seu objetivo é auxiliar a equipe no controle da jornada completa do paciente nas 7 etapas do funil:
1. Lead Frio: Lead sem resposta há muito tempo, sem continuidade ao processo.
2. Primeiro Contato: Prospect que entra em contato pela primeira vez. Objetivo: converter em paciente com agendamento de avaliação.
3. Agendamento: Conversar e tentar converter até conseguir agendar a avaliação.
4. Monitoramento: Até o dia da avaliação, confirmar presença (ou faltou/desmarcou).
5. Em Negociação: Pós-avaliação, monitorar tempo de retorno sobre confirmação do programa. Se recusar, mover para Reativação.
6. Renovação: Clientes a menos de 30 dias do término do programa para fomento de cuidado contínuo.
7. Reativação: Clientes que não renovaram, não agendaram mas demonstraram interesse prévio.

Recusas e limites éticos:
- NUNCA invente informações de pacientes. Se um dado não constar nos registros ou contexto, declare que não encontrou.
- NUNCA forneça diagnósticos, prescrições ou orientações clínicas médicas. O foco é estritamente a jornada, experiência e relacionamento do paciente.
- Cite nomes de pacientes e etapas quando fizer afirmações baseadas nos dados.`,
      tier: 'fast',
      tools: [
        { collection: 'patients', perms: { list: true, read: true, update: true } },
        { collection: 'journey_events', perms: { list: true, read: true, create: true } },
        { collection: 'tasks', perms: { list: true, read: true, create: true } },
        { collection: 'appointments', perms: { list: true, read: true, create: true } },
        { collection: 'conversations', perms: { list: true, read: true } },
        { collection: 'messages', perms: { list: true, read: true } },
      ],
      memory: [
        {
          type: 'text',
          payload: {
            text: `As 7 etapas da Jornada do Paciente são:
1. Lead Frio: Aquele lead que não responde há muito tempo, não retornou as mensagens, não deu continuidade ao processo, está há muito tempo sem retorno.
2. Primeiro Contato: Prospect (a pessoa que ainda não é paciente, não tem horário conosco e não tem cadastro ainda) entra em contato / primeiro contato — nesse primeiro momento o objetivo é converter esse prospect em paciente, ou seja, agendamento de avaliação (chegada).
3. Agendamento: Agendamento de Avaliação — conversar e tentar converter até conseguir agendar.
4. Monitoramento: Até o dia da avaliação — confirmar se o paciente veio ou não (faltou ou desmarcou).
5. Em Negociação: Após a avaliação, monitorar tempo de retorno sobre a confirmação de qual programa de tratamento irá seguir. Se não for seguir, descobrir o porquê e redirecionar para a última etapa, Reativação.
6. Renovação: Clientes que estão a menos de 30 dias de finalizar o processo/programa de tratamento. Fomentar: como está, se seus problemas e dificuldades foram sanados, e sugerir criar processo contínuo de cuidado com a saúde, minimizando possíveis complicações futuras e melhorando qualidade de vida.
7. Reativação: Todo cliente que não renova, ou não fez agendamento mas mostrou interesse em algum momento — existe oportunidade aqui para vender o programa.`,
          },
        },
        {
          type: 'faq',
          payload: {
            qa: [
              {
                question:
                  'O que fazer na etapa Em Negociação quando o paciente não aceita a proposta?',
                answer:
                  'Deve-se entender a objeção do paciente (preço, tempo, prioridade) e redirecioná-lo imediatamente para a etapa de Reativação para futuras abordagens acolhedoras.',
              },
              {
                question: 'Como funciona a etapa de Renovação?',
                answer:
                  'A etapa de Renovação inclui pacientes a menos de 30 dias de finalizar seu programa. O foco é checar se as dores foram sanadas e propor um plano contínuo de prevenção e manutenção da qualidade de vida.',
              },
              {
                question: 'Quem vai para Lead Frio?',
                answer:
                  'Leads que pararam de responder nas etapas iniciais há dias ou semanas sem dar continuidade ao atendimento de agendamento.',
              },
            ],
          },
        },
      ],
    })
  },
  (app) => {
    // down migration
  },
)
