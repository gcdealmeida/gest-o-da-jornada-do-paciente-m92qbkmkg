export type ChannelType = 'whatsapp' | 'instagram' | 'email' | 'outros'

export type StageId =
  | 'lead_frio'
  | 'primeiro_contato'
  | 'agendamento'
  | 'monitoramento'
  | 'em_negociacao'
  | 'renovacao'
  | 'reativacao'

export type TagType = 'prioridade' | 'lead_quente' | 'retorno' | 'pausa' | 'vip'

export interface UserRecord {
  id: string
  email: string
  name?: string
  avatar?: string
  role?: 'Gestor' | 'Coordenador' | 'Recepcionista'
  created: string
  updated: string
}

export interface PatientRecord {
  id: string
  name: string
  phone?: string
  email?: string
  instagram?: string
  channel_origin: ChannelType
  stage: StageId
  responsible_id?: string
  tags?: TagType[]
  value_monthly?: number
  score?: number
  last_contact_at?: string
  notes?: string
  created: string
  updated: string
  expand?: {
    responsible_id?: UserRecord
  }
}

export interface JourneyEventRecord {
  id: string
  patient_id: string
  type:
    | 'contato_inicial'
    | 'mudanca_estagio'
    | 'automacao'
    | 'mensagem'
    | 'tarefa'
    | 'agendamento'
    | 'anotacao'
  stage?: StageId
  title: string
  description?: string
  responsible_id?: string
  is_automatic?: boolean
  metadata?: Record<string, unknown>
  created: string
  updated: string
  expand?: {
    responsible_id?: UserRecord
    patient_id?: PatientRecord
  }
}

export interface ConversationRecord {
  id: string
  patient_id?: string
  channel: ChannelType
  contact_identifier: string
  last_message_preview?: string
  last_message_at?: string
  unread_count?: number
  status: 'aberta' | 'fechada'
  created: string
  updated: string
  expand?: {
    patient_id?: PatientRecord
  }
}

export interface MessageRecord {
  id: string
  conversation_id: string
  sender: 'inbound' | 'outbound' | 'system'
  channel: ChannelType
  content: string
  sent_by?: string
  is_automatic?: boolean
  created: string
  updated: string
  expand?: {
    sent_by?: UserRecord
  }
}

export interface TaskRecord {
  id: string
  title: string
  description?: string
  patient_id?: string
  assigned_to?: string
  due_at?: string
  priority: 'alta' | 'media' | 'baixa'
  status: 'a_fazer' | 'em_andamento' | 'concluida'
  completed_at?: string
  created: string
  updated: string
  expand?: {
    patient_id?: PatientRecord
    assigned_to?: UserRecord
  }
}

export interface AppointmentRecord {
  id: string
  patient_id?: string
  type: 'avaliacao' | 'consulta' | 'retorno' | 'reuniao'
  start_at: string
  end_at: string
  responsible_id?: string
  status: 'confirmado' | 'pendente' | 'concluido' | 'cancelado'
  notes?: string
  created: string
  updated: string
  expand?: {
    patient_id?: PatientRecord
    responsible_id?: UserRecord
  }
}

export interface AutomationRecord {
  id: string
  name: string
  trigger_type:
    | 'novo_contato'
    | 'mudanca_estagio'
    | 'inatividade'
    | 'consulta_agendada'
    | 'data_proxima'
  trigger_config: Record<string, unknown>
  action_type:
    | 'enviar_mensagem'
    | 'mover_funil'
    | 'criar_tarefa'
    | 'criar_lembrete'
    | 'notificar_membro'
  action_config: Record<string, unknown>
  message_template?: string
  enabled: boolean
  created: string
  updated: string
}

export interface AutomationLogRecord {
  id: string
  automation_id?: string
  patient_id?: string
  trigger: string
  action: string
  status: 'sucesso' | 'falha'
  details?: string
  created: string
  updated: string
  expand?: {
    automation_id?: AutomationRecord
    patient_id?: PatientRecord
  }
}

