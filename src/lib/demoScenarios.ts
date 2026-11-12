import pb from '@/lib/pocketbase/client'
import { crmService } from '@/services/crmService'
import { STAGES, type JourneyEventRecord, type PatientRecord, type StageId } from '@/types/crm'

// ---------------------------------------------------------------------------
// Motor de Cenários de Teste (Modo Demo da Clínica SOUL)
// Cada cenário roda de ponta a ponta usando as mesmas coleções/serviços já
// usados pelo inbox demo, automações e timeline da jornada.
// ---------------------------------------------------------------------------

export interface ScenarioStep {
  label: string
  /** Mensagem inbound simulada (paciente falando) */
  inbound?: string
  /** Mensagem outbound simulada (clínica/agente/automação falando) */
  outbound?: string
  outboundIsAuto?: boolean
  /** Evento na jornada do paciente */
  journey?: {
    type: JourneyType
    title: string
    description: string
    automatic?: boolean
  }
  /** Movimentação de estágio no funil */
  moveStage?: StageId
  moveStageTitle?: string
  moveStageDesc?: string
  /** Registro na automação (automation_logs) */
  automationLog?: {
    automationName: string
    trigger: string
    action: string
    details: string
  }
  /** Pausa antes deste passo (ms) para simular tempo real */
  delayBefore?: number
}
type JourneyType = JourneyEventRecord['type']

export interface ScenarioResult {
  patientId: string
  patientName: string
  conversationId: string
  steps: ScenarioStep[]
}

export interface ScenarioDefinition {
  id: string
  title: string
  icon: string
  badge: string
  summary: string
  detail: string
  buildSteps: (person: DemoPerson) => ScenarioStep[]
}

export interface DemoPerson {
  name: string
  phone: string
}

// --- Geração de pessoas fictícias (varia a cada execução) -------------------

const FIRST_NAMES = [
  'Ana Beatriz',
  'Rafael',
  'Juliana',
  'Marcelo',
  'Patrícia',
  'Thiago',
  'Carolina',
  'Eduardo',
  'Larissa',
  'Gustavo',
  'Fernanda',
  'Bruno',
  'Aline',
  'Diego',
  'Sofia',
  'Renato',
  'Vanessa',
  'Leandro',
  'Tatiane',
  'Caio',
  'Priscila',
  'Rodrigo',
]
const LAST_NAMES = [
  'Martins',
  'Barbosa',
  'Siqueira',
  'Teixeira',
  'Moretti',
  'Camargo',
  'Andrade',
  'Ferraz',
  'Nogueira',
  'Salgado',
  'Toledo',
  'Ribeiro',
  'Duarte',
  'Pacheco',
  'Bittencourt',
  'Queiroz',
  'Vasques',
  'Braga',
  'Sampaio',
  'Cordeiro',
]

let phoneCounter = 0

function generatePerson(): DemoPerson {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]
  phoneCounter = (phoneCounter + 1) % 100
  const tail = String(Math.floor(1000 + Math.random() * 9000))
  const tail2 = String(Math.floor(1000 + Math.random() * 9000))
  const phone = `+55 11 9${tail.slice(0, 4)}-${tail2}`
  void phoneCounter
  return { name: `${first} ${last}`, phone }
}

function randInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min))
}

const stageName = (id: StageId) => STAGES.find((s) => s.id === id)?.name || id

// --- Persistência helpers ----------------------------------------------------

async function ensureDemoConversation(patient: PatientRecord): Promise<string> {
  const existing = await pb.collection('conversations').getList(1, 1, {
    filter: `patient_id = "${patient.id}" && channel = "whatsapp"`,
  })
  if (existing.items.length > 0) return existing.items[0].id
  const conv = await crmService.createConversation({
    patient_id: patient.id,
    channel: 'whatsapp',
    contact_identifier: patient.phone || patient.name,
    last_message_preview: 'Conversa iniciada (demo)',
    last_message_at: new Date().toISOString(),
    unread_count: 0,
    status: 'aberta',
  })
  return conv.id
}

