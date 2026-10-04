import React, { useEffect, useState } from 'react'
import { crmService } from '@/services/crmService'
import type { AutomationRecord, AutomationLogRecord } from '@/types/crm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import {
  Zap,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  MessageSquare,
  GitBranch,
  CheckSquare,
  Bell,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Automations() {
  const [automations, setAutomations] = useState<AutomationRecord[]>([])
  const [logs, setLogs] = useState<AutomationLogRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Builder Modal
  const [builderOpen, setBuilderOpen] = useState(false)
  const [editingAuto, setEditingAuto] = useState<AutomationRecord | null>(null)
  const [name, setName] = useState('')
  const [triggerType, setTriggerType] = useState<AutomationRecord['trigger_type']>('novo_contato')
  const [actionType, setActionType] = useState<AutomationRecord['action_type']>('enviar_mensagem')
  const [template, setTemplate] = useState('Olá {paciente.nome}, tudo bem?')
  const [saving, setSaving] = useState(false)

  const { toast } = useToast()

  const loadData = async () => {
    try {
      setLoading(true)
      const [autos, lgs] = await Promise.all([
        crmService.getAutomations(),
        crmService.getAutomationLogs(),
      ])
      setAutomations(autos)
      setLogs(lgs)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleToggle = async (auto: AutomationRecord) => {
    const newEnabled = !auto.enabled
    try {
      const updated = await crmService.updateAutomation(auto.id, { enabled: newEnabled })
      setAutomations((prev) => prev.map((a) => (a.id === auto.id ? updated : a)))
      toast({
        title: newEnabled ? 'Automação ativada' : 'Automação pausada',
        description: auto.name,
      })
    } catch (_) {
      toast({
        title: 'Erro ao alterar status',
        variant: 'destructive',
      })
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    try {
      setSaving(true)
      if (editingAuto) {
        const updated = await crmService.updateAutomation(editingAuto.id, {
          name: name.trim(),
          trigger_type: triggerType,
          action_type: actionType,
          message_template: template,
        })
        setAutomations((prev) => prev.map((a) => (a.id === editingAuto.id ? updated : a)))
        toast({ title: 'Automação atualizada!' })
      } else {
        const created = await crmService.createAutomation({
          name: name.trim(),
          trigger_type: triggerType,
          trigger_config: { custom: true },
          action_type: actionType,
          action_config: { custom: true },
          message_template: template,
          enabled: true,
        })
        setAutomations((prev) => [created, ...prev])
        toast({ title: 'Automação criada!' })
      }
      setBuilderOpen(false)
      resetForm()
    } catch (_) {
      toast({
        title: 'Erro ao salvar automação',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (auto: AutomationRecord) => {
    setEditingAuto(auto)
    setName(auto.name)
    setTriggerType(auto.trigger_type)
    setActionType(auto.action_type)
    setTemplate(auto.message_template || '')
    setBuilderOpen(true)
  }

  const resetForm = () => {
    setEditingAuto(null)
    setName('')
    setTriggerType('novo_contato')
    setActionType('enviar_mensagem')
    setTemplate('Olá {paciente.nome}, tudo bem?')
  }

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'enviar_mensagem':
        return <MessageSquare className="w-4 h-4 text-emerald-600" />
      case 'mover_funil':
        return <GitBranch className="w-4 h-4 text-amber-600" />
      case 'criar_tarefa':
        return <CheckSquare className="w-4 h-4 text-sky-600" />
      default:
        return <Bell className="w-4 h-4 text-purple-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Motor de Automações da Jornada
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Gatilhos automáticos para follow-ups no WhatsApp, movimentação de estágio e tarefas
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setBuilderOpen(true)
          }}
          className="bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Nova Regra
        </Button>
      </div>

      <Tabs defaultValue="library" className="space-y-4">
        <TabsList className="bg-slate-100 p-1 border border-slate-200">
          <TabsTrigger value="library" className="text-xs font-semibold">
            Biblioteca de Regras ({automations.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs font-semibold">
            Histórico de Execuções ({logs.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Library of Automations */}
        <TabsContent value="library" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {automations.map((auto) => (
              <Card
                key={auto.id}
                className="border-slate-200/80 bg-white shadow-xs hover:border-teal-400 transition-all flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
                        {getActionIcon(auto.action_type)}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900">
                          {auto.name}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize font-semibold mt-0.5"
                        >
                          Gatilho: {auto.trigger_type.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>
                    <Switch
                      checked={auto.enabled}
                      onCheckedChange={() => handleToggle(auto)}
                      className="data-[state=checked]:bg-teal-600"
                    />
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {auto.message_template && (
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 italic">
                      "{auto.message_template}"
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <span className="text-slate-500 font-medium capitalize">
                      Ação: {auto.action_type.replace(/_/g, ' ')}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(auto)}
                      className="text-xs text-teal-600 hover:text-teal-700 h-7 px-2"
                    >
                      Editar Regra
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 2: Execution History */}
        <TabsContent value="history">
          <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Data / Hora</th>
                      <th className="py-3 px-4">Automação</th>
                      <th className="py-3 px-4">Gatilho</th>
                      <th className="py-3 px-4">Ação</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-400">
                          Nenhum registro de execução encontrado.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            {new Date(log.created).toLocaleString('pt-BR')}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {log.expand?.automation_id?.name || 'Regra Automática'}
                          </td>
                          <td className="py-3 px-4 text-slate-600 capitalize">
                            {log.trigger.replace(/_/g, ' ')}
                          </td>
                          <td className="py-3 px-4 text-slate-600 capitalize">
                            {log.action.replace(/_/g, ' ')}
                          </td>
                          <td className="py-3 px-4">
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                              Sucesso
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                            {log.details || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Builder Modal */}
      <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAuto ? 'Editar Automação' : 'Criar Nova Automação'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Nome da Automação *</Label>
              <Input
                placeholder="Ex: Follow-up de 20 minutos após primeiro contato"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Gatilho (Evento)</Label>
                <Select value={triggerType} onValueChange={(val: any) => setTriggerType(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo_contato">Novo Contato Chegando</SelectItem>
                    <SelectItem value="mudanca_estagio">Mudança de Estágio no Funil</SelectItem>
                    <SelectItem value="inatividade">Inatividade do Paciente</SelectItem>
                    <SelectItem value="consulta_agendada">Consulta Agendada</SelectItem>
                    <SelectItem value="data_proxima">Data Próxima do Término</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Ação Realizada</Label>
                <Select value={actionType} onValueChange={(val: any) => setActionType(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enviar_mensagem">Enviar Mensagem WhatsApp</SelectItem>
                    <SelectItem value="mover_funil">Mover no Funil</SelectItem>
                    <SelectItem value="criar_tarefa">Criar Tarefa para Equipe</SelectItem>
                    <SelectItem value="notificar_membro">Notificar Responsável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label>Template da Mensagem / Detalhes</Label>
                <span className="text-[11px] text-teal-600">
                  Variáveis: {'{paciente.nome}'}, {'{paciente.telefone}'}
                </span>
              </div>
              <Textarea
                rows={3}
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder="Ex: Olá {paciente.nome}, confirmamos seu agendamento..."
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setBuilderOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold"
              >
                {saving ? 'Salvando...' : 'Salvar Automação'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
