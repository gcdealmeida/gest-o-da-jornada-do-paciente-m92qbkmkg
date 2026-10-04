import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { crmService } from '@/services/crmService'
import {
  STAGES,
  CHANNEL_CONFIG,
  TAGS_CONFIG,
  type PatientRecord,
  type StageId,
  type UserRecord,
} from '@/types/crm'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  MessageSquare,
  Calendar,
  CheckSquare,
  MoreVertical,
  ChevronRight,
  ExternalLink,
  Phone,
  Mail,
  Instagram,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Patients() {
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [teamUsers, setTeamUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Search & Filters
  const [searchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  const [search, setSearch] = useState(initialQuery)
  const [selectedStage, setSelectedStage] = useState('todos')
  const [selectedChannel, setSelectedChannel] = useState('todos')

  // Drawer detail state
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Create Modal
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newInsta, setNewInsta] = useState('')
  const [newStage, setNewStage] = useState<StageId>('primeiro_contato')
  const [newChannel, setNewChannel] = useState<'whatsapp' | 'instagram' | 'email' | 'outros'>(
    'whatsapp',
  )
  const [newResponsible, setNewResponsible] = useState('')
  const [saving, setSaving] = useState(false)

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    try {
      setSaving(true)
      const created = await crmService.createPatient({
        name: newName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim(),
        instagram: newInsta.trim(),
        stage: newStage,
        channel_origin: newChannel,
        responsible_id: newResponsible || undefined,
        tags: ['lead_quente'],
        score: 80,
      })

      toast({
        title: 'Paciente cadastrado!',
        description: created.name,
      })
      setCreateOpen(false)
      setNewName('')
      setNewPhone('')
      setNewEmail('')
      setNewInsta('')
      loadData()
    } catch (_) {
      toast({
        title: 'Erro ao cadastrar',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase()
    const matchSearch =
      p.name.toLowerCase().includes(q) ||
      (p.phone && p.phone.includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q))
    const matchStage = selectedStage === 'todos' || p.stage === selectedStage
    const matchChannel = selectedChannel === 'todos' || p.channel_origin === selectedChannel
    return matchSearch && matchStage && matchChannel
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Carteira de Pacientes
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Gerenciamento individual, histórico de contatos e controle de jornada
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white font-semibold"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Novo Paciente
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome, telefone ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs sm:text-sm border-slate-200"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={selectedStage} onValueChange={setSelectedStage}>
            <SelectTrigger className="h-9 text-xs border-slate-200 w-[160px]">
              <SelectValue placeholder="Estágio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Estágios</SelectItem>
              {STAGES.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedChannel} onValueChange={setSelectedChannel}>
            <SelectTrigger className="h-9 text-xs border-slate-200 w-[140px]">
              <SelectValue placeholder="Canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Canais</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="email">E-mail</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Paciente</th>
                  <th className="py-3 px-4">Estágio Atual</th>
                  <th className="py-3 px-4">Responsável</th>
                  <th className="py-3 px-4">Origem / Canal</th>
                  <th className="py-3 px-4">Telefone</th>
                  <th className="py-3 px-4">Etiquetas</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      Nenhum paciente encontrado com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const st = STAGES.find((s) => s.id === p.stage)
                    const channelCfg = CHANNEL_CONFIG[p.channel_origin || 'whatsapp']

                    return (
                      <tr
                        key={p.id}
                        onClick={() => {
                          setSelectedPatient(p)
                          setDrawerOpen(true)
                        }}
                        className="hover:bg-teal-50/40 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
                              {p.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{p.name}</p>
                              <p className="text-[11px] text-slate-400">
                                {p.email || 'Sem e-mail'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                            style={{ backgroundColor: `${st?.color}20`, color: st?.color }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: st?.color }}
                            />
                            {st?.name || p.stage}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {p.expand?.responsible_id?.name || 'Equipe Geral'}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${channelCfg.bg}`}
                          >
                            {channelCfg.name}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                          {p.phone || '-'}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {p.tags?.map((t) => {
                              const tagCfg = TAGS_CONFIG[t]
                              return (
                                <span
                                  key={t}
                                  className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${
                                    tagCfg ? tagCfg.bg : 'bg-slate-100'
                                  }`}
                                >
                                  {tagCfg ? tagCfg.label : t}
                                </span>
                              )
                            })}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/patients/${p.id}`)}
                            className="text-xs text-teal-600 hover:text-teal-700 font-semibold h-7 px-2"
                          >
                            Ver Jornada
                            <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedPatient && (
            <div className="space-y-6 pt-4">
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-800 font-bold text-sm flex items-center justify-center border border-teal-200">
                    {selectedPatient.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <SheetTitle className="text-base font-bold text-slate-900">
                      {selectedPatient.name}
                    </SheetTitle>
                    <p className="text-xs text-slate-500 capitalize">
                      {selectedPatient.stage.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              </SheetHeader>

              {/* Quick Contact Info */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{selectedPatient.phone || 'Sem telefone'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>{selectedPatient.email || 'Sem e-mail cadastrado'}</span>
                </div>
                {selectedPatient.instagram && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <Instagram className="w-4 h-4 text-slate-400" />
                    <span>{selectedPatient.instagram}</span>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <Button
                  onClick={() => navigate(`/patients/${selectedPatient.id}`)}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                >
                  Abrir Linha do Tempo da Jornada
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/conversations`)}
                  className="w-full text-slate-700"
                >
                  <MessageSquare className="w-4 h-4 mr-2 text-emerald-600" />
                  Abrir Conversa WhatsApp
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/agenda`)}
                  className="w-full text-slate-700"
                >
                  <Calendar className="w-4 h-4 mr-2 text-sky-600" />
                  Agendar Consulta
                </Button>
              </div>

              {selectedPatient.notes && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-700 mb-1">
                    Notas de Relacionamento
                  </h4>
                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {selectedPatient.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Paciente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label>Nome Completo *</Label>
              <Input
                placeholder="Ex: Vanessa Guimarães"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>WhatsApp</Label>
                <Input
                  placeholder="+55 11 98888-7777"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Instagram</Label>
                <Input
                  placeholder="@perfil"
                  value={newInsta}
                  onChange={(e) => setNewInsta(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>E-mail</Label>
              <Input
                type="email"
                placeholder="paciente@email.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
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

              <div className="space-y-1">
                <Label>Canal de Origem</Label>
                <Select value={newChannel} onValueChange={(val: any) => setNewChannel(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {saving ? 'Salvando...' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
