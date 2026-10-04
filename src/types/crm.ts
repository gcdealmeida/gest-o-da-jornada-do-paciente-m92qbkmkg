export type ChannelType = 'whatsapp' | 'instagram' | 'email' | 'outros'

export type StageId =
  | 'primeiro_contato'
  | 'avaliacao'
  | 'fechamento_programa'
  | 'acompanhamento'
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

export const STAGES: { id: StageId; name: string; color: string; description: string }[] = [
  {
    id: 'primeiro_contato',
    name: 'Primeiro Contato',
    color: '#94A3B8',
    description: 'Interesse inicial chegado por canais digitais',
  },
  {
    id: 'avaliacao',
    name: 'Avaliação',
    color: '#F59E0B',
    description: 'Consulta diagnóstica ou anamnese marcada/realizada',
  },
  {
    id: 'fechamento_programa',
    name: 'Fechamento de Programa',
    color: '#22C55E',
    description: 'Proposta e negociação do plano de cuidado',
  },
  {
    id: 'acompanhamento',
    name: 'Acompanhamento',
    color: '#06B6D4',
    description: 'Tratamento em andamento com sessões ativas',
  },
  {
    id: 'renovacao',
    name: 'Renovação',
    color: '#A855F7',
    description: 'Próximo do término de ciclo para continuidade',
  },
  {
    id: 'reativacao',
    name: 'Reativação',
    color: '#F43F5E',
    description: 'Pacientes em pausa ou inatividade prolongada',
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