async function appendMessage(
  conversationId: string,
  sender: 'inbound' | 'outbound' | 'system',
  content: string,
  isAuto = false,
): Promise<void> {
  await crmService.simulateInboundMessage(conversationId, content).catch(async () => {
    await pb.collection('messages').create({
      conversation_id: conversationId,
      sender,
      channel: 'whatsapp',
      content,
      is_automatic: isAuto,
    })
  })
}

async function findAutomationId(name: string): Promise<string | null> {
  try {
    const rec = await pb.collection('automations').getList(1, 1, { filter: `name = "${name}"` })
    return rec.items[0]?.id || null
  } catch {
    return null
  }
}

// Extra: quando a mensagem demo for outbound automático, gravamos pelo
// mecanismo padrão (messages direto) para preservar is_automatic.
async function appendAutoOutbound(conversationId: string, content: string): Promise<void> {
  const msg = await pb.collection('messages').create({
    conversation_id: conversationId,
    sender: 'outbound',
    channel: 'whatsapp',
    content,
    sent_by: pb.authStore.record?.id,
    is_automatic: true,
  })
  await pb.collection('conversations').update(conversationId, {
    last_message_preview: content,
    last_message_at: new Date().toISOString(),
  })
}

// --- Definições dos 5 cenários ----------------------------------------------

