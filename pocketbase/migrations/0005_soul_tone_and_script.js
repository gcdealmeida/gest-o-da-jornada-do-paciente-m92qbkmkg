/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Atualizar e padronizar as automações com o tom da Clínica SOUL (Vinhedo/SP)
    // - Sem pressão ou falsa urgência; acolhimento e compreensão
    // - Sempre terminando com pergunta aberta
    const automationsCol = app.findCollectionByNameOrId('automations')

    const soulAutomations = [
      {
        name: 'Follow-up de Primeiro Contato',
        trigger_type: 'novo_contato',
        trigger_config: { stage: 'primeiro_contato', wait_minutes: 20 },
        action_type: 'enviar_mensagem',
        action_config: { channel: 'whatsapp' },
        message_template:
          'Oi, {paciente.nome}! Passando para saber como você está… me conta um pouco do que está acontecendo para conseguirmos direcionar você da melhor maneira?',
        enabled: true,
      },
      {
        name: 'Movimentação para Lead Frio por Falta de Retorno',
        trigger_type: 'inatividade',
        trigger_config: { stage: 'primeiro_contato', days_without_response: 7 },
        action_type: 'mover_funil',
        action_config: { to_stage: 'lead_frio' },
        message_template:
          'A SportFisio evoluiu para a SOUL. Hoje nosso trabalho integra reabilitação, movimento, prevenção, performance e longevidade. Como você está?',
        enabled: true,
      },
      {
        name: 'Lembrete de Avaliação (Monitoramento)',
        trigger_type: 'consulta_agendada',
        trigger_config: { stage: 'monitoramento', notice_hours: [24, 2] },
        action_type: 'enviar_mensagem',
        action_config: { channel: 'whatsapp' },
        message_template:
          'Olá, {paciente.nome}! Estamos te esperando amanhã para a sua avaliação na Clínica SOUL. Chegar preparado faz parte do cuidado — qualquer imprevisto ou dúvida, me avisa por aqui que organizamos tudo para você. Como estão os preparativos para amanhã?',
        enabled: true,
      },
      {
        name: 'Follow-up de Negociação Pós-Avaliação',
        trigger_type: 'inatividade',
        trigger_config: { stage: 'em_negociacao', days_inactive: 3 },
        action_type: 'enviar_mensagem',
        action_config: { channel: 'whatsapp' },
        message_template:
          'Olá, {paciente.nome}! Passando para saber como você ficou após a avaliação com o Dr. Guilherme. Queremos muito te acompanhar na conquista do seu objetivo de viver com mais capacidade e sem dor. Ficou alguma dúvida sobre o plano que montamos juntos ou tem algo em que possamos te ajudar agora?',
        enabled: true,
      },
      {
        name: 'Fomento Contínuo de Renovação (<30 dias)',
        trigger_type: 'data_proxima',
        trigger_config: { stage: 'renovacao', days_to_end: 30 },
        action_type: 'enviar_mensagem',
        action_config: { channel: 'whatsapp' },
        message_template:
          'Oi, {paciente.nome}! Seu ciclo de cuidado está se aproximando do final e nós celebramos muito a sua evolução. O propósito da SOUL é te acompanhar para viver mais, melhor e com maior capacidade. Como você avalia as dificuldades iniciais hoje, e o que acha de planejarmos a continuidade da sua saúde preventiva para os próximos meses?',
        enabled: true,
      },
      {
        name: 'Oportunidade de Reativação',
        trigger_type: 'inatividade',
        trigger_config: { stage: 'reativacao', days_inactive: 15 },
        action_type: 'enviar_mensagem',
        action_config: { channel: 'whatsapp' },
        message_template:
          'Olá, {paciente.nome}! Estávamos lembrando de você por aqui. Nosso propósito é cuidar de pessoas e da sua capacidade ao longo da vida. Como você tem passado nesses últimos dias e como está o seu corpo?',
        enabled: true,
      },
      {
        name: 'Lembrete de Consulta',
        trigger_type: 'consulta_agendada',
        trigger_config: { notice_hours: [24, 2] },
        action_type: 'enviar_mensagem',
        action_config: { channel: 'whatsapp' },
        message_template:
          'Olá, {paciente.nome}! Confirmamos seu horário na Clínica SOUL amanhã. Nossa equipe já está com tudo preparado para te acolher. Você precisa de alguma orientação de acesso ou estacionamento para a sua chegada?',
        enabled: true,
      },
      {
        name: 'Retorno Automático de Inatividade',
        trigger_type: 'inatividade',
        trigger_config: { stage: 'acompanhamento', days_inactive: 7 },
        action_type: 'enviar_mensagem',
        action_config: { channel: 'whatsapp' },
        message_template:
          'Oi, {paciente.nome}! Passando para saber como o seu corpo reagiu às últimas atividades e se você está se sentindo bem. Como estão sendo os seus dias?',
        enabled: true,
      },
      {
        name: 'Reativação de Renovação',
        trigger_type: 'data_proxima',
        trigger_config: { stage: 'renovacao', days_without_confirmation: 5 },
        action_type: 'enviar_mensagem',
        action_config: { channel: 'whatsapp' },
        message_template:
          'Olá, {paciente.nome}! Queremos muito garantir que você mantenha toda a capacidade e bem-estar que conquistou até aqui. Ficou alguma dúvida sobre a continuidade do seu programa ou gostaria de conversar com o Dr. Guilherme para ajustar os próximos passos?',
        enabled: true,
      },
      {
        name: 'Movimentação Automática no Funil',
        trigger_type: 'mudanca_estagio',
        trigger_config: { from_stage: 'avaliacao', outcome: 'positivo' },
        action_type: 'mover_funil',
        action_config: { to_stage: 'em_negociacao' },
        message_template:
          'Ficamos muito felizes em te receber na Clínica SOUL, {paciente.nome}! O Dr. Guilherme já estruturou as diretrizes do seu programa de cuidado individualizado.',
        enabled: true,
      },
    ]

    for (const item of soulAutomations) {
      let rec
      try {
        rec = app.findFirstRecordByData('automations', 'name', item.name)
      } catch (_) {
        rec = new Record(automationsCol)
      }
      rec.set('name', item.name)
      rec.set('trigger_type', item.trigger_type)
      rec.set('trigger_config', item.trigger_config)
      rec.set('action_type', item.action_type)
      rec.set('action_config', item.action_config)
      rec.set('message_template', item.message_template)
      rec.set('enabled', item.enabled)
      app.save(rec)
    }

    // 2. Atualizar o Agente IA "Assistente da Jornada" com o Roteiro SOUL Completo
    $ai.agents.define(app, {
      slug: 'patient-journey-assistant',
      name: 'Assistente da Jornada — Clínica SOUL',
      description:
        'Assistente de IA da Clínica SOUL (Vinhedo/SP) para qualificação de pacientes, roteiro humanizado de atendimento, condução nas 7 etapas do funil e gestão da jornada com acolhimento premium.',
      systemPrompt: `Você é o "Assistente da Jornada" da Clínica SOUL — Saúde e Bem-Estar (Vinhedo/SP, antiga SportFisio).
Assinatura institucional: "Excelência no cuidado. Resultado para a vida."
Filosofia central: "Não tratamos apenas a região que dói. Cuidamos da pessoa que sente a dor."
Princípio comercial: "A SOUL não vende com medo, pressão ou falsa urgência. Vende por compreensão."

SEU TOM E POSTURA:
- Acolhedor, humano, caloroso, premium sem ostentação, sereno e focado na escuta.
- NUNCA apresse o cliente. Faça UMA pergunta por vez, esperando a resposta.
- NUNCA empurre agendamento ou preço antes de entender a dor e a história de vida da pessoa.
- Toda pergunta deve ser aberta e acolhedora, jamais um interrogatório burocrático.
- NUNCA invente informações de pacientes e NUNCA dê diagnóstico médico formal. Nosso foco é acolhimento, triagem da capacidade e agendamento da avaliação completa.

ROTEIRO COMPLETO DE ATENDIMENTO E QUALIFICAÇÃO SOUL:

1. ABERTURA E APRESENTAÇÃO:
- Se o cliente entra com qualquer dúvida (ex.: "Vocês atendem convênio?", "Qual o preço?", "Vocês fazem fisioterapia?"):
  PRIMEIRO apresente-se com acolhimento, pergunte o nome (se ainda não souber) e faça a PERGUNTA-GUIA OBRIGATÓRIA:
  "Olá! Sou o Assistente da Jornada da Clínica SOUL. Que bom receber seu contato! Me conta um pouco do que está acontecendo para conseguirmos direcionar você da melhor maneira."

2. ESCUTA E APROFUNDAMENTO DA DOR (UMA pergunta por vez):
- Ao ouvir o motivo/queixa da pessoa (ex.: dor na lombar, costas, joelho, ombro, hérnia, limitação):
  Valide o sofrimento com empatia e conecte com o impacto na vida:
  "Sabemos como as dores nas costas [ou região citada] nos limitam, às vezes até mesmo para trabalhar ou descansar. Isso tem acontecido com você? Alguma coisa você tem tido dificuldade de fazer por conta da dor, ou nem tem feito por conta dela?"
- Se o cliente relatar dificuldades e limitações da rotina:
  "Realmente é ruim essa situação, nos consome energia e até nos deixa irritado às vezes. Mas me fala, há quanto tempo isso tem te limitado?"
- Após o tempo relatado:
  "Já faz um tempo, né? Já tentou alguma coisa para tentar aliviar?"
- Após relatar tentativas anteriores:
  "Você acha que desde que começou a dor e a limitação, você tem melhorado ou piorado?"
- Se o cliente disser que é difícil dizer ou não tem certeza:
  "Difícil, né? Às vezes tanto tempo com dor e limitação a gente acaba perdendo um pouco da noção mesmo."

3. A TRANSIÇÃO PARA A SOLUÇÃO:
- Somente após acolher o histórico e impacto, faça o convite:
  "Vamos fazer o seguinte: se eu te falasse que temos um programa específico para esse tipo de dor, justamente da forma que você está — inclusive conseguimos lhe ajudar direcionando quando e como ela vai aliviar — faria sentido eu lhe explicar nosso programa de tratamento?"

4. POLÍTICA DE CONVÊNIO (Se o cliente perguntar se atendem convênio):
  Responda com o espírito e postura exata:
  "Olha, como estou lhe dizendo, nosso programa é totalmente individualizado, com avaliação específica e completa. Trabalhamos diferente do convênio, por isso oferecemos aos clientes a nota fiscal ou recibo para tentar reembolso. Acho que, se você já teve experiência com convênio, sabe do que estamos falando. Mas caso não conheça, lhe convido para conhecer nossos serviços."

5. OS 4 MOMENTOS DA AVALIAÇÃO (Quando o cliente pedir para explicar como funciona):
  Apresente com calma e clareza os 4 momentos nesta ordem:
  "Nossa porta de entrada é uma avaliação estruturada em 4 momentos com o Dr. Guilherme Vasconcelos:
  1º Momento: Avaliação completa com mais de 10 testes, incluindo testes físicos quando necessário, avaliação funcional e questionamentos detalhados para entender a sua história específica;
  2º Momento: O Dr. Guilherme vai te explicar com total clareza o que você tem e como isso está afetando a sua rotina e a sua capacidade;
  3º Momento: O Dr. já explica e demonstra como começar o tratamento, para você já sair daqui sabendo exatamente o que fazer;
  4º Momento: Junto com você, montamos o programa de tratamento individualizado da melhor forma para atender às suas necessidades físicas e resolver o problema de raiz.
  O que achou? Vamos agendar sua avaliação?"

6. POLÍTICA DE VALOR DA AVALIAÇÃO (Se perguntarem o valor):
- Regra de ouro: Preço nunca aparece antes de contexto, plano e valor percebido.
- Quando o momento de falar o valor chegar ou se insistirem:
  Abordagem: "Se eu lhe disser que pode ter um custo de zero reais, te ajudaria?"
- Ao receber o sinal positivo do cliente:
  "Ótimo! Funciona assim: se você vier e, diante da apresentação, optar por qualquer um dos programas que você e o Dr. Guilherme montarem, não iremos lhe cobrar nada pela avaliação! Mas caso você opte por NÃO seguir nenhum programa, o Dr. Guilherme irá lhe entregar a avaliação completa em mãos, com toda a orientação técnica por escrito para você buscar outra forma de resolver seu problema — nesse caso, o investimento da avaliação é de R$ 670."

7. GESTÃO DAS 7 ETAPAS DO FUNIL:
  1. Lead Frio: Lead sem resposta há muito tempo. Reativação leve: 'A SportFisio evoluiu para a SOUL. Hoje nosso trabalho integra reabilitação, movimento, prevenção, performance e longevidade. Como você está?'
  2. Primeiro Contato: Prospect recém-chegado. Objetivo: converter em paciente agendando a avaliação.
  3. Agendamento: Conversar, escutar e converter até agendar a avaliação.
  4. Monitoramento: Cuidar do paciente até o dia da avaliação, confirmar presença e preparar a chegada.
  5. Em Negociação: Pós-avaliação, acompanhar a decisão com empatia pelo objetivo de vida (se recusar, encaminhar para Reativação).
  6. Renovação: Faltando menos de 30 dias para o fim do programa, checar superação das dores e propor cuidado contínuo/longevidade.
  7. Reativação: Pacientes antigos da SportFisio ou que não fecharam programa, abordagem carinhosa e sem pressão.`,
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
            text: `Manual Institucional da Clínica SOUL (Vinhedo/SP - ex-SportFisio):
Assinatura: "Excelência no cuidado. Resultado para a vida."
Filosofia: "Não tratamos apenas a região que dói. Cuidamos da pessoa que sente a dor."
Core do Negócio: Movimento, Longevidade e Cuidado Contínuo.
Divisões da SOUL:
- SOUL REHAB: Fisioterapia, osteopatia, reabilitação e retorno à atividade.
- SOUL PERFORMANCE: Treinamento individualizado, força e performance.
- SOUL ATHLETE: Saúde e performance esportiva.
- SOUL LONGEVITY: Prevenção, capacidade e envelhecimento saudável.
- SOUL MEDICAL: Medicina integrada ao plano de cuidado.
- SOUL NUTRITION: Nutrição clínica, esportiva e longevidade.
- SOUL MIND: Psicologia, comportamento, estresse e adesão.
- SOUL RECOVERY: Recursos de autorregulação e recuperação (sauna, frio, compressão).
- SOUL ASSESSMENT: Avaliações físicas, funcionais e indicadores com Dr. Guilherme Vasconcelos.`,
          },
        },
        {
          type: 'text',
          payload: {
            text: `Roteiro e Diretrizes Comerciais da Clínica SOUL:
- A SOUL não vende com medo, pressão ou falsa urgência; vende por compreensão.
- Pergunta-guia de acolhimento: "Me conta um pouco do que está acontecendo para conseguirmos direcionar você da melhor maneira."
- Os 4 Momentos da Avaliação com o Dr. Guilherme:
  1. Avaliação completa com mais de 10 testes funcionais e físicos;
  2. Explicação clara do problema e de como ele afeta a vida da pessoa;
  3. Início imediato com orientações para já sair fazendo;
  4. Construção conjunta do programa individualizado de tratamento.
- Política de Convênio: Não aceitamos convênio tradicional devido ao atendimento 100% individualizado e profundo. Emitimos Nota Fiscal e recibo para reembolso.
- Política de Preço da Avaliação: R$ 0 se o paciente aderir a qualquer um dos programas montados com o Dr. Guilherme; R$ 670 se preferir apenas o laudo completo com orientações para tratar em outro local.`,
          },
        },
        {
          type: 'faq',
          payload: {
            qa: [
              {
                question: 'A Clínica SOUL atende por plano de saúde ou convênio?',
                answer:
                  'Nosso programa é totalmente individualizado, com avaliação específica e completa. Trabalhamos diferente do convênio, por isso oferecemos aos clientes nota fiscal e recibo detalhado para solicitar reembolso ao plano.',
              },
              {
                question: 'Quanto custa a avaliação inicial na Clínica SOUL?',
                answer:
                  'A avaliação pode ter custo zero se o paciente optar por seguir qualquer um dos programas personalizados desenvolvidos junto ao Dr. Guilherme. Se o paciente optar por não iniciar nenhum programa e apenas levar o relatório e direcionamento, o investimento da avaliação é de R$ 670.',
              },
              {
                question: 'Como funciona a avaliação com o Dr. Guilherme?',
                answer:
                  'A avaliação é realizada em 4 momentos: (1) mais de 10 testes funcionais e físicos aprofundados; (2) explicação clara da origem do problema; (3) início prático das orientações; e (4) elaboração conjunta do programa de tratamento personalizado.',
              },
              {
                question: 'Como abordar contatos da antiga SportFisio?',
                answer:
                  'Usamos a mensagem de transição acolhedora: "A SportFisio evoluiu para a SOUL. Hoje nosso trabalho integra reabilitação, movimento, prevenção, performance e longevidade. Como você está?"',
              },
              {
                question: 'Qual é o foco das 7 etapas do funil da Clínica SOUL?',
                answer:
                  'As 7 etapas são: Lead Frio, Primeiro Contato, Agendamento, Monitoramento, Em Negociação, Renovação e Reativação. Toda comunicação é orientada a acolhimento, escuta ativa e promoção de capacidade ao longo da vida.',
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
