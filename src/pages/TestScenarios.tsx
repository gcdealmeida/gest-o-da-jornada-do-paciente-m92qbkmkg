import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MessageCircle,
  Snowflake,
  CalendarClock,
  CalendarX2,
  Handshake,
  Play,
  Loader2,
  CheckCircle2,
  FlaskConical,
  MessageSquare,
  Route as RouteIcon,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  SCENARIOS,
  runScenario,
  ScenarioSessionError,
  type ScenarioDefinition,
  type ScenarioResult,
} from '@/lib/demoScenarios'
import { describeScenarioError, markSessionExpired } from '@/lib/scenarioErrors'
import { useToast } from '@/hooks/use-toast'

const ICONS: Record<string, React.ElementType> = {
  MessageCircle,
  Snowflake,
  CalendarClock,
  CalendarX2,
  Handshake,
}

const BADGE_STYLES: Record<string, string> = {
  'Primeiro Contato': 'bg-sky-50 text-sky-700 border-sky-200',
  'Lead Frio': 'bg-slate-100 text-slate-600 border-slate-300',
  Monitoramento: 'bg-amber-50 text-amber-700 border-amber-200',
  Reativação: 'bg-rose-50 text-rose-700 border-rose-200',
  'Em Negociação': 'bg-blue-50 text-blue-700 border-blue-200',
}

interface ScenarioRunState {
  running: boolean
  doneSteps: number
  totalSteps: number
  result?: ScenarioResult
  error?: string
}

export default function TestScenarios() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [states, setStates] = useState<Record<string, ScenarioRunState>>({})
  const [expanded, setExpanded] = useState<string | null>(null)

  const updateState = (id: string, patch: Partial<ScenarioRunState>) =>
    setStates((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || { running: false, doneSteps: 0, totalSteps: 0 }), ...patch },
    }))

  const handleRun = async (scenario: ScenarioDefinition) => {
    const steps = scenario.buildSteps({ name: '', phone: '' })
    updateState(scenario.id, {
      running: true,
      doneSteps: 0,
      totalSteps: steps.length,
      result: undefined,
      error: undefined,
    })
    try {
      const result = await runScenario(scenario, {
        onStepDone: (done) => updateState(scenario.id, { doneSteps: done + 1 }),
      })
      updateState(scenario.id, { running: false, doneSteps: steps.length, result })
      toast({
        title: 'Cenário executado! 🎉',
        description: `Paciente fictício "${result.patientName}" criado e caso rodado de ponta a ponta.`,
      })
      setExpanded(scenario.id)
    } catch (err: unknown) {
      if (err instanceof ScenarioSessionError) {
        updateState(scenario.id, {
          running: false,
          error: err.message,
        })
        toast({
          title: 'Sessão expirada',
          description: err.message,
          variant: 'destructive',
        })
        markSessionExpired()
        navigate(`/login?from=${encodeURIComponent('/test-scenarios')}`, { replace: true })
        return
      }
      const info = describeScenarioError(err)
      updateState(scenario.id, {
        running: false,
        error: info.friendlyMessage,
      })
      toast({
        title: info.isAuth ? 'Sessão expirada' : 'Erro no cenário',
        description: info.friendlyMessage,
        variant: 'destructive',
      })
      if (info.isAuth) {
        markSessionExpired()
        // Sessão ausente/expirada: redireciona ao login com a rota de retorno.
        navigate(`/login?from=${encodeURIComponent('/test-scenarios')}`, { replace: true })
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner Demo */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="text-sm">
          <p className="font-semibold text-amber-800">Modo Demo — Cenários de Teste</p>
          <p className="text-amber-700/90 mt-0.5">
            Estes cenários simulam situações reais da jornada do paciente usando dados fictícios.
            Cada execução cria pessoas inéditas (nome e telefone novos), conversas no WhatsApp demo,
            movimentação no funil, eventos na timeline e registros de automação — tudo dentro do
            sistema. Pode rodar quantas vezes quiser.
          </p>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cenários de Teste da Jornada</h1>
        <p className="text-sm text-slate-500 mt-1">
          Execute os 5 casos de ponta a ponta e acompanhe o resultado em Conversas, Funil e na
          Jornada do Paciente.
        </p>
      </div>

      {/* Cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {SCENARIOS.map((scenario) => {
          const Icon = ICONS[scenario.icon] || FlaskConical
          const state = states[scenario.id]
          const running = !!state?.running
          const result = state?.result
          const hasError = !!state?.error
          const isExpanded = expanded === scenario.id

          return (
            <Card
              key={scenario.id}
              className={`border transition-shadow ${running ? 'ring-2 ring-teal-500/40' : ''} ${hasError ? 'border-red-200' : 'border-slate-200'} hover:shadow-md`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-teal-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900 leading-tight">
                          {scenario.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${BADGE_STYLES[scenario.badge] || ''}`}
                        >
                          {scenario.badge}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{scenario.summary}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => handleRun(scenario)}
                  disabled={running}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                >
                  {running ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Executando… ({state?.doneSteps}/{state?.totalSteps} passos)
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Executar cenário
                    </>
                  )}
                </Button>

                {running && (
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-teal-500 transition-all duration-300"
                      style={{
                        width: `${state?.totalSteps ? (state.doneSteps / state.totalSteps) * 100 : 0}%`,
                      }}
                    />
                  </div>
                )}

                {hasError && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{state?.error}</span>
                  </div>
                )}

                {result && (
                  <div className="rounded-lg border border-teal-200 bg-teal-50/50 px-3 py-3 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-teal-800">
                      <CheckCircle2 className="w-4 h-4 text-teal-600" />
                      Cenário concluído — paciente fictício “{result.patientName}”
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-teal-300 text-teal-700 hover:bg-teal-100"
                        onClick={() => navigate(`/conversations?id=${result.conversationId}`)}
                      >
                        <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                        Ver conversa
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-teal-300 text-teal-700 hover:bg-teal-100"
                        onClick={() => navigate(`/patients/${result.patientId}`)}
                      >
                        <RouteIcon className="w-3.5 h-3.5 mr-1.5" />
                        Ver jornada do paciente
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-teal-300 text-teal-700 hover:bg-teal-100"
                        onClick={() => navigate('/funnel')}
                      >
                        Ver funil
                      </Button>
                    </div>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : scenario.id)}
                      className="flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-900"
                    >
                      {isExpanded ? 'Ocultar' : 'Ver'} o que aconteceu ({result.steps.length}{' '}
                      passos)
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {isExpanded && (
                      <ol className="space-y-2 border-t border-teal-200/60 pt-3">
                        {result.steps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-slate-700 font-medium">{step.label}</p>
                              {(step.inbound || step.outbound) && (
                                <p className="text-xs text-slate-500 mt-0.5 whitespace-pre-line line-clamp-3">
                                  “
                                  {fillPreview(
                                    step.inbound || step.outbound || '',
                                    result.patientName,
                                  )}
                                  ”
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function fillPreview(text: string, name: string): string {
  const first = name ? name.split(' ')[0] : ''
  return text.replaceAll('{nome}', first)
}
