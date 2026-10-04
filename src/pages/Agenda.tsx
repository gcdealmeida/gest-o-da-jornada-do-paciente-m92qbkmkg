import React, { useEffect, useState } from 'react'
import { crmService } from '@/services/crmService'
import type { AppointmentRecord, PatientRecord, UserRecord } from '@/types/crm'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const TIME_SLOTS = [
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
]

export default function Agenda() {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([])
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [teamUsers, setTeamUsers] = useState<UserRecord[]>([])
  const [viewMode, setViewMode] = useState<'dia' | 'semana' | 'mes'>('semana')
  const [currentDate, setCurrentDate] = useState<Date>(new Date())

  // Appointment Modal
  const [createModal, setCreateModal] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [appType, setAppType] = useState<'avaliacao' | 'consulta' | 'retorno' | 'reuniao'>(
    'avaliacao',
  )
  const [appDate, setAppDate] = useState(new Date().toISOString().split('T')[0])
  const [appTime, setAppTime] = useState('14:00')
  const [appResponsible, setAppResponsible] = useState('')
  const [appNotes, setAppNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Detail Modal
  const [detailModal, setDetailModal] = useState(false)
  const [selectedApp, setSelectedApp] = useState<AppointmentRecord | null>(null)

  const { toast } = useToast()

  const loadData = async () => {
    try {
      const [apps, pts, users] = await Promise.all([
        crmService.getAppointments(),
        crmService.getPatients(),
        crmService.getTeamUsers(),
      ])
      setAppointments(apps)
      setPatients(pts)
      setTeamUsers(users)
      if (users.length > 0 && !appResponsible) {
        setAppResponsible(users[0].id)
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!appDate || !appTime) return

    try {
      setSaving(true)
      const startIso = new Date(`${appDate}T${appTime}:00`).toISOString()
      const endIso = new Date(new Date(startIso).getTime() + 45 * 60 * 1000).toISOString()

      await crmService.createAppointment({
        patient_id: selectedPatientId || undefined,
        type: appType,
        start_at: startIso,
        end_at: endIso,
        responsible_id: appResponsible || undefined,
        status: 'confirmado',
        notes: appNotes,
      })

      toast({
        title: 'Consulta agendada!',
        description: 'Notificação e lembrete automático ativados.',
      })

      setCreateModal(false)
      setAppNotes('')
      loadData()
    } catch (_) {
      toast({
        title: 'Erro ao agendar',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateStatus = async (status: AppointmentRecord['status']) => {
    if (!selectedApp) return
    try {
      await crmService.updateAppointment(selectedApp.id, { status })
      toast({
        title: 'Status atualizado',
        description: `Agendamento marcado como ${status}.`,
      })
      setDetailModal(false)
      loadData()
    } catch (_) {
      toast({
        title: 'Erro ao atualizar',
        variant: 'destructive',
      })
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'avaliacao':
        return 'bg-amber-100 text-amber-900 border-amber-300'
      case 'consulta':
        return 'bg-teal-100 text-teal-900 border-teal-300'
      case 'retorno':
        return 'bg-sky-100 text-sky-900 border-sky-300'
      default:
        return 'bg-purple-100 text-purple-900 border-purple-300'
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Agenda da Clínica</h1>
          <p className="text-sm text-slate-500 font-medium">
            Agendamento integrado de avaliações, retornos e sessões de acompanhamento
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggles */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            {(['dia', 'semana', 'mes'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-md font-semibold capitalize transition-all ${
                  viewMode === mode
                    ? 'bg-white text-teal-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <Button
            onClick={() => setCreateModal(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Horário
          </Button>
        </div>
      </div>

      {/* Date Navigation Bar */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
            className="text-xs font-semibold"
          >
            Hoje
          </Button>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentDate(new Date(currentDate.getTime() - 24 * 60 * 60 * 1000))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentDate(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <span className="text-sm font-bold text-slate-800 capitalize">
            {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            Avaliação
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
            Consulta
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            Retorno
          </span>
        </div>
      </div>

      {/* Calendar Grid View */}
      <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 divide-y divide-slate-100">
            {TIME_SLOTS.map((slot) => {
              // Find appointments matching slot hour
              const matchingApps = appointments.filter((a) => {
                if (!a.start_at) return false
                const d = new Date(a.start_at)
                const hour = d.getHours().toString().padStart(2, '0')
                return slot.startsWith(hour)
              })

              return (
                <div
                  key={slot}
                  className="flex min-h-[60px] group hover:bg-slate-50/50 transition-colors"
                >
                  <div className="w-20 sm:w-24 p-3 border-r border-slate-100 text-xs font-semibold text-slate-400 shrink-0 flex items-start justify-end">
                    {slot}
                  </div>
                  <div className="flex-1 p-2 flex flex-wrap gap-2 items-center">
                    {matchingApps.map((app) => (
                      <div
                        key={app.id}
                        onClick={() => {
                          setSelectedApp(app)
                          setDetailModal(true)
                        }}
                        className={`px-3 py-2 rounded-xl border text-xs cursor-pointer shadow-xs hover:shadow-md transition-all flex items-center gap-2 ${getTypeColor(
                          app.type,
                        )}`}
                      >
                        <Clock className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        <div>
                          <p className="font-bold leading-tight">
                            {app.expand?.patient_id?.name || 'Consulta'}
                          </p>
                          <p className="text-[10px] opacity-80 capitalize">
                            {app.type} • {app.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={detailModal} onOpenChange={setDetailModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4 pt-2 text-xs sm:text-sm">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Paciente:</span>
                  <span className="font-bold text-slate-900">
                    {selectedApp.expand?.patient_id?.name || 'Geral'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Tipo:</span>
                  <span className="font-semibold capitalize text-teal-700">{selectedApp.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Horário:</span>
                  <span className="font-semibold text-slate-900">
                    {new Date(selectedApp.start_at).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Status Atual:</span>
                  <Badge variant="outline" className="capitalize text-xs">
                    {selectedApp.status}
                  </Badge>
                </div>
              </div>

              {selectedApp.notes && (
                <div>
                  <span className="text-slate-500 text-xs font-semibold block mb-1">
                    Observações:
                  </span>
                  <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {selectedApp.notes}
                  </p>
                </div>
              )}

              <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUpdateStatus('cancelado')}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleUpdateStatus('confirmado')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Confirmar Presença
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Modal */}
      <Dialog open={createModal} onOpenChange={setCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAppointment} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label>Paciente</Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Tipo de Atendimento</Label>
                <Select value={appType} onValueChange={(val: any) => setAppType(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="avaliacao">Avaliação</SelectItem>
                    <SelectItem value="consulta">Consulta</SelectItem>
                    <SelectItem value="retorno">Retorno</SelectItem>
                    <SelectItem value="reuniao">Reunião</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Responsável</Label>
                <Select value={appResponsible} onValueChange={setAppResponsible}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teamUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={appDate}
                  onChange={(e) => setAppDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={appTime}
                  onChange={(e) => setAppTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Notas e Instruções</Label>
              <Input
                placeholder="Ex: Trazer exames anteriores de imagem"
                value={appNotes}
                onChange={(e) => setAppNotes(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateModal(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {saving ? 'Agendando...' : 'Confirmar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
