import React, { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  GitBranch,
  MessageSquare,
  Calendar,
  CheckSquare,
  Zap,
  Users,
  FileSpreadsheet,
  Bot,
  BarChart3,
  Settings,
  LogOut,
  Search,
  Bell,
  Plus,
  Menu,
  X,
  Activity,
  UserCheck,
  FlaskConical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { crmService } from '@/services/crmService'
import { useToast } from '@/hooks/use-toast'
import type { ChannelType } from '@/types/crm'

const NAV_ITEMS = [
  { path: '/', label: 'Painel', icon: LayoutDashboard },
  { path: '/funnel', label: 'Funil', icon: GitBranch },
  { path: '/conversations', label: 'Conversas', icon: MessageSquare },
  { path: '/agenda', label: 'Agenda', icon: Calendar },
  { path: '/tasks', label: 'Tarefas', icon: CheckSquare },
  { path: '/automations', label: 'Automações', icon: Zap },
  { path: '/patients', label: 'Pacientes', icon: Users },
  { path: '/patients/import', label: 'Importar Planilha', icon: FileSpreadsheet },
  { path: '/agents', label: 'Agentes IA', icon: Bot },
  { path: '/reports', label: 'Relatórios', icon: BarChart3 },
  { path: '/test-scenarios', label: 'Cenários de Teste', icon: FlaskConical },
  { path: '/settings?tab=whatsapp', label: 'Conexão WhatsApp', icon: MessageSquare },
  { path: '/settings', label: 'Configurações', icon: Settings },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [newConvModal, setNewConvModal] = useState(false)
  const [channel, setChannel] = useState<ChannelType>('whatsapp')
  const [contactId, setContactId] = useState('')
  const [globalSearch, setGlobalSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleCreateConversation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contactId.trim()) return

    try {
      setCreating(true)
      const conv = await crmService.createConversation({
        channel,
        contact_identifier: contactId.trim(),
        last_message_preview: 'Conversa iniciada',
        last_message_at: new Date().toISOString(),
        unread_count: 0,
        status: 'aberta',
      })
      toast({
        title: 'Conversa criada',
        description: `Canal ${channel.toUpperCase()} para ${contactId}`,
      })
      setNewConvModal(false)
      setContactId('')
      navigate(`/conversations?id=${conv.id}`)
    } catch (_) {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a conversa.',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!globalSearch.trim()) return
    navigate(`/patients?q=${encodeURIComponent(globalSearch.trim())}`)
  }

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-[#0F172A]">
      {/* Desktop & Tablet Sidebar */}
      <aside className="hidden md:flex flex-col w-[72px] lg:w-[260px] border-r border-[#E2E8F0] bg-gradient-to-b from-white to-[#E4F3F1]/30 shrink-0 sticky top-0 h-screen z-30 transition-all duration-300">
        {/* Brand */}
        <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-[#E2E8F0]/80 gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/20 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="hidden lg:block overflow-hidden">
            <h1 className="text-base font-bold tracking-tight text-slate-900 leading-none">
              Jornada do Paciente
            </h1>
            <p className="text-[11px] text-teal-700 font-semibold tracking-wide uppercase mt-0.5">
              Gestão de Experiência
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 lg:px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-teal-50 text-teal-700 font-semibold border-l-4 border-teal-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="hidden lg:inline">{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* User profile & Logout */}
        <div className="p-3 border-t border-[#E2E8F0] bg-white/70">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0 border border-teal-200">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'JP'}
              </div>
              <div className="hidden lg:block truncate">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {user?.name || 'Membro da Equipe'}
                </p>
                <p className="text-[10px] text-teal-700 font-medium flex items-center gap-1">
                  <UserCheck className="w-3 h-3" />
                  {user?.role || 'Recepcionista'}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sair do sistema"
              className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex flex-col w-72 max-w-[80vw] bg-white h-full shadow-2xl z-10 border-r border-slate-200">
            <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="font-bold text-sm text-slate-900">Jornada do Paciente</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-slate-500 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-teal-50 text-teal-700 font-semibold border-l-4 border-teal-600'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </nav>
            <div className="p-4 border-t border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-900">{user?.name || 'Membro'}</p>
                <p className="text-[11px] text-teal-700">{user?.role || 'Equipe'}</p>
              </div>
              <button onClick={logout} className="p-2 text-slate-400 hover:text-red-600">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Header */}
        <header className="sticky top-0 z-20 h-16 bg-white/90 backdrop-blur border-b border-[#E2E8F0] px-4 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-lg">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Search */}
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Buscar pacientes por nome, telefone ou prontuário..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="pl-9 h-9 text-xs sm:text-sm bg-slate-50 border-slate-200 rounded-full focus-visible:ring-teal-500 w-full"
              />
            </form>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notification bell */}
            <button
              onClick={() => navigate('/automations')}
              className="relative p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Notificações e Automações"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-500 animate-ping" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-500" />
            </button>

            {/* Nova Conversa Button */}
            <Button
              onClick={() => setNewConvModal(true)}
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm shadow-teal-600/20 h-9 px-3 sm:px-4"
            >
              <Plus className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Nova Conversa</span>
            </Button>
          </div>
        </header>

        {/* Routed Screen Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* New Conversation Modal */}
      <Dialog open={newConvModal} onOpenChange={setNewConvModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Iniciar Nova Conversa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateConversation} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Canal de Atendimento</Label>
              <Select value={channel} onValueChange={(val: ChannelType) => setChannel(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp (Modo Demo)</SelectItem>
                  <SelectItem value="instagram">Instagram Direct</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Identificador do Contato</Label>
              <Input
                placeholder="Ex: +55 11 98888-7777 ou @usuario"
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                required
              />
              <p className="text-[11px] text-slate-500">
                O WhatsApp opera em modo demo realista nesta versão para testes sem bloqueio de API.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setNewConvModal(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {creating ? 'Iniciando...' : 'Iniciar Conversa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