export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'novo_prospect',
    title: 'Prospect novo entra no WhatsApp',
    icon: 'MessageCircle',
    badge: 'Primeiro Contato',
    summary:
      'Um contato totalmente novo manda "Oi, vocês atendem convênio?". O inbox recebe, o Assistente da Jornada responde no roteiro SOUL, pergunta o nome e descobre o porquê.',
    detail:
      'Cria o paciente em Primeiro Contato com conversa simulada e eventos na jornada. A cada execução, um nome e telefone inéditos.',
    buildSteps: (person: DemoPerson) => [
      {
        label: 'Contato inédito chega no inbox',
        inbound: 'Oi, vocês atendem convênio?',
      },
      {
        label: 'Assistente da Jornada responde no roteiro SOUL',
        outboundIsAuto: true,
        outbound:
          'Olá! Sou o Assistente da Jornada da Clínica SOUL. Que bom receber seu contato! Atendemos de forma diferente do convênio: nosso programa é totalmente individualizado, com avaliação específica e completa, e emitimos nota fiscal e recibo para você tentar reembolso junto ao seu plano. Me conta um pouco do que está acontecendo para conseguirmos direcionar você da melhor maneira?',
      },
      {
        label: 'Paciente se apresenta e conta o motivo',
        inbound:
          'Obrigada pelo retorno! Meu nome é {nome}. Estou com uma dor no joelho direito que não me deixa correr há uns 4 meses.',
      },
      {
        label: 'Automação registra o paciente em Primeiro Contato',
        journey: {
          type: 'contato_inicial',
          title: 'Primeiro Contato Recebido (Demo)',
          description:
            'Prospect inédito entrou via WhatsApp demo perguntando sobre convênio. Dor: joelho direito há ~4 meses.',
          automatic: true,
        },
        automationLog: {
          automationName: 'Follow-up de Primeiro Contato',
          trigger: 'novo_contato',
          action: 'paciente_criado_primeiro_contato',
          details: `Prospect {nome} criado em Primeiro Contato via WhatsApp demo (${person.phone})`,
        },
      },
      {
        label: 'Agente valida a dor e aprofunda',
        outboundIsAuto: true,
        outbound:
          'Que bom te conhecer, {nome}! Sabemos como as dores no joelho nos limitam, às vezes até para coisas simples como correr ou descer escada. Isso tem acontecido com você? Alguma coisa você tem deixado de fazer por conta dessa dor?',
      },
      {
        label: 'Paciente responde',
        inbound:
          'Sim! Parei de correr completamente e até trabalho sentado o dia todo fica desconfortável.',
      },
      {
        label: 'Follow-up automático de Primeiro Contato',
        outboundIsAuto: true,
        outbound:
          'Entendo perfeitamente, {nome}. Temos um programa específico para esse tipo de caso, construído em 4 momentos de avaliação com o Dr. Guilherme. Pode me contar: você já tentou algum tratamento para essa dor até agora?',
      },
      {
        label: 'Evento de automação registrado na jornada',
        journey: {
          type: 'automacao',
          title: 'Automação Disparada: Follow-up de Primeiro Contato',
          description: 'Mensagem de acolhimento e qualificação enviada pelo Assistente da Jornada.',
          automatic: true,
        },
      },
    ],
  },

  {
    id: 'lead_frio',
    title: 'Lead sem resposta vira Lead Frio',
    icon: 'Snowflake',
    badge: 'Lead Frio',
    summary:
      'Um paciente em Primeiro Contato para de responder. Os dias passam, a automação de inatividade move para Lead Frio e dispara a mensagem "A SportFisio evoluiu para a SOUL...".',
    detail:
      'Simula o passar de 7+ dias sem retorno, com registro na timeline e na automação. Reutiliza um paciente em Primeiro Contato quando existe.',
    buildSteps: (person: DemoPerson) => [
      {
        label: 'Paciente está em Primeiro Contato e para de responder',
        journey: {
          type: 'anotacao',
          title: 'Última tentativa de contato sem resposta',
          description:
            'Equipe enviou mensagens nos últimos dias e o lead está sem resposta (simulação de inatividade).',
          automatic: false,
        },
      },
      {
        label: 'Simulando 7 dias de silêncio…',
        delayBefore: 400,
        automationLog: {
          automationName: 'Movimentação para Lead Frio por Falta de Retorno',
          trigger: 'inatividade_primeiro_contato_7dias',
          action: 'movido_para_lead_frio',
          details: 'Lead sem resposta há 7+ dias — elegível para Lead Frio (demo).',
        },
      },
      {
        label: 'Automação move o paciente para Lead Frio',
        moveStage: 'lead_frio',
        moveStageTitle: 'Movido para Lead Frio por Inatividade',
        moveStageDesc:
          'Sem resposta há mais de 7 dias após o primeiro contato. Automação de inatividade.',
        journey: {
          type: 'mudanca_estagio',
          title: 'Movido para Lead Frio por Inatividade',
          description: 'Sem resposta há mais de 7 dias. Automação de inatividade acionada.',
          automatic: true,
        },
      },
      {
        label: 'Mensagem de transição SportFisio → SOUL é disparada',
        outboundIsAuto: true,
        outbound:
          'A SportFisio evoluiu para a SOUL. Hoje nosso trabalho integra reabilitação, movimento, prevenção, performance e longevidade. Como você está?',
      },
      {
        label: 'Automação registrada na timeline',
        journey: {
          type: 'automacao',
          title: 'Automação Disparada: Movimentação para Lead Frio',
          description: 'Mensagem de transição da marca enviada automaticamente via WhatsApp demo.',
          automatic: true,
        },
      },
    ],
  },

  {
    id: 'avaliacao_lembretes',
    title: 'Avaliação agendada e lembretes',
    icon: 'CalendarClock',
    badge: 'Monitoramento',
    summary:
      'Paciente em Agendamento confirma horário, o funil avança para Monitoramento e os lembretes de 24h e 2h antes chegam na conversa, no tom acolhedor da SOUL.',
    detail:
      'Cria o agendamento na agenda, move para Monitoramento e simula os dois lembretes chegando como mensagens reais na conversa.',
    buildSteps: (person: DemoPerson) => [
      {
        label: 'Equipe confirma o horário da avaliação',
        outbound:
          'Olá, {nome}! Sua avaliação com o Dr. Guilherme está confirmada para amanhã às 14h. Combinado?',
      },
      {
        label: 'Paciente confirma',
        inbound: 'Oi! Tudo confirmado, muito obrigada pela atenção. Até amanhã!',
      },
      {
        label: 'Funil avança para Monitoramento',
        moveStage: 'monitoramento',
        moveStageTitle: 'Avaliação Agendada — Entrou em Monitoramento',
        moveStageDesc: 'Horário confirmado pela paciente. Cuidado ativo até o dia da avaliação.',
        journey: {
          type: 'agendamento',
          title: 'Avaliação Inicial Agendada',
          description: 'Avaliação com o Dr. Guilherme agendada para amanhã às 14h (demo).',
          automatic: false,
        },
        automationLog: {
          automationName: 'Lembrete de Avaliação (Monitoramento)',
          trigger: 'consulta_agendada',
          action: 'lembretes_programados_24h_2h',
          details: 'Avaliação agendada — lembretes de 24h e 2h programados (demo).',
        },
      },
      {
        label: 'Lembrete de 24h antes chega na conversa',
        delayBefore: 600,
        outboundIsAuto: true,
        outbound:
          'Olá, {nome}! Estamos te esperando amanhã para a sua avaliação na Clínica SOUL. Chegar preparado faz parte do cuidado — qualquer imprevisto ou dúvida, me avisa por aqui que organizamos tudo para você. Como estão os preparativos para amanhã?',
      },
      {
        label: 'Lembrete de 2h antes chega na conversa',
        delayBefore: 500,
        outboundIsAuto: true,
        outbound:
          'Olá, {nome}! Falta pouco! Sua avaliação com o Dr. Guilherme começa em aproximadamente 2 horas. Nossa equipe já está com tudo preparado para te acolher. Qualquer coisa, estou por aqui. Até já!',
      },
      {
        label: 'Lembretes registrados na jornada',
        journey: {
          type: 'automacao',
          title: 'Automação Disparada: Lembretes de Avaliação',
          description: 'Lembretes de 24h e 2h antes da avaliação enviados automaticamente.',
          automatic: true,
        },
      },
    ],
  },

  {
    id: 'faltou_avaliacao',
    title: 'Paciente faltou à avaliação',
    icon: 'CalendarX2',
    badge: 'Reativação',
    summary:
      'Paciente em Monitoramento não comparece (faltou/desmarcou). O funil move para Reativação com evento explicando a falta e a mensagem de resgate acolhedora é enviada, sem culpa.',
    detail:
      'Usa um paciente real em Monitoramento quando existe (ou cria um), registra a falta na timeline e envia a mensagem de resgate.',
    buildSteps: (person: DemoPerson) => [
      {
        label: 'Dia da avaliação: paciente não comparece',
        journey: {
          type: 'anotacao',
          title: 'Falta Registrada na Avaliação',
          description:
            'Paciente não compareceu à avaliação agendada com o Dr. Guilherme (simulação de falta).',
          automatic: false,
        },
      },
      {
        label: 'Equipe registra o ocorrido',
        outbound:
          'Oi, {nome}! Passando para saber como você está — percebemos que não foi possível comparecer à avaliação de hoje.',
      },
      {
        label: 'Funil move para Reativação com o motivo da falta',
        moveStage: 'reativacao',
        moveStageTitle: 'Faltou à Avaliação — Movido para Reativação',
        moveStageDesc:
          'Paciente faltou/desmarcou a avaliação em Monitoramento. Oportunidade de resgate acolhedor.',
        journey: {
          type: 'mudanca_estagio',
          title: 'Movido para Reativação: Falta na Avaliação',
          description: 'Não compareceu à avaliação agendada. Etapa de resgate da SOUL.',
          automatic: true,
        },
      },
      {
        label: 'Mensagem de resgate acolhedora é disparada',
        delayBefore: 400,
        outboundIsAuto: true,
        outbound:
          'Imagina que imprevistos acontecem, e está tudo bem! Nosso cuidado continua de portas abertas para você. Se quiser, remarcamos sua avaliação com o Dr. Guilherme no dia e horário que ficar melhor para a sua rotina — me conta, qual período funciona melhor para você?',
      },
      {
        label: 'Automação de resgate registrada',
        automationLog: {
          automationName: 'Oportunidade de Reativação',
          trigger: 'faltou_avaliacao',
          action: 'mensagem_resgate_enviada',
          details: 'Mensagem de resgate sem culpa enviada após falta na avaliação (demo).',
        },
        journey: {
          type: 'automacao',
          title: 'Automação Disparada: Resgate pós-falta',
          description: 'Mensagem acolhedora de remarcação enviada automaticamente.',
          automatic: true,
        },
      },
    ],
  },

  {
    id: 'pos_avaliacao_negociacao',
    title: 'Pós-avaliação sem retorno (Em Negociação)',
    icon: 'Handshake',
    badge: 'Em Negociação',
    summary:
      'Paciente fez a avaliação e está em Em Negociação há 3+ dias sem responder. Dispara o follow-up de 3 dias, a paciente retorna perguntando sobre valor e recebe a lógica "R$ 0 no programa / R$ 670 avulsa".',
    detail:
      'Simula o follow-up da automação, o retorno da paciente e a resposta sobre a política de valores da avaliação.',
    buildSteps: (person: DemoPerson) => [
      {
        label: '3+ dias se passam após a avaliação, sem resposta',
        delayBefore: 400,
        journey: {
          type: 'anotacao',
          title: 'Avaliação realizada — aguardando decisão',
          description:
            'Avaliação concluída com o Dr. Guilherme. Programa montado em conjunto; paciente pediu tempo para decidir.',
          automatic: false,
        },
      },
      {
        label: 'Automação dispara o follow-up de 3 dias',
        outboundIsAuto: true,
        outbound:
          'Olá, {nome}! Passando para saber como você ficou após a avaliação com o Dr. Guilherme. Queremos muito te acompanhar na conquista do seu objetivo de viver com mais capacidade e sem dor. Ficou alguma dúvida sobre o plano que montamos juntos ou tem algo em que possamos te ajudar agora?',
      },
      {
        label: 'Follow-up registrado na automação',
        automationLog: {
          automationName: 'Follow-up de Negociação Pós-Avaliação',
          trigger: 'inatividade_negociacao_3dias',
          action: 'followup_negociacao_enviado',
          details: 'Follow-up de 3 dias em negociação enviado (demo).',
        },
        journey: {
          type: 'automacao',
          title: 'Automação Disparada: Follow-up de Negociação (3 dias)',
          description: 'Follow-up pós-avaliação enviado automaticamente após 3 dias sem retorno.',
          automatic: true,
        },
      },
      {
        label: 'Paciente retorna e pergunta sobre valor',
        delayBefore: 500,
        inbound:
          'Oi! Desculpa o sumiço, semana corrida. Ainda estou pensando… quanto custa o programa e a avaliação?',
      },
      {
        label: 'Resposta com a política de valores SOUL',
        outboundIsAuto: true,
        outbound:
          'Não se preocupe, {nome}, escolher com calma é importante e faz parte do cuidado! Sobre o valor, funciona assim: se você optar por seguir qualquer um dos programas que você e o Dr. Guilherme montarem, a avaliação tem custo zero para você. Caso prefira não seguir nenhum programa, o Dr. Guilherme entrega a avaliação completa em mãos, com toda a orientação técnica por escrito — nesse caso o investimento é de R$ 670. Me conta: faz sentido para você a gente retomar a conversa sobre o seu programa?',
      },
    ],
  },
]

