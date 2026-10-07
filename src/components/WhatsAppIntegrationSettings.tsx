import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  RefreshCw,
  PowerOff,
  Zap,
  Info,
  Sparkles,
  ArrowRight,
  PhoneCall,
  KeyRound,
  FileSpreadsheet,
} from 'lucide-react'
import { crmService } from '@/services/crmService'
import { useToast } from '@/hooks/use-toast'
import type { WhatsAppIntegrationStatus, WhatsAppTestResult } from '@/types/crm'

export default function WhatsAppIntegrationSettings() {
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [status, setStatus] = useState<WhatsAppIntegrationStatus>({
    is_connected: false,
    mode: 'demo',
    settings: null,
  })

  // Form inputs
  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [wabaId, setWabaId] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [verifyToken, setVerifyToken] = useState('clinica_soul_token_2025')

  // Test feedback
  const [testResult, setTestResult] = useState<WhatsAppTestResult | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const { toast } = useToast()

  const backendUrl = import.meta.env.VITE_POCKETBASE_URL || window.location.origin
  const webhookCallbackUrl = `${backendUrl}/backend/v1/whatsapp/webhook`

  const loadStatus = async () => {
    try {
      setLoading(true)
      const data = await crmService.getWhatsAppStatus()
      setStatus(data)
      if (data.settings) {
        setPhoneNumberId(data.settings.phone_number_id || '')
        setWabaId(data.settings.waba_id || '')
        setVerifyToken(data.settings.verify_token || 'clinica_soul_token_2025')
        if (data.is_connected) {
          setTestResult({
            ok: true,
            verified_name: data.settings.verified_name,
            display_phone_number: data.settings.display_phone_number,
            quality_rating: data.settings.quality_rating,
            phone_number_id: data.settings.phone_number_id,
          })
        }
      }
    } catch (err) {
      console.error('Error loading WhatsApp status:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const copyToClipboard = async (text: string, fieldKey: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldKey)
      toast({ title: 'Copiado para a área de transferência!' })
      setTimeout(() => setCopiedField(null), 2500)
    } catch {
      toast({ title: 'Não foi possível copiar', variant: 'destructive' })
    }
  }

  const handleTestAndConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneNumberId.trim()) {
      toast({ title: 'Preencha o Phone Number ID', variant: 'destructive' })
      return
    }
    if (!accessToken.trim()) {
      toast({ title: 'Preencha o Token de Acesso da Meta', variant: 'destructive' })
      return
    }

    try {
      setTesting(true)
      setTestResult(null)

      const result = await crmService.testWhatsAppConnection({
        phone_number_id: phoneNumberId.trim(),
        waba_id: wabaId.trim() || undefined,
        access_token: accessToken.trim(),
        verify_token: verifyToken.trim() || 'clinica_soul_token_2025',
        save: true,
      })

      setTestResult(result)

      if (result.ok) {
        toast({
          title: 'Conexão validada com sucesso!',
          description: `WhatsApp Conectado: ${result.verified_name || result.display_phone_number}`,
        })
        await loadStatus()
      } else {
        toast({
          title: 'Falha na validação com a Meta',
          description: result.error || 'Verifique o Token e o Phone Number ID informados.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        error: err?.message || 'Erro inesperado na conexão com os servidores.',
      })
      toast({
        title: 'Erro de comunicação',
        description: 'Não foi possível validar as credenciais junto à Meta.',
        variant: 'destructive',
      })
    } finally {
      setTesting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      setDisconnecting(true)
      await crmService.disconnectWhatsApp()
      toast({
        title: 'WhatsApp desconectado',
        description: 'O canal voltou com segurança para o Modo Demo.',
      })
      setTestResult(null)
      await loadStatus()
    } catch (err) {
      toast({
        title: 'Erro ao desconectar',
        variant: 'destructive',
      })
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: Status + Clarification */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
              status.is_connected
                ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                : 'bg-purple-100 text-purple-700'
            }`}
          >
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900">
                WhatsApp Business Cloud API (Meta)
              </h2>
              {status.is_connected ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-2.5 py-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  CONECTADO
                </Badge>
              ) : (
                <Badge className="bg-purple-100 text-purple-800 border-purple-200 font-bold text-xs px-2.5 py-0.5">
                  MODO DEMO ATIVO
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              {status.is_connected
                ? `Canal oficial ativo — Nome verificado: ${
                    status.settings?.verified_name || 'Clínica SOUL'
                  } (${status.settings?.display_phone_number || ''})`
                : 'Você está operando no modo simulado para testar fluxos clínicos livremente. Cole as credenciais da Meta abaixo para ativar a transmissão real.'}
            </p>
          </div>
        </div>

        {status.is_connected && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50 self-start md:self-center"
          >
            <PowerOff className="w-3.5 h-3.5 mr-1.5" />
            {disconnecting ? 'Desconectando...' : 'Voltar ao Modo Demo'}
          </Button>
        )}
      </div>

      {/* Honest Scope Clarification Alert (Mandatory from prompt) */}
      <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-4 text-xs text-sky-950 flex flex-col sm:flex-row gap-3 shadow-xs">
        <Info className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <p className="font-bold text-sky-900">
            Como funciona o transporte de contatos na API oficial do WhatsApp?
          </p>
          <p className="text-sky-800">
            A WhatsApp Business Cloud API da Meta <strong>não exporta automaticamente</strong> a
            agenda de contatos gravada no aparelho celular físico do usuário.
          </p>
          <p className="text-sky-800">
            No ecossistema oficial, os contatos ingressam de duas formas no seu funil:
          </p>
          <ul className="list-disc list-inside space-y-0.5 pl-1 text-sky-900 font-medium">
            <li>
              <strong>Entrada Reativa (Inbound Webhook):</strong> sempre que um paciente envia uma
              mensagem pelo WhatsApp, o webhook da Clínica SOUL cria o contato, deduplica pelo
              número e movimenta automaticamente o funil para <em>Primeiro Contato</em>.
            </li>
            <li>
              <strong>Importação Proativa:</strong> para transportar sua base atual de contatos
              existentes de uma vez, use a aba{' '}
              <a
                href="/patients/import"
                className="underline font-bold text-sky-900 hover:text-teal-700"
              >
                Importar Planilha (XLSX/CSV)
              </a>
              , que já normaliza telefones brasileiros (+55) e aloca cada paciente na etapa correta.
            </li>
          </ul>
        </div>
      </div>

      {/* Connection Form + Step-by-step Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Card */}
        <Card className="lg:col-span-7 border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-teal-600" />
                  Credenciais da WhatsApp Business Cloud API
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Insira as credenciais obtidas no Meta for Developers para homologar a conexão
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] text-slate-500">
                API Graph v21.0
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleTestAndConnect} className="space-y-4">
              {/* Phone Number ID */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800">
                    Phone Number ID <span className="text-rose-500">*</span>
                  </Label>
                  <span className="text-[10px] text-slate-400">
                    ID numérico do número (ex: 104239828472911)
                  </span>
                </div>
                <Input
                  placeholder="Ex: 104239828472911"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  required
                  className="font-mono text-xs bg-slate-50 border-slate-200"
                />
              </div>

              {/* WABA ID */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800">
                    WhatsApp Business Account ID (WABA ID)
                  </Label>
                  <span className="text-[10px] text-slate-400">
                    Identificador da conta comercial
                  </span>
                </div>
                <Input
                  placeholder="Ex: 109823746198273"
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value)}
                  className="font-mono text-xs bg-slate-50 border-slate-200"
                />
              </div>

              {/* Meta Permanent Access Token */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800">
                    Token Permanente de Acesso da Meta <span className="text-rose-500">*</span>
                  </Label>
                  <span className="text-[10px] text-slate-400">
                    Permissões: messaging e management
                  </span>
                </div>
                <Input
                  type="password"
                  placeholder={
                    status.settings?.masked_token
                      ? `Token salvo (${status.settings.masked_token}) — digite para atualizar`
                      : 'EAAG...'
                  }
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  required={!status.settings?.id}
                  className="font-mono text-xs bg-slate-50 border-slate-200"
                />
                <p className="text-[10px] text-slate-500 leading-tight">
                  Token gerado no Meta Business Manager via Usuário do Sistema com escopos{' '}
                  <code className="text-teal-700 bg-teal-50 px-1 py-0.5 rounded">
                    whatsapp_business_messaging
                  </code>{' '}
                  e{' '}
                  <code className="text-teal-700 bg-teal-50 px-1 py-0.5 rounded">
                    whatsapp_business_management
                  </code>
                  .
                </p>
              </div>

              {/* Webhook Settings Section */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    Configuração de Webhook na Meta
                  </p>
                  <Badge variant="outline" className="text-[9px] bg-white text-slate-600">
                    Inbound Automático
                  </Badge>
                </div>

                {/* Callback URL */}
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600 font-semibold">
                    URL de Retorno de Chamada (Callback URL)
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      readOnly
                      value={webhookCallbackUrl}
                      className="font-mono text-[11px] bg-white border-slate-200 h-8"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(webhookCallbackUrl, 'webhook_url')}
                      className="h-8 px-2.5 text-xs text-slate-700 shrink-0"
                    >
                      {copiedField === 'webhook_url' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Verify Token */}
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600 font-semibold">
                    Token de Verificação (Verify Token)
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={verifyToken}
                      onChange={(e) => setVerifyToken(e.target.value)}
                      className="font-mono text-[11px] bg-white border-slate-200 h-8"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(verifyToken, 'verify_token')}
                      className="h-8 px-2.5 text-xs text-slate-700 shrink-0"
                    >
                      {copiedField === 'verify_token' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Cole este mesmo valor no campo "Token de Verificação" no painel da Meta ao
                    configurar o Webhook.
                  </p>
                </div>
              </div>

              {/* Test Result Card */}
              {testResult && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2 ${
                    testResult.ok
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50/80 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {testResult.ok ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Conexão verificada e homologada pela Meta!</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Falha ao validar credenciais</span>
                      </>
                    )}
                  </div>

                  {testResult.ok ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-emerald-200/60 text-[11px]">
                      <div>
                        <span className="text-emerald-800 font-semibold block">
                          Nome Verificado:
                        </span>
                        <span className="font-bold text-slate-900">
                          {testResult.verified_name || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-emerald-800 font-semibold block">
                          Número Exibido:
                        </span>
                        <span className="font-bold text-slate-900">
                          {testResult.display_phone_number || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-emerald-800 font-semibold block">Classificação:</span>
                        <Badge
                          variant="outline"
                          className="bg-white text-emerald-800 border-emerald-300 font-bold text-[10px]"
                        >
                          {testResult.quality_rating || 'GREEN'}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="text-rose-800 text-[11px] leading-relaxed">
                      {testResult.error ||
                        'Token inválido ou Phone Number ID não encontrado na conta Meta.'}
                    </p>
                  )}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <Button
                  type="submit"
                  disabled={testing}
                  className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs h-10 px-6 shadow-sm shadow-teal-600/20"
                >
                  {testing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                      Validando com a Meta...
                    </>
                  ) : (
                    <>
                      <PhoneCall className="w-3.5 h-3.5 mr-2" />
                      Testar Conexão e Ativar WhatsApp
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={loadStatus}
                  className="text-xs text-slate-600 hover:text-slate-900 h-10"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Atualizar Status
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Step-by-step Instructions & Rules */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-slate-200 bg-white shadow-sm p-5 space-y-4">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Como Conectar seu WhatsApp (Passo a Passo)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Guia prático para obter as credenciais oficiais no painel da Meta
              </CardDescription>
            </div>

            <ol className="space-y-3 text-xs text-slate-600 leading-relaxed list-decimal list-inside">
              <li className="pl-1">
                <strong className="text-slate-900">Acesse o Meta for Developers:</strong>
                <p className="pl-4 text-[11px] text-slate-500 mt-0.5">
                  Vá em{' '}
                  <a
                    href="https://developers.facebook.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-700 font-semibold underline inline-flex items-center gap-1"
                  >
                    developers.facebook.com <ExternalLink className="w-3 h-3" />
                  </a>{' '}
                  e crie um App do tipo <em>Outro → Empresa</em>.
                </p>
              </li>

              <li className="pl-1">
                <strong className="text-slate-900">Adicione o produto WhatsApp:</strong>
                <p className="pl-4 text-[11px] text-slate-500 mt-0.5">
                  No painel do seu app, clique em "Adicionar produto" e selecione "WhatsApp". Em{' '}
                  <em>Início Rápido</em>, você encontrará o <strong>Phone Number ID</strong> e o{' '}
                  <strong>WABA ID</strong>.
                </p>
              </li>

              <li className="pl-1">
                <strong className="text-slate-900">Gere o Token Permanente:</strong>
                <p className="pl-4 text-[11px] text-slate-500 mt-0.5">
                  No Gerenciador de Negócios (Business Manager), acesse <em>Usuários do Sistema</em>
                  , crie um usuário, atribua o App e gere um token com as permissões:
                  <br />
                  <code className="text-teal-800 bg-slate-100 px-1 py-0.2 rounded font-mono text-[10px] mt-1 inline-block">
                    whatsapp_business_messaging
                  </code>
                  <br />
                  <code className="text-teal-800 bg-slate-100 px-1 py-0.2 rounded font-mono text-[10px] inline-block">
                    whatsapp_business_management
                  </code>
                </p>
              </li>

              <li className="pl-1">
                <strong className="text-slate-900">Configure o Webhook na Meta:</strong>
                <p className="pl-4 text-[11px] text-slate-500 mt-0.5">
                  Em <em>WhatsApp → Configuração → Webhook</em>, clique em Editar e cole a Callback
                  URL e o Verify Token copiados deste painel. Assine o campo{' '}
                  <code className="text-teal-800 bg-slate-100 px-1 py-0.2 rounded font-mono text-[10px]">
                    messages
                  </code>
                  .
                </p>
              </li>
            </ol>

            {/* Aviso sobre Número de Teste Gratuito da Meta */}
            <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[11px] text-amber-950 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                Número de Teste Gratuito da Meta
              </p>
              <p className="text-amber-800 leading-relaxed">
                A Meta oferece gratuitamente um número de teste inicial (sandbox). No modo de teste,
                mensagens só podem ser enviadas para até <strong>5 números de telefone</strong> que
                você autorizar manualmente no painel da Meta antes.
              </p>
            </div>

            {/* Regra de Janela de 24h e Templates */}
            <div className="p-3 bg-purple-50/80 border border-purple-200/80 rounded-xl text-[11px] text-purple-950 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-purple-900">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Janela de 24h e Templates Aprovados
              </p>
              <p className="text-purple-800 leading-relaxed">
                Mensagens de texto livre pelo inbox podem ser trocadas livremente{' '}
                <strong>dentro da janela de 24 horas</strong> a partir do último envio do paciente.
                Para mensagens iniciadas pela clínica fora dessa janela, a política oficial da Meta
                exige o uso de um modelo (Template de Mensagem) pré-aprovado.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
