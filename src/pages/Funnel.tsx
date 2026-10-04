import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { crmService } from '@/services/crmService'
import {
  STAGES,
  CHANNEL_CONFIG,
  TAGS_CONFIG,
  type PatientRecord,
  type StageId,
  type UserRecord,
} from '@/types/crm'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  DollarSign,
  Calendar,
  MessageCircle,
  Sparkles,
  UserCheck,
  ChevronRight,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Funnel() {
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [teamUsers, setTeamUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterResponsible, setFilterResponsible] = useState('todos')
  const [filterTag, setFilterTag] = useState('todas')

  // Drag and drop state
  const [draggedPatientId, setDraggedPatientId] = useState<string | null>(null)

  // New patient modal
  const [newPatientModal, setNewPatientModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newStage, setNewStage] = useState<StageId>('primeiro_contato')
  const [newResponsible, setNewResponsible] = useState('')
  const [newMonthlyValue, setNewMonthlyValue] = useState('')
  const [creating, setCreating] = useState(false)

  const { toast } = useToast()
  const navigate = useNavigate()

  const loadData = async () => {
    try {
      setLoading(true)
      const [pts, users] = await Promise.all([crmService.getPatients(), crmService.getTeamUsers()])
      setPatients(pts)
      setTeamUsers(users)
      if (users.length > 0 && !newResponsible) {
        setNewResponsible(users[0].id)
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

  // Filtered patients
  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.phone && p.phone.includes(searchTerm)) ||
      (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesResponsible =
      filterResponsible === 'todos' || p.responsible_id === filterResponsible

    const matchesTag = filterTag === 'todas' || (p.tags && p.tags.includes(filterTag as any))

    return matchesSearch && matchesResponsible && matchesTag
  })

  // Handle Drag & Drop
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
    setDraggedPatientId(id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetStage: StageId) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain') || draggedPatientId
    if (!id) return

    const patient = patients.find((p) => p.id === id)
    if (!patient || patient.stage === targetStage) {
      setDraggedPatientId(null)
      return
    }

    const stageObj = STAGES.find((s) => s.id === targetStage)
    const stageName = stageObj?.name || targetStage

    // Optimistic update
    setPatients((prev) => prev.map((p) => (p.id === id ? { ...p, stage: targetStage } : p)))

    try {
      await crmService.movePatientStage(id, targetStage, `${patient.name} movido para ${stageName}`)
      toast({
        title: 'Estágio atualizado',
        description: `${patient.name} movido para ${stageName}`,
      })
    } catch (_) {
      toast({
        title: 'Erro ao mover paciente',
        variant: 'destructive',
      })
      loadData()
    } finally {
      setDraggedPatientId(null)
    }
  }

  // Ação rápida: Quando paciente em negociação não for seguir -> mover para Reativação com justificativa
  const handleMoveToReactivation = async (e: React.MouseEvent, patient: PatientRecord) => {
    e.stopPropagation()
    const confirmMove = window.confirm(
      `Mover ${patient.name} para "Reativação" por não seguir com o programa de tratamento?`,
    )
    if (!confirmMove) return

    setPatients((prev) =>
      prev.map((p) => (p.id === patient.id ? { ...p, stage: 'reativacao' } : p)),
    )

    try {
      await crmService.movePatientStage(
        patient.id,
        'reativacao',
        `${patient.name} direcionado para Reativação (não seguiu proposta)`,
      )
      toast({
        title: 'Redirecionado para Reativação',
        description: `${patient.name} está disponível para nova oportunidade no funil.`,
      })
    } catch (_) {
      toast({
        title: 'Erro ao mover para Reativação',
        variant: 'destructive',
      })
      loadData()
    }
  }

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    try {
      setCreating(true)
      const created = await crmService.createPatient({
        name: newName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim(),
        stage: newStage,
        responsible_id: newResponsible,
        channel_origin: 'whatsapp',
        value_monthly: Number(newMonthlyValue) || 0,
        score: 75,
        tags: ['lead_quente'],
      })

      toast({
        title: 'Paciente cadastrado!',
        description: `${created.name} foi adicionado ao funil.`,
      })

      setNewPatientModal(false)
      setNewName('')
      setNewPhone('')
      setNewEmail('')
      setNewMonthlyValue('')
      loadData()
    } catch (_) {
      toast({
        title: 'Erro no cadastro',
        description: 'Não foi possível cadastrar o paciente.',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Funil da Jornada</h1>
            <Badge
              variant="outline"
              className="bg-teal-50 border-teal-200 text-teal-800 text-xs font-semibold"
            >
              7 Estágios Ativos
            </Badge>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Jornada completa: Lead Frio até Reativação. Arraste os pacientes entre os estágios para
            registrar evolução.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setNewPatientModal(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm shadow-teal-600/20"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Adicionar Paciente
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Filtrar por nome, telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs sm:text-sm border-slate-200 focus-visible:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Responsible filter */}
          <Select value={filterResponsible} onValueChange={setFilterResponsible}>
            <SelectTrigger className="h-9 text-xs border-slate-200 w-full sm:w-[170px]">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Responsáveis</SelectItem>
              {teamUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Tag filter */}
          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger className="h-9 text-xs border-slate-200 w-full sm:w-[140px]">
              <SelectValue placeholder="Etiqueta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas Etiquetas</SelectItem>
              <SelectItem value="lead_quente">Lead Quente</SelectItem>
              <SelectItem value="prioridade">Prioridade</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
              <SelectItem value="retorno">Retorno</SelectItem>
              <SelectItem value="pausa">Pausa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Kanban Board Container with horizontal scroll */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 min-h-[640px] items-start">
        {STAGES.map((st) => {
          const stagePatients = filteredPatients.filter((p) => p.stage === st.id)
          const totalValue = stagePatients.reduce((acc, curr) => acc + (curr.value_monthly || 0), 0)

          return (
            <div
              key={st.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, st.id)}
              className="w-[280px] sm:w-[300px] shrink-0 bg-slate-100/70 rounded-2xl p-3 border border-slate-200/80 flex flex-col max-h-[750px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: st.color }}
                  />
                  <div className="min-w-0">
                    <h3 className="text-xs font-extrabold text-slate-800 truncate uppercase tracking-wider">
                      {st.name}
                    </h3>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-white text-slate-700 text-xs font-bold px-2 shadow-xs"
                >
                  {stagePatients.length}
                </Badge>
              </div>

              {/* Stage Subtitle/Help */}
              <div className="mb-2 text-[10px] text-slate-500 leading-tight line-clamp-2 px-1">
                {st.description}
              </div>

              {/* Monthly value sum when applicable */}
              {totalValue > 0 && (
                <div className="mb-2 px-2 py-1 bg-white/70 rounded-md text-[11px] font-semibold text-emerald-700 flex items-center justify-between border border-emerald-100">
                  <span>Valor em carteira:</span>
                  <span>R$ {totalValue.toLocaleString('pt-BR')}/mês</span>
                </div>
              )}

              {/* Cards List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[120px]">
                {stagePatients.length === 0 ? (
                  <div className="h-28 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-xs text-slate-400">
                    Solte pacientes aqui
                  </div>
                ) : (
                  stagePatients.map((p) => {
                    const channel = CHANNEL_CONFIG[p.channel_origin || 'whatsapp']
                    return (
                      <Card
                        key={p.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, p.id)}
                        onClick={() => navigate(`/patients/${p.id}`)}
                        className="p-3.5 bg-white border-slate-200/80 shadow-xs hover:shadow-md hover:border-teal-400 transition-all cursor-grab active:cursor-grabbing group relative select-none"
                      >
                        {/* Top: Avatar initials & Name */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center border border-teal-200 shrink-0">
                              {p.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 group-hover:text-teal-700 transition-colors truncate">
                                {p.name}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {p.phone || 'Sem telefone'}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${channel.bg}`}
                          >
                            {channel.name}
                          </span>
                        </div>

                        {/* Middle Tags & Value */}
                        <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                          {p.tags?.map((t) => {
                            const tagCfg = TAGS_CONFIG[t]
                            if (!tagCfg) return null
                            return (
                              <span
                                key={t}
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${tagCfg.bg}`}
                              >
                                {tagCfg.label}
                              </span>
                            )
                          })}

                          {p.value_monthly && p.value_monthly > 0 ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5">
                              <DollarSign className="w-3 h-3" />
                              R$ {p.value_monthly}/mês
                            </span>
                          ) : null}
                        </div>

                        {/* Action buttons on card: quick action for Em Negociação */}
                        {st.id === 'em_negociacao' && (
                          <div className="mt-2 pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={(e) => handleMoveToReactivation(e, p)}
                              className="w-full text-[10px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md py-1 px-1.5 flex items-center justify-center gap-1 transition-colors"
                              title="Se o paciente não for seguir o tratamento, mover diretamente para Reativação"
                            >
                              <span>Não seguiu proposta → Reativação</span>
                            </button>
                          </div>
                        )}

                        {/* Bottom: Responsible & Action arrow */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <div className="flex items-center gap-1.5 truncate">
                            <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[9px] font-bold">
                              {p.expand?.responsible_id?.name
                                ? p.expand.responsible_id.name[0]
                                : 'E'}
                            </div>
                            <span className="truncate">
                              {p.expand?.responsible_id?.name?.split(' ')[0] || 'Equipe'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-teal-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                            <span>Ver Jornada</span>
                            <ChevronRight className="w-3 h-3" />
                          </div>
                        </div>
                      </Card>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Patient Modal */}
      <Dialog open={newPatientModal} onOpenChange={setNewPatientModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Paciente na Jornada</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePatient} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Nome Completo *</Label>
              <Input
                placeholder="Ex: Amanda Silveira"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>WhatsApp</Label>
                <Input
                  placeholder="+55 11 98888-0000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  placeholder="paciente@email.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Estágio Inicial</Label>
                <Select value={newStage} onValueChange={(val: StageId) => setNewStage(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Responsável</Label>
                <Select value={newResponsible} onValueChange={setNewResponsible}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
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

            <div className="space-y-1.5">
              <Label>Valor Mensal do Programa (R$)</Label>
              <Input
                type="number"
                placeholder="Ex: 1200"
                value={newMonthlyValue}
                onChange={(e) => setNewMonthlyValue(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setNewPatientModal(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold"
              >
                {creating ? 'Salvando...' : 'Cadastrar Paciente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