// --- Execução de um cenário --------------------------------------------------

export interface ScenarioRunCallbacks {
  onStepStart?: (index: number, step: ScenarioStep) => void
  onStepDone?: (index: number, step: ScenarioStep) => void
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

function fill(text: string, person: DemoPerson): string {
  return text.replaceAll('{nome}', person.name.split(' ')[0])
}

export async function runScenario(
  scenario: ScenarioDefinition,
  callbacks?: ScenarioRunCallbacks,
): Promise<ScenarioResult> {
  const person = generatePerson()
  const steps = scenario.buildSteps(person)
  const events: { type: string; title: string; description: string }[] = []
  const nameParts = person.name.split(' ')

  // 1. Criar (ou reaproveitar) o paciente do cenário
  const patient = await crmService.createPatient({
    name: person.name,
    phone: person.phone,
    email: '',
    channel_origin: 'whatsapp',
    stage: 'primeiro_contato',
    tags: [],
    score: randInt(55, 95),
    notes: `[DEMO] Paciente fictício gerado pelo Cenário "${scenario.title}" para testes da jornada.`,
    responsible_id: pb.authStore.record?.id,
  })

  const conversationId = await ensureDemoConversation(patient)
  let currentStage: StageId = 'primeiro_contato'

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    callbacks?.onStepStart?.(i, step)
    if (step.delayBefore) await wait(step.delayBefore)

    // Mensagens
    if (step.inbound) {
      await appendMessage(conversationId, 'inbound', fill(step.inbound, person))
      // Simular atualização do preview da conversa para inbound
      try {
        await pb.collection('conversations').update(conversationId, {
          last_message_preview: fill(step.inbound, person),
          last_message_at: new Date().toISOString(),
          unread_count: 1,
        })
      } catch {
        /* intentionally ignored */
      }
    }
    if (step.outbound) {
      if (step.outboundIsAuto) {
        await appendAutoOutbound(conversationId, fill(step.outbound, person))
      } else {
        await appendMessage(conversationId, 'outbound', fill(step.outbound, person))
        try {
          await pb.collection('conversations').update(conversationId, {
            last_message_preview: fill(step.outbound, person),
            last_message_at: new Date().toISOString(),
          })
        } catch {
          /* intentionally ignored */
        }
      }
    }

    // Movimentação de estágio
    if (step.moveStage) {
      currentStage = step.moveStage
      await crmService.movePatientStage(
        patient.id,
        step.moveStage,
        step.moveStageTitle || `Movido para ${stageName(step.moveStage)}`,
      )
      if (step.moveStageDesc) {
        try {
          await pb.collection('journey_events').create({
            patient_id: patient.id,
            type: 'mudanca_estagio',
            stage: step.moveStage,
            title: step.moveStageTitle,
            description: step.moveStageDesc,
            responsible_id: pb.authStore.record?.id,
            is_automatic: true,
          })
        } catch {
          /* intentionally ignored */
        }
      }
    }

    // Eventos na jornada
    if (step.journey) {
      try {
        await pb.collection('journey_events').create({
          patient_id: patient.id,
          type: step.journey.type,
          stage: currentStage,
          title: fill(step.journey.title, person),
          description: fill(step.journey.description, person),
          responsible_id: pb.authStore.record?.id,
          is_automatic: !!step.journey.automatic,
        })
        events.push({
          type: step.journey.type,
          title: fill(step.journey.title, person),
          description: fill(step.journey.description, person),
        })
      } catch {
        /* intentionally ignored */
      }
    }

    // Log de automação
    if (step.automationLog) {
      const autoId = await findAutomationId(step.automationLog.automationName)
      try {
        await pb.collection('automation_logs').create({
          automation_id: autoId,
          patient_id: patient.id,
          trigger: step.automationLog.trigger,
          action: step.automationLog.action,
          status: 'sucesso',
          details: fill(step.automationLog.details, person),
        })
      } catch {
        /* intentionally ignored */
      }
    }

    callbacks?.onStepDone?.(i, step)
  }

  return {
    patientId: patient.id,
    patientName: person.name,
    conversationId,
    steps,
  }
}
