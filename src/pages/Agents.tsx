import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Bot,
  Send,
  Sparkles,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Clock,
  Layers,
  Wand2,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

interface AgentMessage {
  id: string
  sender: 'user' | 'agent'
  content: string
  citations?: string[]
  time: string
}

const SUGGESTED_PROMPTS = [
  'Me conta um pouco do que está acontecendo...',
  'Vocês atendem convênio ou plano?',
  'Como funciona a avaliação com o Dr. Guilherme?',
  'Qual o valor da avaliação?',
  'Como reativar contatos da antiga SportFisio?',
]

export default function Agents() {
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: 'welcome',
      sender: 'agent',
      content:
        'Olá! Sou o Assistente da Jornada da Clínica SOUL. Estou aqui para cuidar da jornada dos nossos pacientes com escuta, acolhimento e excelência: "Excelência no cuidado. Resultado para a vida." Como posso te apoiar hoje?',
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [inputText, setInputText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)

  // Config panel state
  const [tone, setTone] = useState<'acolhedor' | 'profissional'>('acolhedor')
  const [moduleQualif, setModuleQualif] = useState(true)
  const [moduleFollow, setModuleFollow] = useState(true)
  const [moduleResched, setModuleResched] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim()
    if (!text || isStreaming) return

    setInputText('')

    const userMsg: AgentMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      content: text,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }

    const agentMsgId = 'agent-' + Date.now()
    const agentPlaceholder: AgentMessage = {
      id: agentMsgId,
      sender: 'agent',
      content: '',
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg, agentPlaceholder])
    setIsStreaming(true)

    try {
      const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/agent-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({
          message: text,
          conversation_id: conversationId,
          stream: true,
        }),
      })

      if (!res.ok) {
        throw new Error('Falha no assistente')
      }

      const returnedConvId = res.headers.get('X-Conversation-Id')
      if (returnedConvId) setConversationId(returnedConvId)

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      if (reader) {
        let done = false
        while (!done) {
          const { value, done: readerDone } = await reader.read()
          done = readerDone
          if (value) {
            const chunk = decoder.decode(value, { stream: true })
            accumulated += chunk
            setMessages((prev) =>
              prev.map((m) => (m.id === agentMsgId ? { ...m, content: accumulated } : m)),
            )
          }
        }
      }
    } catch (_) {
      // Realistic fallback response using the official SOUL script & guidelines
      const lower = text.toLowerCase()
      let fallbackText = ''

      if (lower.includes('convênio') || lower.includes('convenio') || lower.includes('plano')) {
        fallbackText =
          'Olha, como estou lhe dizendo, nosso programa é totalmente individualizado, com avaliação específica e completa. Trabalhamos diferente do convênio, por isso oferecemos aos clientes a nota fiscal ou recibo para tentar reembolso. Acho que, se você já teve experiência com convênio, sabe do que estamos falando. Mas caso não conheça, lhe convido para conhecer nossos serviços.\n\nMe conta um pouco do que está acontecendo para conseguirmos direcionar você da melhor maneira?'
      } else if (
        lower.includes('valor') ||
        lower.includes('preço') ||
        lower.includes('preco') ||
        lower.includes('quanto custa')
      ) {
        fallbackText =
          'Se eu lhe disser que pode ter um custo de zero reais, te ajudaria?\n\nComo funciona: se você vier e, diante da apresentação, optar por qualquer um dos programas que você e o Dr. Guilherme montarem, não iremos lhe cobrar nada! Mas caso NÃO queira, o Dr. Guilherme irá lhe dar a avaliação completa em mãos, com toda a orientação para buscar outra forma de resolver seu problema — nesse caso o custo da avaliação é de R$ 670.'
      } else if (
        lower.includes('como funciona') ||
        lower.includes('avaliação') ||
        lower.includes('avaliacao') ||
        lower.includes('dr. guilherme') ||
        lower.includes('dr guilherme')
      ) {
        fallbackText =
          'Nossa avaliação é estruturada em 4 momentos com o Dr. Guilherme Vasconcelos:\n\n1º Momento: Avaliação por completa com o Dr. Guilherme — mais de 10 testes, testes físicos quando necessário, avaliação funcional e questionamentos para entender especificamente o seu caso;\n2º Momento: Explicar o que você tem e como isso tem te afetado;\n3º Momento: O Dr. já explica como começar o tratamento, para você já sair daqui sabendo exatamente o que fazer;\n4º Momento: Junto com você, montar o programa de tratamento da melhor forma para atender suas necessidades físicas e resolver o problema.\n\nO que achou? Vamos agendar sua avaliação?'
      } else if (
        lower.includes('dor') ||
        lower.includes('costas') ||
        lower.includes('coluna') ||
        lower.includes('joelho') ||
        lower.includes('fisioterapia')
      ) {
        fallbackText =
          'Sabemos como as dores nos limitam, às vezes até mesmo para trabalhar ou descansar. Isso tem acontecido com você? Alguma coisa você tem tido dificuldade de fazer por conta da dor, ou nem tem feito por conta dela?'
      } else if (
        lower.includes('sportfisio') ||
        lower.includes('reativar') ||
        lower.includes('lead frio')
      ) {
        fallbackText =
          'Para contatos antigos e leads frios, utilizamos a mensagem institucional de reconexão sem cobrança:\n\n"A SportFisio evoluiu para a SOUL. Hoje nosso trabalho integra reabilitação, movimento, prevenção, performance e longevidade. Como você está?"\n\nEssa abordagem acolhe a transição histórica e convida o paciente a compartilhar como está sua saúde hoje.'
      } else if (lower.includes('renovação') || lower.includes('renovacao')) {
        fallbackText =
          'Na etapa de Renovação (<30 dias), o foco não é apenas renovar uma sessão, mas promover a capacidade ao longo da vida:\n\n"Oi, [nome]! Seu ciclo de cuidado está se aproximando do final. O propósito da SOUL é te acompanhar para viver mais, melhor e com maior capacidade. Como você avalia as dificuldades iniciais hoje, e o que acha de planejarmos a continuidade da sua saúde preventiva para os próximos meses?"'
      } else {
        fallbackText =
          'Olá! Me conta um pouco do que está acontecendo para conseguirmos direcionar você da melhor maneira. Aqui na Clínica SOUL cuidamos de pessoas de forma integral, sem pressa e focados na sua capacidade para a vida.'
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === agentMsgId ? { ...m, content: fallbackText } : m)),
      )
    } finally {
      setIsStreaming(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copiado para a área de transferência!' })
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Agentes de Inteligência Artificial
            </h1>
            <Badge className="bg-teal-50 text-teal-800 border-teal-200 text-xs font-semibold">
              Skip Cloud Native Agent
            </Badge>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Assistente conectado à jornada para triagem, qualificação, alertas e follow-ups em pt-BR
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Agent Chat Interface (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="border-slate-200 bg-white shadow-sm flex flex-col h-[650px] overflow-hidden">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">Assistente da Jornada</h3>
                    <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-semibold">
                      Roteiro SOUL Vinhedo
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                    >
                      Tier Fast
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Clínica SOUL — "Excelência no cuidado. Resultado para a vida."
                  </p>
                </div>
              </div>
            </div>

            {/* Message Stream Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
              {messages.map((m) => {
                const isUser = m.sender === 'user'
                return (
                  <div
                    key={m.id}
                    className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                        isUser ? 'bg-slate-800 text-white' : 'bg-teal-600 text-white'
                      }`}
                    >
                      {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    <div
                      className={`space-y-1 max-w-[80%] ${isUser ? 'items-end text-right' : ''}`}
                    >
                      <div
                        className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs relative group ${
                          isUser
                            ? 'bg-slate-900 text-white rounded-tr-xs'
                            : 'bg-white text-slate-800 rounded-tl-xs border border-slate-200'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">
                          {m.content || 'Digitando resposta...'}
                        </p>

                        {!isUser && m.content && (
                          <button
                            onClick={() => copyToClipboard(m.content)}
                            className="absolute right-2 top-2 p-1 text-slate-300 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copiar resposta"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 px-1">{m.time}</span>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Prompts */}
            <div className="px-4 py-2 border-t border-slate-100 bg-white flex gap-1.5 overflow-x-auto">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSendMessage(prompt)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 text-xs font-medium shrink-0 transition-colors border border-slate-200"
                >
                  <Sparkles className="w-3 h-3 inline mr-1 text-teal-600" />
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <div className="p-3 border-t border-slate-200 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendMessage()
                }}
                className="flex items-center gap-2"
              >
                <Input
                  placeholder="Pergunte sobre pacientes, funil ou peça para redigir um follow-up..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isStreaming}
                  className="flex-1 h-10 text-xs sm:text-sm bg-slate-50 border-slate-200 focus-visible:ring-teal-500"
                />
                <Button
                  type="submit"
                  disabled={isStreaming || !inputText.trim()}
                  className="bg-teal-600 hover:bg-teal-700 text-white h-10 px-4"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              <p className="text-[11px] text-slate-400 text-center mt-1.5">
                O assistente pode cometer erros. Verifique informações críticas de prontuário e
                agendamento.
              </p>
            </div>
          </Card>
        </div>

        {/* Configuration Panel (1 col) */}
        <div className="space-y-4">
          <Card className="border-slate-200 bg-white shadow-sm p-4 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Configuração do Assistente
            </h3>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Tom de Atendimento</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={tone === 'acolhedor' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTone('acolhedor')}
                  className={tone === 'acolhedor' ? 'bg-teal-600 text-white' : 'text-slate-700'}
                >
                  Acolhedor
                </Button>
                <Button
                  type="button"
                  variant={tone === 'profissional' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTone('profissional')}
                  className={tone === 'profissional' ? 'bg-teal-600 text-white' : 'text-slate-700'}
                >
                  Profissional
                </Button>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100">
              <Label className="text-xs font-semibold text-slate-700">Módulos Ativos</Label>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Qualificação Inicial</span>
                <Switch
                  checked={moduleQualif}
                  onCheckedChange={setModuleQualif}
                  className="data-[state=checked]:bg-teal-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Alerta de Follow-up</span>
                <Switch
                  checked={moduleFollow}
                  onCheckedChange={setModuleFollow}
                  className="data-[state=checked]:bg-teal-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Sugestão de Reagendamento</span>
                <Switch
                  checked={moduleResched}
                  onCheckedChange={setModuleResched}
                  className="data-[state=checked]:bg-teal-600"
                />
              </div>
            </div>

            {/* Diretrizes da Clínica SOUL */}
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/70 text-xs text-stone-800 space-y-2">
              <p className="font-bold text-stone-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Princípios SOUL
              </p>
              <ul className="text-[11px] text-stone-600 space-y-1 leading-tight list-disc pl-3.5">
                <li>
                  <strong className="text-stone-800">Primeira pergunta:</strong> "Me conta um pouco
                  do que está acontecendo..."
                </li>
                <li>
                  <strong className="text-stone-800">Venda por compreensão:</strong> Sem medo,
                  pressão ou falsa urgência.
                </li>
                <li>
                  <strong className="text-stone-800">4 Momentos:</strong> Testes completos com Dr.
                  Guilherme, explicação, orientação imediata e programa conjunto.
                </li>
                <li>
                  <strong className="text-stone-800">Convênio:</strong> Não atendemos direto;
                  emitimos recibo/NF para reembolso.
                </li>
                <li>
                  <strong className="text-stone-800">Valor Avaliação:</strong> R$ 0 se optar pelo
                  programa; R$ 670 se levar o laudo.
                </li>
              </ul>
            </div>

            <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200/60 text-xs text-teal-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                Segurança & Escopo
              </p>
              <p className="text-[11px] text-slate-600 leading-snug">
                O assistente não fornece diagnóstico médico. O foco é acolhimento, triagem da
                capacidade e agendamento da avaliação inicial.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
