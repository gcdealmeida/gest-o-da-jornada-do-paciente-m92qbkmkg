import React, { useEffect, useState } from 'react'
import { crmService } from '@/services/crmService'
import type { TaskRecord, PatientRecord, UserRecord } from '@/types/crm'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, CheckCircle2, Clock, AlertTriangle, User, Trash2, Edit2, Filter } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Tasks() {
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [teamUsers, setTeamUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterPriority, setFilterPriority] = useState('todas')
  const [filterStatus, setFilterStatus] = useState('todos')

  // Create/Edit Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [patientId, setPatientId] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [priority, setPriority] = useState<'alta' | 'media' | 'baixa'>('media')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)

  const { toast } = useToast()

  const loadData = async () => {
    try {
      setLoading(true)
      const [tks, pts, users] = await Promise.all([
        crmService.getTasks(),
        crmService.getPatients(),
        crmService.getTeamUsers(),
      ])
      setTasks(tks)
      setPatients(pts)
      setTeamUsers(users)
      if (users.length > 0 && !assignedTo) {
        setAssignedTo(users[0].id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleToggle = async (task: TaskRecord) => {
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

  const handleDelete = async (id: string) => {
    try {
      await crmService.deleteTask(id)
      setTasks((prev) => prev.filter((t) => t.id !== id))
      toast({
        title: 'Tarefa excluída',
      })
    } catch (_) {
      toast({
        title: 'Erro ao excluir',
        variant: 'destructive',
      })
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    try {
      setSaving(true)
      if (editingTask) {
        const updated = await crmService.updateTask(editingTask.id, {
          title: title.trim(),
          description: desc.trim(),
          patient_id: patientId || undefined,
          assigned_to: assignedTo || undefined,
          priority,
          due_at: dueDate ? new Date(dueDate).toISOString() : undefined,
        })
        setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? updated : t)))
        toast({ title: 'Tarefa atualizada' })
      } else {
        const created = await crmService.createTask({
          title: title.trim(),
          description: desc.trim(),
          patient_id: patientId || undefined,
          assigned_to: assignedTo || undefined,
          priority,
          status: 'a_fazer',
          due_at: dueDate ? new Date(dueDate).toISOString() : undefined,
        })
        setTasks((prev) => [created, ...prev])
        toast({ title: 'Tarefa criada!' })
      }
      setModalOpen(false)
      resetForm()
    } catch (_) {
      toast({
        title: 'Erro ao salvar tarefa',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const openCreate = () => {
    resetForm()
    setModalOpen(true)
  }

  const openEdit = (task: TaskRecord) => {
    setEditingTask(task)
    setTitle(task.title)
    setDesc(task.description || '')
    setPatientId(task.patient_id || '')
    setAssignedTo(task.assigned_to || '')
    setPriority(task.priority)
    setDueDate(task.due_at ? task.due_at.split('T')[0] : '')
    setModalOpen(true)
  }

  const resetForm = () => {
    setEditingTask(null)
    setTitle('')
    setDesc('')
    setPatientId('')
    setPriority('media')
    setDueDate('')
  }

  // Grouping tasks
  const filtered = tasks.filter((t) => {
    const matchesPriority = filterPriority === 'todas' || t.priority === filterPriority
    const matchesStatus = filterStatus === 'todos' || t.status === filterStatus
    return matchesPriority && matchesStatus
  })

  const todoTasks = filtered.filter((t) => t.status === 'a_fazer')
  const doingTasks = filtered.filter((t) => t.status === 'em_andamento')
  const doneTasks = filtered.filter((t) => t.status === 'concluida')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Tarefas & Lembretes da Equipe
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Acompanhamento de follow-ups, contatos e pendências da jornada
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-teal-600 hover:bg-teal-700 text-white font-semibold"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Nova Tarefa
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5" />
          Filtros:
        </span>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="h-8 text-xs border-slate-200 w-[140px]">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas Prioridades</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 text-xs border-slate-200 w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Status</SelectItem>
            <SelectItem value="a_fazer">A Fazer</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="concluida">Concluídas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* A Fazer */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              A Fazer
            </h3>
            <Badge variant="secondary" className="text-xs">
              {todoTasks.length}
            </Badge>
          </div>
          <div className="space-y-2.5">{todoTasks.map((t) => renderTaskCard(t))}</div>
        </div>

        {/* Em Andamento */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              Em Andamento
            </h3>
            <Badge variant="secondary" className="text-xs">
              {doingTasks.length}
            </Badge>
          </div>
          <div className="space-y-2.5">{doingTasks.map((t) => renderTaskCard(t))}</div>
        </div>

        {/* Concluídas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Concluídas
            </h3>
            <Badge variant="secondary" className="text-xs">
              {doneTasks.length}
            </Badge>
          </div>
          <div className="space-y-2.5">{doneTasks.map((t) => renderTaskCard(t))}</div>
        </div>
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label>Título *</Label>
              <Input
                placeholder="Ex: Ligar para confirmar presença"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Detalhes ou instrução para a equipe..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Paciente Vinculado</Label>
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional" />
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
              <div className="space-y-1">
                <Label>Prioridade</Label>
                <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Data de Vencimento</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {saving ? 'Salvando...' : 'Salvar Tarefa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )

  function renderTaskCard(t: TaskRecord) {
    const isOverdue = t.due_at && new Date(t.due_at) < new Date() && t.status !== 'concluida'
    return (
      <Card
        key={t.id}
        className={`p-3.5 border transition-all ${
          isOverdue
            ? 'border-red-200 bg-red-50/40 shadow-xs'
            : t.status === 'concluida'
              ? 'border-slate-100 bg-slate-50/60 opacity-70'
              : 'border-slate-200/80 bg-white shadow-xs hover:border-teal-400'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <Checkbox
            checked={t.status === 'concluida'}
            onCheckedChange={() => handleToggle(t)}
            className="mt-0.5 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
          />
          <div className="flex-1 min-w-0">
            <p
              className={`text-xs font-bold leading-snug ${
                t.status === 'concluida' ? 'line-through text-slate-400' : 'text-slate-900'
              }`}
            >
              {t.title}
            </p>
            {t.description && (
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{t.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-1.5 mt-2.5 text-[10px]">
              <span
                className={`px-1.5 py-0.2 rounded font-semibold ${
                  t.priority === 'alta'
                    ? 'bg-red-100 text-red-700'
                    : t.priority === 'media'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-700'
                }`}
              >
                {t.priority.toUpperCase()}
              </span>

              {t.due_at && (
                <span
                  className={`flex items-center gap-1 ${
                    isOverdue ? 'text-red-600 font-bold' : 'text-slate-500'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  {new Date(t.due_at).toLocaleDateString('pt-BR')}
                </span>
              )}

              {t.expand?.patient_id && (
                <span className="text-teal-700 font-medium truncate max-w-[120px]">
                  • {t.expand.patient_id.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => openEdit(t)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDelete(t.id)}
              className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </Card>
    )
  }
}
