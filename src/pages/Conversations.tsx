import React, { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { crmService } from '@/services/crmService'
import {
  STAGES,
  CHANNEL_CONFIG,
  type ConversationRecord,
  type MessageRecord,
  type PatientRecord,
  type ChannelType,
} from '@/types/crm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Send,
  Sparkles,
  Paperclip,
  Smile,
  Check,
  CheckCheck,
  Search,
  MessageSquare,
  Calendar,
  CheckSquare,
  ArrowRight,
  Info,
  Clock,
  User,
  Bot,
  AlertCircle,
  Copy,
  Pin,
  Quote,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Conversations() {
  const [searchParams] = useSearchParams()
  const selectedParamId = searchParams.get('id')

  const [conversations, setConversations] = useState<ConversationRecord[]>([])
  const [selectedConv, setSelectedConv] = useState<ConversationRecord | null>(null)
  const [messages, setMessages] = useState<MessageRecord[]>([])
  const [patient, setPatient] = useState<PatientRecord | null>(null)
  const [channelFilter, setChannelFilter] = useState<'todos' | ChannelType>('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [inputContent, setInputContent] = useState('')
  const [sending, setSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [waStatus, setWaStatus] = useState<{
    is_connected: boolean
    mode: 'demo' | 'connected'
    settings: any
  }>({
    is_connected: false,
    mode: 'demo',
    settings: null,
  })

  // Quick modals from conversation header
  const [appointmentModal, setAppointmentModal] = useState(false)
  const [appType, setAppType] = useState<'avaliacao' | 'consulta' | 'retorno'>('avaliacao')
  const [appDate, setAppDate] = useState('')

  const [taskModal, setTaskModal] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const navigate = useNavigate()

  const loadConversations = async () => {
    try {
      const [list, wa] = await Promise.all([
        crmService.getConversations(),
        crmService.getWhatsAppStatus(),
      ])
      setConversations(list)
      setWaStatus(wa)
      if (list.length > 0) {
        if (selectedParamId) {
          const match = list.find((c) => c.id === selectedParamId)
          if (match) setSelectedConv(match)
          else setSelectedConv(list[0])
        } else if (!selectedConv) {
          setSelectedConv(list[0])
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadConversations()
  }, [selectedParamId])

  useEffect(() => {
    if (!selectedConv) return
    const fetchThread = async () => {
      try {
        const msgs = await crmService.getMessages(selectedConv.id)
        setMessages(msgs)
        if (selectedConv.unread_count && selectedConv.unread_count > 0) {
          await crmService.markConversationRead(selectedConv.id)
        }
        if (selectedConv.patient_id) {
          const p = await crmService.getPatientById(selectedConv.patient_id)
          setPatient(p)
        } else {
          setPatient(null)
        }
      } catch (err) {
        console.error(err)
      }
    }
    fetchThread()
  }, [selectedConv])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputContent.trim() || !selectedConv || sending) return

    const content = inputContent.trim()
    setInputContent('')
    setSending(true)

    // Optimistic message
    const tempMsg: MessageRecord = {
      id: 'temp-' + Date.now(),
      conversation_id: selectedConv.id,
      sender: 'outbound',
      channel: selectedConv.channel,
      content,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempMsg])

    try {
      const isConnected = waStatus.is_connected && selectedConv.channel === 'whatsapp'

      if (isConnected) {
        // Envio real através da Meta Cloud API
        const result = await crmService.sendMessage(selectedConv.id, content)
        if (!result.success) {
          // Se for bloqueio de janela de 24h, mostrar aviso educativo
          if (result.requires_template) {
            toast({
              title: 'Janela de 24h encerrada',
              description:
                result.error ||
                'A política oficial da Meta exige um Template de Mensagem aprovado para reiniciar o contato fora de 24h.',
              variant: 'destructive',
            })
          } else {
            toast({
              title: 'Erro no envio via WhatsApp',
              description: result.error || 'A Meta rejeitou o envio.',
              variant: 'destructive',
            })
          }
          // Remover mensagem otimista em caso de erro
          setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id))
          return
        }

        const reloaded = await crmService.getMessages(selectedConv.id)
        setMessages(reloaded)
        toast({
          title: 'Mensagem transmitida',
          description: 'Enviada com sucesso via WhatsApp Cloud API.',
        })
        // No modo conectado, NÃO simula resposta com setTimeout — as respostas chegam de verdade via webhook
      } else {
        // MODO DEMO: Envia pela rota demo e simula resposta de paciente com IA
        await crmService.sendDemoMessage(selectedConv.id, content)
        const reloaded = await crmService.getMessages(selectedConv.id)
        setMessages(reloaded)

        // Simula resposta realista de paciente apenas no modo demo
        setTimeout(() => {
          setIsTyping(true)
          setTimeout(async () => {
            setIsTyping(false)
            const simulatedReplies = [
              'Muito obrigada pelo acolhimento tão humano! Vou verificar a agenda com o Dr. Guilherme.',
              'Vocês atendem pelo plano de saúde ou fornecem nota para reembolso?',
              'Estou com bastante dor na lombar há meses, tem atrapalhado meu trabalho. Como funciona a avaliação?',
              'Qual o valor para eu fazer a avaliação com o Dr. Guilherme?',
              'Perfeito, adorei a atenção de vocês na Clínica SOUL!',
            ]
            const randomReply =
              simulatedReplies[Math.floor(Math.random() * simulatedReplies.length)]
            await crmService.simulateInboundMessage(selectedConv.id, randomReply)
            const updatedMsgs = await crmService.getMessages(selectedConv.id)
            setMessages(updatedMsgs)
          }, 2000)
        }, 1000)
      }
    } catch (_) {
      toast({
        title: 'Erro no envio',
        description: 'Não foi possível enviar a mensagem no momento.',
        variant: 'destructive',
      })
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id))
    } finally {
      setSending(false)
    }
  }

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedConv || !appDate) return

    try {
      await crmService.createAppointment({
        patient_id: selectedConv.patient_id,
        type: appType,
        start_at: new Date(appDate).toISOString(),
        end_at: new Date(new Date(appDate).getTime() + 60 * 60 * 1000).toISOString(),
        status: 'confirmado',
        notes: `Agendado via conversa WhatsApp ${selectedConv.contact_identifier}`,
      })
      toast({
        title: 'Agendamento confirmado!',
        description: `Horário salvo na agenda com sucesso.`,
      })
      setAppointmentModal(false)
    } catch (_) {
      toast({
        title: 'Erro ao agendar',
        variant: 'destructive',
      })
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskTitle.trim()) return

    try {
      await crmService.createTask({
        title: taskTitle.trim(),
        patient_id: selectedConv?.patient_id,
        status: 'a_fazer',
        priority: 'alta',
        due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      toast({
        title: 'Tarefa criada!',
        description: taskTitle,
      })
      setTaskModal(false)
      setTaskTitle('')
    } catch (_) {
      toast({
        title: 'Erro ao criar tarefa',
        variant: 'destructive',
      })
    }
  }

  const filteredConversations = conversations.filter((c) => {
    const matchesChannel = channelFilter === 'todos' || c.channel === channelFilter
    const matchesSearch =
      c.contact_identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.expand?.patient_id?.name &&
        c.expand.patient_id.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.last_message_preview &&
        c.last_message_preview.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesChannel && matchesSearch
  })

  return (
    <div className="space-y-4">
      {/* WhatsApp Status Banner (Connected vs Demo) */}
      {waStatus.is_connected ? (
        <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-950 shadow-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1">
              <Check className="w-3 h-3" />
              WHATSAPP CONECTADO
            </Badge>
            <span className="font-medium">
              Canal oficial ativo ({waStatus.settings?.verified_name || 'Clínica SOUL'} —{' '}
              {waStatus.settings?.display_phone_number || 'Meta Cloud API'}). Mensagens enviadas em
              tempo real pela Meta.
            </span>
          </div>
          <button
            onClick={() => navigate('/settings?tab=whatsapp')}
            className="text-[11px] text-emerald-700 font-semibold underline cursor-pointer shrink-0"
          >
            Ver Integração
          </button>
        </div>
      ) : (
        <div className="bg-purple-50/90 border border-purple-200/80 rounded-xl p-3 flex items-center justify-between text-xs text-purple-900 shadow-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px]">
              MODO DEMO
            </Badge>
            <span className="font-medium">
              Você está no modo demo do WhatsApp — mensagens e respostas são simuladas com IA. Para
              ativar o envio real, conecte suas credenciais da Meta.
            </span>
          </div>
          <button
            onClick={() => navigate('/settings?tab=whatsapp')}
            className="text-[11px] text-purple-700 font-semibold underline cursor-pointer shrink-0"
          >
            Conectar WhatsApp Oficial
          </button>
        </div>
      )}

      {/* Three Pane Layout */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex h-[760px]">
        {/* Left Pane: Conversation List */}
        <div className="w-full md:w-80 lg:w-[340px] border-r border-slate-200 flex flex-col shrink-0">
          {/* Channel Tabs */}
          <div className="p-3 border-b border-slate-100 space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Buscar conversa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-50 border-slate-200"
              />
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
              {(['todos', 'whatsapp', 'instagram', 'email', 'outros'] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setChannelFilter(ch)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize shrink-0 transition-colors ${
                    channelFilter === ch
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Nenhuma conversa encontrada.
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = selectedConv?.id === c.id
                const patientName = c.expand?.patient_id?.name || c.contact_identifier
                const channelCfg = CHANNEL_CONFIG[c.channel]

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedConv(c)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-teal-50/70 border-l-4 border-teal-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200">
                        {patientName.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-slate-900 truncate">{patientName}</p>
                        <span className="text-[10px] text-slate-400 shrink-0">Hoje</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {c.last_message_preview || 'Sem mensagens'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${channelCfg.bg}`}
                        >
                          {channelCfg.name}
                        </span>
                        {c.unread_count && c.unread_count > 0 ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold ml-auto">
                            {c.unread_count}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Middle Pane: Message Thread */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/40">
          {selectedConv ? (
            <>
              {/* Thread Header */}
              <div className="h-16 px-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
                    {(patient?.name || selectedConv.contact_identifier).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {patient?.name || selectedConv.contact_identifier}
                      </h2>
                      {waStatus.is_connected && selectedConv.channel === 'whatsapp' ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                          CANAL OFICIAL
                        </Badge>
                      ) : (
                        <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px]">
                          MODO DEMO
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {selectedConv.contact_identifier}
                    </p>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {patient && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/patients/${patient.id}`)}
                      className="text-xs h-8 text-teal-700 border-teal-200 hover:bg-teal-50"
                    >
                      Ver Jornada
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAppointmentModal(true)}
                    className="text-xs h-8 text-slate-700"
                  >
                    <Calendar className="w-3.5 h-3.5 sm:mr-1" />
                    <span className="hidden sm:inline">Agendar</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTaskModal(true)}
                    className="text-xs h-8 text-slate-700"
                  >
                    <CheckSquare className="w-3.5 h-3.5 sm:mr-1" />
                    <span className="hidden sm:inline">Criar Tarefa</span>
                  </Button>
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="text-center my-2">
                  <span className="text-[11px] bg-slate-200/70 text-slate-600 px-3 py-1 rounded-full font-medium">
                    Hoje
                  </span>
                </div>

                {messages.map((m) => {
                  const isOutbound = m.sender === 'outbound'
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col group ${isOutbound ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs shadow-xs transition-all relative ${
                          isOutbound
                            ? 'bg-[#E4F3F1] text-slate-900 rounded-br-xs border border-teal-200/70'
                            : 'bg-white text-slate-800 rounded-bl-xs border border-slate-200'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                        <div
                          className={`flex items-center gap-1 justify-end text-[10px] mt-1 ${
                            isOutbound ? 'text-teal-800/70' : 'text-slate-400'
                          }`}
                        >
                          <span>
                            {new Date(m.created).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isOutbound && <CheckCheck className="w-3.5 h-3.5 text-teal-600" />}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Simulated typing indicator */}
                {isTyping && (
                  <div className="flex items-center gap-2 text-slate-500 text-xs py-1">
                    <div className="bg-white border border-slate-200 rounded-full px-3 py-1.5 flex items-center gap-1 shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                    </div>
                    <span className="text-[11px] text-slate-400">Paciente digitando...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 bg-white border-t border-slate-200">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <Input
                    placeholder="Digite uma mensagem (Enter para enviar)..."
                    value={inputContent}
                    onChange={(e) => setInputContent(e.target.value)}
                    className="flex-1 h-10 text-xs sm:text-sm bg-slate-50 border-slate-200 focus-visible:ring-teal-500"
                  />
                  <Button
                    type="submit"
                    disabled={sending || !inputContent.trim()}
                    className="h-10 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
              Selecione uma conversa para começar
            </div>
          )}
        </div>

        {/* Right Pane: Patient Context (Desktop only) */}
        {patient && (
          <div className="hidden xl:flex w-72 border-l border-slate-200 flex-col bg-white p-4 space-y-4 shrink-0 overflow-y-auto">
            <div className="text-center pb-3 border-b border-slate-100">
              <div className="w-14 h-14 rounded-full bg-teal-100 text-teal-800 font-bold text-base flex items-center justify-center mx-auto mb-2 border border-teal-200">
                {patient.name.slice(0, 2).toUpperCase()}
              </div>
              <h3 className="text-sm font-bold text-slate-900">{patient.name}</h3>
              <p className="text-xs text-slate-500">{patient.phone}</p>
            </div>

            {/* Stage indicator */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Estágio no Funil
              </p>
              <Badge className="w-full justify-center bg-teal-50 text-teal-800 border-teal-200 capitalize py-1 text-xs font-semibold">
                {patient.stage.replace(/_/g, ' ')}
              </Badge>
            </div>

            {/* Quick stats */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Score IA:</span>
                <span className="font-bold text-teal-700">{patient.score || 85}/100</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Valor Programa:</span>
                <span className="font-bold text-emerald-700">
                  R$ {patient.value_monthly || 0}/mês
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/patients/${patient.id}`)}
                className="w-full text-xs font-semibold text-teal-700 border-teal-200 hover:bg-teal-50"
              >
                Abrir Jornada Completa
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Agendar Modal */}
      <Dialog open={appointmentModal} onOpenChange={setAppointmentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Agendamento Rápido</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAppointment} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label>Tipo de Atendimento</Label>
              <select
                className="w-full h-9 border border-slate-200 rounded-md text-xs px-2"
                value={appType}
                onChange={(e) => setAppType(e.target.value as any)}
              >
                <option value="avaliacao">Avaliação Inicial</option>
                <option value="consulta">Consulta de Rotina</option>
                <option value="retorno">Retorno de Acompanhamento</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Data e Horário</Label>
              <Input
                type="datetime-local"
                value={appDate}
                onChange={(e) => setAppDate(e.target.value)}
                required
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setAppointmentModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white">
                Confirmar Horário
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Criar Tarefa Modal */}
      <Dialog open={taskModal} onOpenChange={setTaskModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Tarefa de Follow-up</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label>Descrição da Tarefa</Label>
              <Input
                placeholder="Ex: Enviar lembrete com link de pagamento"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                required
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setTaskModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white">
                Salvar Tarefa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
