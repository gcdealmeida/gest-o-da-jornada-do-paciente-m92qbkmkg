import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { crmService } from '@/services/crmService'
import {
  STAGES,
  type PatientRecord,
  type AppointmentRecord,
  type TaskRecord,
  type AutomationLogRecord,
} from '@/types/crm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  MessageSquare,
  UserPlus,
  Target,
  Zap,
  TrendingUp,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Activity,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Index() {
  const { user } = useAuth()
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([])
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [logs, setLogs] = useState<AutomationLogRecord[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [pts, apps, tks, lgs] = await Promise.all([
          crmService.getPatients(),
          crmService.getAppointments(),
          crmService.getTasks(),
          crmService.getAutomationLogs(),
        ])
        setPatients(pts)
        setAppointments(apps)
        setTasks(tks)
        setLogs(lgs)
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  const todayFormatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  // KPIs
  const openConversationsCount = 6
  const newContacts7Days = patients.filter((p) => p.stage === 'primeiro_contato').length || 2
  const closedCount = patients.filter(
    (p) => p.stage === 'acompanhamento' || p.stage === 'fechamento_programa',
  ).length
  const totalCount = patients.length || 1
  const conversionRate = Math.round((closedCount / totalCount) * 100)
  const automationsTodayCount = logs.length || 8

  // Toggle task
  const handleToggleTask = async (task: TaskRecord) => {
    const newStatus = task.status === 'concluida' ? 'a_fazer' : 'concluida'
    try {
      const updated = await crmService.updateTask(task.id, {
        status: newStatus,
        completed_at: newStatus === 'concluida' ? new Date().toISOString() : undefined,
      })
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)))
      toast({
        title: newStatus === 'concluida' ? 'Tarefa concluída!' : 'Tarefa reaberta',
        description: task.title,
      })
    } catch (_) {
      toast({
        title: 'Erro ao atualizar tarefa',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Doutor(a)'}!
          </h1>
          <p className="text-sm text-slate-500 capitalize-first mt-0.5 font-medium">
            {todayFormatted}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-teal-50 border-teal-200 text-teal-800 px-3 py-1 text-xs"
          >
            <span className="w-2 h-2 rounded-full bg-teal-500 mr-2 animate-pulse" />
            CRM Ativo • Modo Demo
          </Badge>
          <Button asChild size="sm" className="bg-teal-600 hover:bg-teal-700 text-white">
            <Link to="/funnel">
              Ver Funil Completo
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* 4 Stat KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <Card className="card-hover border-slate-200/80 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Conversas Abertas
            </CardTitle>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {loading ? '--' : openConversationsCount}
            </div>
            <div className="flex items-center text-xs text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              <span>+18% em relação à semana passada</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2 */}
        <Card className="card-hover border-slate-200/80 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Novos Contatos (7d)
            </CardTitle>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {loading ? '--' : newContacts7Days}
            </div>
            <div className="flex items-center text-xs text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              <span>4 via WhatsApp • 2 Instagram</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3 */}
        <Card className="card-hover border-slate-200/80 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Taxa de Fechamento
            </CardTitle>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {loading ? '--' : `${conversionRate}%`}
            </div>
            <div className="flex items-center text-xs text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              <span>Meta da clínica: 35%</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4 */}
        <Card className="card-hover border-slate-200/80 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Automações Hoje
            </CardTitle>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {loading ? '--' : automationsTodayCount}
            </div>
            <div className="flex items-center text-xs text-purple-700 font-medium mt-1">
              <span className="w-2 h-2 rounded-full bg-purple-500 mr-1.5" />
              <span>100% de sucesso nas execuções</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Overview Bar */}
      <Card className="border-slate-200/80 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Visão Geral do Funil de Pacientes
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Distribuição atual dos pacientes ao longo da jornada
            </CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-teal-600 hover:text-teal-700">
            <Link to="/funnel" className="flex items-center gap-1 text-xs font-semibold">
              Abrir Kanban
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {STAGES.map((st) => {
              const count = patients.filter((p) => p.stage === st.id).length
              return (
                <Link
                  key={st.id}
                  to={`/funnel?stage=${st.id}`}
                  className="p-3 rounded-xl border border-slate-200/90 hover:border-teal-400 hover:bg-slate-50/80 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: st.color }}
                    />
                    <span className="text-xs font-bold text-slate-700 group-hover:text-teal-700">
                      {count}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 mt-2 truncate">{st.name}</p>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        backgroundColor: st.color,
                        width: `${Math.min(100, Math.max(10, (count / (patients.length || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Three Column Widgets: Agenda, Activity, Pending Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Agenda Card */}
        <Card className="border-slate-200/80 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-600" />
              <CardTitle className="text-sm font-bold text-slate-900">Agenda de Hoje</CardTitle>
            </div>
            <Link to="/agenda" className="text-xs font-semibold text-teal-600 hover:underline">
              Ver agenda
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {appointments.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                Nenhum compromisso agendado para hoje.
              </p>
            ) : (
              appointments.slice(0, 4).map((app) => (
                <div
                  key={app.id}
                  className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700">
                      {app.start_at
                        ? new Date(app.start_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '14:00'}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">
                        {app.expand?.patient_id?.name || 'Consulta Clínica'}
                      </p>
                      <p className="text-[11px] text-slate-500 capitalize">{app.type}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold ${
                      app.status === 'confirmado'
                        ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                        : 'border-amber-200 text-amber-700 bg-amber-50'
                    }`}
                  >
                    {app.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Automation Feed Card */}
        <Card className="border-slate-200/80 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-600" />
              <CardTitle className="text-sm font-bold text-slate-900">
                Atividades de Automação
              </CardTitle>
            </div>
            <Link
              to="/automations"
              className="text-xs font-semibold text-purple-600 hover:underline"
            >
              Ver todas
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {logs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                Nenhuma automação acionada ainda.
              </p>
            ) : (
              logs.slice(0, 4).map((log) => (
                <div key={log.id} className="flex items-start gap-2.5 text-xs">
                  <div className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">
                      {log.trigger.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {log.details || log.action}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">Hoje</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Pending Tasks Card */}
        <Card className="border-slate-200/80 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <CardTitle className="text-sm font-bold text-slate-900">Tarefas Pendentes</CardTitle>
            </div>
            <Link to="/tasks" className="text-xs font-semibold text-teal-600 hover:underline">
              Gerenciar
            </Link>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {tasks.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">Nenhuma tarefa pendente.</p>
            ) : (
              tasks.slice(0, 5).map((task) => {
                const isOverdue =
                  task.due_at && new Date(task.due_at) < new Date() && task.status !== 'concluida'
                return (
                  <div
                    key={task.id}
                    className={`p-2.5 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                      isOverdue
                        ? 'border-red-200 bg-red-50/40 text-red-900'
                        : task.status === 'concluida'
                          ? 'border-slate-100 bg-slate-50 text-slate-400 line-through'
                          : 'border-slate-100 bg-slate-50/60 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Checkbox
                        checked={task.status === 'concluida'}
                        onCheckedChange={() => handleToggleTask(task)}
                        className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                      />
                      <span className="text-xs font-medium truncate">{task.title}</span>
                    </div>
                    {isOverdue && (
                      <Badge variant="destructive" className="text-[9px] px-1.5 py-0 shrink-0">
                        Atrasada
                      </Badge>
                    )}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
