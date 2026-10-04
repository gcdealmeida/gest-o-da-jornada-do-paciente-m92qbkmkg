import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { crmService } from '@/services/crmService'
import { STAGES, type UserRecord } from '@/types/crm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Users,
  GitBranch,
  MessageSquare,
  Bell,
  User,
  Shield,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Mail,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

export default function Settings() {
  const { user, refreshUser } = useAuth()
  const [teamUsers, setTeamUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Invite modal
  const [inviteModal, setInviteModal] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'Gestor' | 'Coordenador' | 'Recepcionista'>(
    'Recepcionista',
  )
  const [inviting, setInviting] = useState(false)

  // Profile state
  const [profileName, setProfileName] = useState(user?.name || '')
  const [newPassword, setNewPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // WhatsApp Demo toggle
  const [demoActive, setDemoActive] = useState(true)

  // Notifications
  const [notifConv, setNotifConv] = useState(true)
  const [notifTasks, setNotifTasks] = useState(true)
  const [notifAutoFail, setNotifAutoFail] = useState(true)

  const { toast } = useToast()

  const loadTeam = async () => {
    try {
      setLoading(true)
      const users = await crmService.getTeamUsers()
      setTeamUsers(users)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTeam()
  }, [])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim() || !inviteName.trim()) return

    try {
      setInviting(true)
      await pb.collection('users').create({
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        password: 'Skip@PassUser',
        passwordConfirm: 'Skip@PassUser',
        role: inviteRole,
      })
      toast({
        title: 'Membro convidado!',
        description: `Convite enviado para ${inviteEmail}`,
      })
      setInviteModal(false)
      setInviteName('')
      setInviteEmail('')
      loadTeam()
    } catch (_) {
      toast({
        title: 'Erro ao convidar membro',
        variant: 'destructive',
      })
    } finally {
      setInviting(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      setSavingProfile(true)
      const data: Record<string, any> = { name: profileName }
      if (newPassword && newPassword.length >= 8) {
        data.password = newPassword
        data.passwordConfirm = newPassword
      }
      await pb.collection('users').update(user.id, data)

      if (newEmail && newEmail !== user.email) {
        await pb.collection('users').requestEmailChange(newEmail)
        toast({
          title: 'Confirmação enviada',
          description: `Um e-mail de confirmação foi enviado para ${newEmail}.`,
        })
      }

      await refreshUser()
      toast({ title: 'Perfil atualizado com sucesso!' })
      setNewPassword('')
    } catch (_) {
      toast({
        title: 'Erro ao atualizar perfil',
        variant: 'destructive',
      })
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Configurações da Plataforma
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Gerenciamento de equipe, estágios da jornada, integração WhatsApp e perfil
          </p>
        </div>
      </div>

      <Tabs defaultValue="equipe" className="space-y-4">
        <TabsList className="bg-slate-100 p-1 border border-slate-200">
          <TabsTrigger value="equipe" className="text-xs font-semibold">
            Equipe Clínica
          </TabsTrigger>
          <TabsTrigger value="estagios" className="text-xs font-semibold">
            Estágios da Jornada
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="text-xs font-semibold">
            WhatsApp Demo
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="text-xs font-semibold">
            Notificações
          </TabsTrigger>
          <TabsTrigger value="perfil" className="text-xs font-semibold">
            Meu Perfil
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Equipe */}
        <TabsContent value="equipe" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500">
              Membros com acesso às conversas e pacientes da clínica
            </p>
            <Button
              size="sm"
              onClick={() => setInviteModal(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Convidar Membro
            </Button>
          </div>

          <Card className="border-slate-200 bg-white overflow-hidden shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="py-3 px-4">Nome</th>
                      <th className="py-3 px-4">E-mail</th>
                      <th className="py-3 px-4">Função</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teamUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">
                            {(u.name || u.email).slice(0, 2).toUpperCase()}
                          </div>
                          {u.name || 'Sem nome'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{u.email}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[11px] font-semibold">
                            {u.role || 'Recepcionista'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                            Ativo
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Estágios */}
        <TabsContent value="estagios" className="space-y-4">
          <Card className="border-slate-200 bg-white shadow-sm p-4 space-y-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Pipeline da Jornada do Paciente
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Os 7 estágios oficiais do ciclo de vida clínico (Lead Frio até Reativação)
              </CardDescription>
            </div>

            <div className="space-y-2">
              {STAGES.map((s, idx) => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl border border-slate-200 flex items-center justify-between bg-slate-50/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">{s.name}</p>
                      <p className="text-[11px] text-slate-500 leading-tight">{s.description}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-semibold shrink-0"
                    style={{
                      borderColor: `${s.color}50`,
                      color: s.color,
                      backgroundColor: `${s.color}10`,
                    }}
                  >
                    Etapa {idx + 1}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Tab 3: WhatsApp Demo */}
        <TabsContent value="whatsapp" className="space-y-4">
          <Card className="border-slate-200 bg-white shadow-sm p-6 space-y-4 max-w-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                  Simulação de WhatsApp (Modo Demo)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 leading-relaxed">
                  Permite validar toda a experiência de atendimento, movimentações de funil e
                  respostas automáticas sem a necessidade de verificação de empresa ou aprovação na
                  Meta Business.
                </CardDescription>
              </div>
              <Switch
                checked={demoActive}
                onCheckedChange={setDemoActive}
                className="data-[state=checked]:bg-teal-600"
              />
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Aviso sobre Integração Oficial Meta
              </p>
              <p className="leading-relaxed text-amber-800">
                O WhatsApp real exige integração com provedor de API oficial (Meta Cloud API ou BSP
                credenciado) com envio de documentos comerciais e número homologado. O modo demo
                replica a jornada com fidelidade de 100% no fluxo.
              </p>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 4: Notificações */}
        <TabsContent value="notificacoes" className="space-y-4">
          <Card className="border-slate-200 bg-white shadow-sm p-6 space-y-4 max-w-xl">
            <CardTitle className="text-base font-bold text-slate-900">
              Preferências de Notificação
            </CardTitle>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">Nova conversa recebida</p>
                  <p className="text-[11px] text-slate-500">
                    Notificar quando um paciente enviar mensagem no WhatsApp
                  </p>
                </div>
                <Switch
                  checked={notifConv}
                  onCheckedChange={setNotifConv}
                  className="data-[state=checked]:bg-teal-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">Tarefa atribuída</p>
                  <p className="text-[11px] text-slate-500">
                    Receber alerta quando você for designado para uma tarefa
                  </p>
                </div>
                <Switch
                  checked={notifTasks}
                  onCheckedChange={setNotifTasks}
                  className="data-[state=checked]:bg-teal-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">Alerta de falha em automação</p>
                  <p className="text-[11px] text-slate-500">
                    Avisar imediatamente caso um disparo falhe
                  </p>
                </div>
                <Switch
                  checked={notifAutoFail}
                  onCheckedChange={setNotifAutoFail}
                  className="data-[state=checked]:bg-teal-600"
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 5: Perfil */}
        <TabsContent value="perfil" className="space-y-4">
          <Card className="border-slate-200 bg-white shadow-sm p-6 max-w-xl">
            <CardTitle className="text-base font-bold text-slate-900 mb-4">
              Meus Dados de Acesso
            </CardTitle>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label>Novo E-mail (opcional)</Label>
                <Input
                  type="email"
                  placeholder={user?.email}
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <p className="text-[11px] text-slate-400">
                  Um link de confirmação será enviado para validar a troca.
                </p>
              </div>

              <div className="space-y-1">
                <Label>Alterar Senha (opcional)</Label>
                <Input
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                disabled={savingProfile}
                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold"
              >
                {savingProfile ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </form>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Modal */}
      <Dialog open={inviteModal} onOpenChange={setInviteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar Membro da Equipe</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label>Nome Completo</Label>
              <Input
                placeholder="Ex: Dra. Carolina Neves"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>E-mail</Label>
              <Input
                type="email"
                placeholder="carolina@clinica.com.br"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Função</Label>
              <select
                className="w-full h-9 border border-slate-200 rounded-md text-xs px-2"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
              >
                <option value="Recepcionista">Recepcionista</option>
                <option value="Coordenador">Coordenador(a)</option>
                <option value="Gestor">Gestor(a)</option>
              </select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setInviteModal(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={inviting}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {inviting ? 'Enviando...' : 'Enviar Convite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
