import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { crmService } from '@/services/crmService'
import {
  STAGES,
  TAGS_CONFIG,
  type PatientRecord,
  type JourneyEventRecord,
  type TaskRecord,
  type AppointmentRecord,
} from '@/types/crm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare,
  Calendar,
  CheckSquare,
  ArrowLeft,
  Bot,
  User,
  Clock,
  Sparkles,
  Phone,
  Mail,
  Instagram,
  FileText,
  Activity,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react'

export default function PatientJourney() {
  const { id } = useParams<{ id: string }>()
  const [patient, setPatient] = useState<PatientRecord | null>(null)
  const [events, setEvents] = useState<JourneyEventRecord[]>([])
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([])
  const [loading, setLoading] = useState(true)

  const navigate = useNavigate()

  useEffect(() => {
    if (!id) return
    async function loadData() {
      try {
        setLoading(true)
        const [p, evs, tks, apps] = await Promise.all([
          crmService.getPatientById(id!),
          crmService.getJourneyEvents(id!),
          crmService.getTasks(),
          crmService.getAppointments(),
        ])
        setPatient(p)
        setEvents(evs)
        setTasks(tks.filter((t) => t.patient_id === id))
        setAppointments(apps.filter((a) => a.patient_id === id))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  if (loading || !patient) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        Carregando jornada do paciente...
      </div>
    )
  }

  const currentStageIndex = STAGES.findIndex((s) => s.id === patient.stage)

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8 text-slate-500"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-800 font-bold text-base flex items-center justify-center border border-teal-200 shrink-0">
            {patient.name.slice(0, 2).toUpperCase()}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {patient.name}
              </h1>
              <Badge className="bg-teal-50 text-teal-800 border-teal-200 text-xs font-semibold capitalize">
                {patient.stage.replace(/_/g, ' ')}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Responsável:{' '}
              <span className="font-semibold text-slate-700">
                {patient.expand?.responsible_id?.name || 'Equipe Geral'}
              </span>
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => navigate('/conversations')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            <MessageSquare className="w-4 h-4 mr-1.5" />
            Abrir Conversa
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/agenda')}
            className="text-slate-700 font-semibold"
          >
            <Calendar className="w-4 h-4 mr-1.5 text-sky-600" />
            Agendar
          </Button>
        </div>
      </div>

      {/* Horizontal 6-Step Progress Stepper */}
      <Card className="border-slate-200 bg-white shadow-sm p-4">
        <div className="relative flex items-center justify-between">
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-200 -z-0" />
          {STAGES.map((s, idx) => {
            const isCompleted = idx < currentStageIndex
            const isCurrent = idx === currentStageIndex

            return (
              <div key={s.id} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-xs ${
                    isCurrent
                      ? 'bg-teal-600 text-white ring-4 ring-teal-100 animate-pulse-ring'
                      : isCompleted
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white border-2 border-slate-300 text-slate-400'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                </div>
                <span
                  className={`text-[11px] font-bold mt-2 text-center max-w-[80px] hidden sm:block ${
                    isCurrent ? 'text-teal-700 font-extrabold' : 'text-slate-500'
                  }`}
                >
                  {s.name}
                </span>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Content Grid: Timeline on left, Context on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Step-by-Step Vertical Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-600" />
              Linha do Tempo da Jornada
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {events.length} eventos registrados
            </span>
          </div>

          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {events.length === 0 ? (
              <p className="text-xs text-slate-400 py-6">
                Nenhum evento registrado nesta jornada ainda.
              </p>
            ) : (
              events.map((ev) => (
                <div key={ev.id} className="relative group">
                  {/* Dot */}
                  <div
                    className={`absolute -left-[27px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-xs ${
                      ev.is_automatic ? 'bg-purple-600 text-white' : 'bg-teal-600 text-white'
                    }`}
                  >
                    {ev.is_automatic ? (
                      <Bot className="w-3.5 h-3.5" />
                    ) : (
                      <User className="w-3.5 h-3.5" />
                    )}
                  </div>

                  <Card className="p-4 border-slate-200/90 bg-white shadow-xs hover:border-teal-400 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                            {ev.title}
                          </h4>
                          {ev.is_automatic && (
                            <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[9px] font-bold">
                              Automação
                            </Badge>
                          )}
                        </div>
                        {ev.description && (
                          <p className="text-xs text-slate-600 whitespace-pre-wrap">
                            {ev.description}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0">
                        {new Date(ev.created).toLocaleString('pt-BR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                  </Card>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Rail: Patient Data, Open Tasks, Appointments */}
        <div className="space-y-4">
          {/* Contact Card */}
          <Card className="border-slate-200 bg-white shadow-sm p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Dados do Contato
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{patient.phone || 'Sem telefone'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{patient.email || 'Sem e-mail'}</span>
              </div>
              {patient.instagram && (
                <div className="flex items-center gap-2 text-slate-700">
                  <Instagram className="w-4 h-4 text-slate-400" />
                  <span>{patient.instagram}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1">
              {patient.tags?.map((t) => {
                const tagCfg = TAGS_CONFIG[t]
                return (
                  <span
                    key={t}
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                      tagCfg ? tagCfg.bg : 'bg-slate-100'
                    }`}
                  >
                    {tagCfg ? tagCfg.label : t}
                  </span>
                )
              })}
            </div>
          </Card>

          {/* Open Tasks for this patient */}
          <Card className="border-slate-200 bg-white shadow-sm p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tarefas do Paciente
            </h4>
            {tasks.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhuma tarefa pendente vinculada.</p>
            ) : (
              tasks.map((t) => (
                <div
                  key={t.id}
                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1"
                >
                  <p className="font-semibold text-slate-800">{t.title}</p>
                  <p className="text-[10px] text-slate-500">Prioridade: {t.priority}</p>
                </div>
              ))
            )}
          </Card>

          {/* Upcoming Appointments */}
          <Card className="border-slate-200 bg-white shadow-sm p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Agendamentos
            </h4>
            {appointments.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhum compromisso agendado.</p>
            ) : (
              appointments.map((a) => (
                <div
                  key={a.id}
                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1"
                >
                  <div className="flex justify-between">
                    <span className="font-bold text-teal-700 capitalize">{a.type}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {a.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    {new Date(a.start_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
