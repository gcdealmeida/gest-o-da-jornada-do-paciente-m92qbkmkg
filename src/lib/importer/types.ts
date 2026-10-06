// Tipos e definições de campos do sistema para importação de pacientes

export type SystemFieldKey =
  | 'name'
  | 'cpf'
  | 'birth_date'
  | 'gender'
  | 'phone'
  | 'email'
  | 'reason_for_visit'
  | 'has_pain'
  | 'pain_location'
  | 'practices_physical_activity'
  | 'physical_activities'
  | 'activity_frequency'
  | 'activity_duration'
  | 'diet_control'
  | 'street'
  | 'address_number'
  | 'complement'
  | 'neighborhood'
  | 'city'
  | 'state'
  | 'postal_code'
  | 'landmark'
  | 'referral_source'
  | 'referred_by'
  | 'notes'
  | 'created_at' // Carimbo de data/hora da planilha original (informativo)

export interface SystemFieldDefinition {
  key: SystemFieldKey
  label: string
  category: 'identificacao' | 'clinico' | 'contato' | 'endereco' | 'origem' | 'outros'
  required?: boolean
  description?: string
  aliases: string[]
}

export const SYSTEM_FIELDS: SystemFieldDefinition[] = [
  // 1. Identificação
  {
    key: 'name',
    label: 'Nome Completo',
    category: 'identificacao',
    required: true,
    description: 'Nome do paciente (obrigatório se telefone não estiver presente)',
    aliases: ['nome completo', 'nome', 'paciente', 'cliente', 'nome do paciente'],
  },
  {
    key: 'cpf',
    label: 'CPF',
    category: 'identificacao',
    description: 'Usado para deduplicação automática',
    aliases: ['cpf', 'doc', 'documento', 'cadastro de pessoa física'],
  },
  {
    key: 'birth_date',
    label: 'Data de Nascimento',
    category: 'identificacao',
    aliases: ['data de nascimento', 'nascimento', 'dt nascimento', 'd.n.'],
  },
  {
    key: 'gender',
    label: 'Gênero / Sexo',
    category: 'identificacao',
    aliases: ['gênero', 'genero', 'sexo'],
  },

  // 2. Contato
  {
    key: 'phone',
    label: 'WhatsApp / Telefone',
    category: 'contato',
    description: 'Normalizado com DDI +55 (obrigatório se nome não estiver presente)',
    aliases: [
      'fone / whatsapp',
      'fone/whatsapp',
      'whatsapp',
      'celular',
      'telefone',
      'contato',
      'fone',
    ],
  },
  {
    key: 'email',
    label: 'E-mail',
    category: 'contato',
    aliases: ['e-mail', 'email', 'correio eletrônico'],
  },

  // 3. Clínico & Estilo de Vida
  {
    key: 'reason_for_visit',
    label: 'Por que nos procurou? (Motivo)',
    category: 'clinico',
    aliases: ['por que nos procurou?', 'por que nos procurou', 'motivo', 'queixa', 'objetivo'],
  },
  {
    key: 'has_pain',
    label: 'Tem alguma dor ou incômodo?',
    category: 'clinico',
    aliases: [
      'tem alguma dor ou incômodo?',
      'tem alguma dor ou incômodo',
      'dor ou incomodo',
      'tem dor',
    ],
  },
  {
    key: 'pain_location',
    label: 'Local da dor / incômodo',
    category: 'clinico',
    aliases: [
      'caso tenha alguma dor ou incômodo, onde é?',
      'caso tenha dor, onde é?',
      'local da dor',
      'onde é a dor',
    ],
  },
  {
    key: 'practices_physical_activity',
    label: 'Pratica atividade física?',
    category: 'clinico',
    aliases: [
      'pratica alguma atividade física?',
      'pratica alguma atividade física',
      'atividade física',
    ],
  },
  {
    key: 'physical_activities',
    label: 'Quais atividades físicas?',
    category: 'clinico',
    aliases: [
      'qual (is)?',
      'quais atividades?',
      'quais atividades',
      'qual(is)?',
      'atividades praticadas',
    ],
  },
  {
    key: 'activity_frequency',
    label: 'Frequência semanal',
    category: 'clinico',
    aliases: [
      'com que frequência na semana pratica?',
      'frequência',
      'frequência semanal',
      'frequencia na semana',
    ],
  },
  {
    key: 'activity_duration',
    label: 'Duração média do treino',
    category: 'clinico',
    aliases: [
      'qual a duração em média por dia praticado?',
      'duração em média',
      'duração diária',
      'duracao media',
    ],
  },
  {
    key: 'diet_control',
    label: 'Faz dieta ou controle alimentar?',
    category: 'clinico',
    aliases: ['faz dieta ou algum controle alimentar?', 'dieta', 'controle alimentar', 'faz dieta'],
  },

  // 4. Endereço
  {
    key: 'street',
    label: 'Rua / Avenida',
    category: 'endereco',
    aliases: ['rua / avenida', 'rua/avenida', 'rua', 'logradouro', 'endereço', 'endereco'],
  },
  {
    key: 'address_number',
    label: 'Número',
    category: 'endereco',
    aliases: ['nº', 'no', 'numero', 'número'],
  },
  {
    key: 'complement',
    label: 'Complemento',
    category: 'endereco',
    aliases: ['complemento', 'compl'],
  },
  {
    key: 'neighborhood',
    label: 'Bairro',
    category: 'endereco',
    aliases: ['bairro'],
  },
  {
    key: 'city',
    label: 'Cidade',
    category: 'endereco',
    aliases: ['cidade', 'município'],
  },
  {
    key: 'state',
    label: 'Estado (UF)',
    category: 'endereco',
    aliases: ['estado (uf)', 'estado', 'uf'],
  },
  {
    key: 'postal_code',
    label: 'CEP',
    category: 'endereco',
    aliases: ['cep', 'código postal'],
  },
  {
    key: 'landmark',
    label: 'Ponto de Referência',
    category: 'endereco',
    aliases: ['ponto de referência', 'ponto de referencia', 'referência'],
  },

  // 5. Origem & Relacionamento
  {
    key: 'referral_source',
    label: 'Como conheceu a Clínica?',
    category: 'origem',
    aliases: [
      'como conheceu a clínica?',
      'como conheceu a clinica?',
      'como conheceu a clínica',
      'canal de origem',
      'origem',
    ],
  },
  {
    key: 'referred_by',
    label: 'Quem indicou?',
    category: 'origem',
    aliases: [
      'no caso de indicação, quem lhe indicou?',
      'no caso de indicacao, quem lhe indicou?',
      'quem indicou',
      'indicado por',
    ],
  },
  {
    key: 'notes',
    label: 'Observações Importantes',
    category: 'outros',
    aliases: [
      'utilize o espaço abaixo caso tenha alguma informação sobre você que seja importante sabermos. muito obrigado!',
      'observações importantes',
      'observações',
      'observacao',
      'notas',
    ],
  },
  {
    key: 'created_at',
    label: 'Carimbo de data/hora original',
    category: 'outros',
    aliases: ['carimbo de data/hora', 'carimbo de data e hora', 'timestamp', 'data do cadastro'],
  },
]

export interface ParsedSheet {
  headers: string[]
  rows: Record<string, unknown>[]
  totalRows: number
}

export type ColumnMapping = Record<string, SystemFieldKey | 'ignore'>

export interface ImportOptions {
  stage: import('@/types/crm').StageId
  dedupMode: 'update' | 'skip' // Atualizar existentes ou pular duplicados
  batchSize?: number
}

export interface ImportErrorDetail {
  rowNumber: number
  name?: string
  phone?: string
  reason: string
}

export interface ImportSummary {
  total: number
  created: number
  updated: number
  skipped: number
  errorsCount: number
  errors: ImportErrorDetail[]
  startTime: number
  endTime?: number
  stageUsed: import('@/types/crm').StageId
}
