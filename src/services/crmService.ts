import pb from '@/lib/pocketbase/client'
import type {
  PatientRecord,
  JourneyEventRecord,
  ConversationRecord,
  MessageRecord,
  TaskRecord,
  AppointmentRecord,
  AutomationRecord,
  AutomationLogRecord,
  UserRecord,
} from '@/types/crm'

export const crmService = {
  // Patients
  async getPatients(filter?: string, sort = '-updated'): Promise<PatientRecord[]> {
    const records = await pb.collection('patients').getFullList<PatientRecord>({
      filter,
      sort,
      expand: 'responsible_id',
    })
    return records
  },

  async getPatientById(id: string): Promise<PatientRecord> {
    return pb.collection('patients').getOne<PatientRecord>(id, {
      expand: 'responsible_id',
    })
  },

  async createPatient(data: Partial<PatientRecord>): Promise<PatientRecord> {
    const patient = await pb.collection('patients').create<PatientRecord>(data)
    // Automatically record first contact journey event
    try {
      await pb.collection('journey_events').create({
        patient_id: patient.id,
        type: 'contato_inicial',
        stage: patient.stage || 'primeiro_contato',
        title: 'Entrada na Jornada',
        description: `Paciente cadastrado via ${patient.channel_origin || 'whatsapp'}.`,
        responsible_id: patient.responsible_id || pb.authStore.record?.id,
        is_automatic: false,
      })
    } catch {
      /* intentionally ignored */
    }
    return patient
  },

  async updatePatient(id: string, data: Partial<PatientRecord>): Promise<PatientRecord> {
    return pb.collection('patients').update<PatientRecord>(id, data)
  },

  async movePatientStage(
    id: string,
    newStage: PatientRecord['stage'],
    title?: string,
  ): Promise<PatientRecord> {
    const patient = await pb.collection('patients').getOne<PatientRecord>(id)
    const oldStage = patient.stage
    const updated = await pb.collection('patients').update<PatientRecord>(id, {
      stage: newStage,
      last_contact_at: new Date().toISOString(),
    })

    // Record journey event
    try {
      await pb.collection('journey_events').create({
        patient_id: id,
        type: 'mudanca_estagio',
        stage: newStage,
        title: title || `Movido para ${newStage.replace(/_/g, ' ')}`,
        description: `Transição de estágio: ${oldStage} → ${newStage}`,
        responsible_id: pb.authStore.record?.id,
        is_automatic: false,
      })
    } catch {
      /* intentionally ignored */
    }

    return updated
  },

  async deletePatient(id: string): Promise<boolean> {
    return pb.collection('patients').delete(id)
  },

  // Journey Events
  async getJourneyEvents(patientId?: string): Promise<JourneyEventRecord[]> {
    const filter = patientId ? `patient_id = "${patientId}"` : ''
    return pb.collection('journey_events').getFullList<JourneyEventRecord>({
      filter,
      sort: '-created',
      expand: 'responsible_id,patient_id',
    })
  },

  async createJourneyEvent(data: Partial<JourneyEventRecord>): Promise<JourneyEventRecord> {
    return pb.collection('journey_events').create<JourneyEventRecord>(data)
  },

  // Conversations
  async getConversations(channel?: string): Promise<ConversationRecord[]> {
    const filter = channel && channel !== 'todos' ? `channel = "${channel}"` : ''
    return pb.collection('conversations').getFullList<ConversationRecord>({
      filter,
      sort: '-last_message_at',
      expand: 'patient_id',
    })
  },

  async getConversationById(id: string): Promise<ConversationRecord> {
    return pb.collection('conversations').getOne<ConversationRecord>(id, {
      expand: 'patient_id',
    })
  },

  async createConversation(data: Partial<ConversationRecord>): Promise<ConversationRecord> {
    return pb.collection('conversations').create<ConversationRecord>(data)
  },

  async markConversationRead(id: string): Promise<ConversationRecord> {
    return pb.collection('conversations').update<ConversationRecord>(id, {
      unread_count: 0,
    })
  },

  // Messages
  async getMessages(conversationId: string): Promise<MessageRecord[]> {
    return pb.collection('messages').getFullList<MessageRecord>({
      filter: `conversation_id = "${conversationId}"`,
      sort: 'created',
      expand: 'sent_by',
    })
  },

  async sendDemoMessage(conversationId: string, content: string): Promise<MessageRecord> {
    const res = await fetch(
      `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/whatsapp-demo/send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({ conversation_id: conversationId, content }),
      },
    )
    if (!res.ok) {
      // Fallback direct create if route has network trouble
      const msg = await pb.collection('messages').create<MessageRecord>({
        conversation_id: conversationId,
        sender: 'outbound',
        channel: 'whatsapp',
        content,
        sent_by: pb.authStore.record?.id,
        is_automatic: false,
      })
      await pb.collection('conversations').update(conversationId, {
        last_message_preview: content,
        last_message_at: new Date().toISOString(),
      })
      return msg
    }
    const data = await res.json()
    return data.message
  },

  async simulateInboundMessage(conversationId: string, content: string): Promise<MessageRecord> {
    const res = await fetch(
      `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/whatsapp-demo/reply`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({ conversation_id: conversationId, content }),
      },
    )
    if (!res.ok) {
      const msg = await pb.collection('messages').create<MessageRecord>({
        conversation_id: conversationId,
        sender: 'inbound',
        channel: 'whatsapp',
        content,
        is_automatic: false,
      })
      return msg
    }
    const data = await res.json()
    return data.message
  },

  // Tasks
  async getTasks(): Promise<TaskRecord[]> {
    return pb.collection('tasks').getFullList<TaskRecord>({
      sort: 'due_at,-created',
      expand: 'patient_id,assigned_to',
    })
  },

  async createTask(data: Partial<TaskRecord>): Promise<TaskRecord> {
    const task = await pb.collection('tasks').create<TaskRecord>(data)
    if (data.patient_id) {
      try {
        await pb.collection('journey_events').create({
          patient_id: data.patient_id,
          type: 'tarefa',
          title: `Tarefa Criada: ${data.title}`,
          description: data.description || 'Tarefa de acompanhamento atribuída.',
          responsible_id: data.assigned_to || pb.authStore.record?.id,
          is_automatic: false,
        })
      } catch {
        /* intentionally ignored */
      }
    }
    return task
  },

  async updateTask(id: string, data: Partial<TaskRecord>): Promise<TaskRecord> {
    return pb.collection('tasks').update<TaskRecord>(id, data)
  },

  async deleteTask(id: string): Promise<boolean> {
    return pb.collection('tasks').delete(id)
  },

  // Appointments
  async getAppointments(): Promise<AppointmentRecord[]> {
    return pb.collection('appointments').getFullList<AppointmentRecord>({
      sort: 'start_at',
      expand: 'patient_id,responsible_id',
    })
  },

  async createAppointment(data: Partial<AppointmentRecord>): Promise<AppointmentRecord> {
    const appRec = await pb.collection('appointments').create<AppointmentRecord>(data)
    if (data.patient_id) {
      try {
        await pb.collection('journey_events').create({
          patient_id: data.patient_id,
          type: 'agendamento',
          title: `Agendamento: ${data.type?.toUpperCase()}`,
          description: `Data: ${new Date(data.start_at || '').toLocaleString('pt-BR')}`,
          responsible_id: data.responsible_id || pb.authStore.record?.id,
          is_automatic: false,
        })
      } catch {
        /* intentionally ignored */
      }
    }
    return appRec
  },

  async updateAppointment(
    id: string,
    data: Partial<AppointmentRecord>,
  ): Promise<AppointmentRecord> {
    return pb.collection('appointments').update<AppointmentRecord>(id, data)
  },

  async deleteAppointment(id: string): Promise<boolean> {
    return pb.collection('appointments').delete(id)
  },

  // Automations
  async getAutomations(): Promise<AutomationRecord[]> {
    return pb.collection('automations').getFullList<AutomationRecord>({
      sort: 'name',
    })
  },

  async updateAutomation(id: string, data: Partial<AutomationRecord>): Promise<AutomationRecord> {
    return pb.collection('automations').update<AutomationRecord>(id, data)
  },

  async createAutomation(data: Partial<AutomationRecord>): Promise<AutomationRecord> {
    return pb.collection('automations').create<AutomationRecord>(data)
  },

  async getAutomationLogs(): Promise<AutomationLogRecord[]> {
    return pb.collection('automation_logs').getFullList<AutomationLogRecord>({
      sort: '-created',
      expand: 'automation_id,patient_id',
      limit: 50,
    })
  },

  // Users / Team
  async getTeamUsers(): Promise<UserRecord[]> {
    return pb.collection('users').getFullList<UserRecord>({
      sort: 'name',
    })
  },
}