export const STAGES: {
  id: StageId
  name: string
  color: string
  bgLight: string
  borderLight: string
  description: string
  detail: string
}[] = [
  {
    id: 'lead_frio',
    name: 'Lead Frio',
    color: '#64748B', // tom frio cinza-azulado
    bgLight: 'bg-slate-50',
    borderLight: 'border-slate-300',
    description: 'Sem resposta há muito tempo, sem continuidade',
    detail:
      'Aquele lead que não responde há muito tempo, não retornou as mensagens, não deu continuidade ao processo, está há muito tempo sem retorno.',
  },
  {
    id: 'primeiro_contato',
    name: 'Primeiro Contato',
    color: '#0284C7', // azul
    bgLight: 'bg-sky-50',
    borderLight: 'border-sky-200',
    description: 'Prospect inicial para converter em paciente',
    detail:
      'Prospect (a pessoa que ainda não é paciente, não tem horário conosco e não tem cadastro ainda) entra em contato / primeiro contato — nesse primeiro momento o objetivo é converter esse prospect em paciente, ou seja, agendamento de avaliação (chegada).',
  },
  {
    id: 'agendamento',
    name: 'Agendamento',
    color: '#0D9488', // teal
    bgLight: 'bg-teal-50',
    borderLight: 'border-teal-200',
    description: 'Conversão ativa para agendar a avaliação',
    detail: 'Agendamento de Avaliação — conversar e tentar converter até conseguir agendar.',
  },
  {
    id: 'monitoramento',
    name: 'Monitoramento',
    color: '#D97706', // âmbar
    bgLight: 'bg-amber-50',
    borderLight: 'border-amber-200',
    description: 'Até o dia da avaliação: confirmar presença ou falta',
    detail: 'Até o dia da avaliação — confirmar se o paciente veio ou não (faltou ou desmarcou).',
  },
  {
    id: 'em_negociacao',
    name: 'Em Negociação',
    color: '#2563EB', // azul royal / negociação
    bgLight: 'bg-blue-50',
    borderLight: 'border-blue-200',
    description: 'Pós-avaliação: confirmação do programa',
    detail:
      'Após a avaliação, monitorar tempo de retorno sobre a confirmação de qual programa de tratamento irá seguir. Se não for seguir, descobrir o porquê e redirecionar para a última etapa, Reativação.',
  },
  {
    id: 'renovacao',
    name: 'Renovação',
    color: '#7C3AED', // roxo/violeta
    bgLight: 'bg-purple-50',
    borderLight: 'border-purple-200',
    description: 'Menos de 30 dias para fim do programa',
    detail:
      'Clientes que estão a menos de 30 dias de finalizar o processo/programa de tratamento. Fomentar: como está, se seus problemas e dificuldades foram sanados, e sugerir criar processo contínuo de cuidado com a saúde, minimizando possíveis complicações futuras e melhorando qualidade de vida.',
  },
  {
    id: 'reativacao',
    name: 'Reativação',
    color: '#E11D48', // tom de alerta/oportunidade carmim/rosa choque
    bgLight: 'bg-rose-50',
    borderLight: 'border-rose-300',
    description: 'Não renovou ou não agendou: oportunidade de venda',
    detail:
      'Todo cliente que não renova, ou não fez agendamento mas mostrou interesse em algum momento — existe oportunidade aqui para vender o programa.',
  },
]

export const CHANNEL_CONFIG: Record<ChannelType, { name: string; color: string; bg: string }> = {
  whatsapp: { name: 'WhatsApp', color: '#25D366', bg: 'bg-[#25D366]/10 text-[#1E9A4B]' },
  instagram: { name: 'Instagram', color: '#E1306C', bg: 'bg-[#E1306C]/10 text-[#C13584]' },
  email: { name: 'E-mail', color: '#3B82F6', bg: 'bg-[#3B82F6]/10 text-[#2563EB]' },
  outros: { name: 'Outros', color: '#64748B', bg: 'bg-[#64748B]/10 text-[#475569]' },
}

export const TAGS_CONFIG: Record<TagType, { label: string; color: string; bg: string }> = {
  prioridade: {
    label: 'Prioridade',
    color: '#DC2626',
    bg: 'bg-red-50 text-red-700 border-red-200',
  },
  lead_quente: {
    label: 'Lead Quente',
    color: '#EA580C',
    bg: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  vip: { label: 'VIP', color: '#7C3AED', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
  retorno: { label: 'Retorno', color: '#0284C7', bg: 'bg-sky-50 text-sky-700 border-sky-200' },
  pausa: {
    label: 'Em Pausa',
    color: '#64748B',
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
  },
}
