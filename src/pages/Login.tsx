import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Activity, AlertTriangle, ArrowRight, Loader2, Lock, Mail } from 'lucide-react'
import { consumeSessionExpiredFlag } from '@/lib/scenarioErrors'

export default function Login() {
  const [email, setEmail] = useState('guivemax@hotmail.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [loading, setLoading] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [searchParams] = useSearchParams()
  const { login } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    setSessionExpired(consumeSessionExpiredFlag())
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast({
        title: 'Campos incompletos',
        description: 'Por favor, informe seu e-mail e senha.',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)
      await login(email, password)
      toast({
        title: 'Bem-vindo(a)!',
        description: 'Login realizado com sucesso.',
      })
      const from = searchParams.get('from')
      navigate(from && from.startsWith('/') ? from : '/')
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Credenciais inválidas. Verifique seu e-mail e senha.'
      toast({
        title: 'Erro ao entrar',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-teal-50 via-slate-50 to-emerald-100">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-600/30">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Jornada do Paciente
            </h1>
            <p className="text-xs text-slate-500 font-medium">CRM de Experiência & WhatsApp</p>
          </div>
        </div>

        <Card className="border-slate-200/80 shadow-xl bg-white/95 backdrop-blur">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold text-slate-900">Entrar na sua conta</CardTitle>
            <CardDescription className="text-slate-500">
              Acesse o painel integrado da sua clínica
            </CardDescription>
            {sessionExpired && (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Sua sessão expirou por inatividade. Faça login novamente para continuar — seus
                  dados estão salvos.
                </span>
              </div>
            )}
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                  E-mail profissional
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="voce@clinica.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 h-10 border-slate-200 focus-visible:ring-teal-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                    Senha
                  </Label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-teal-600 hover:text-teal-700 hover:underline"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 h-10 border-slate-200 focus-visible:ring-teal-500"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-teal-50/70 border border-teal-200/60 rounded-lg text-xs text-teal-800 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-teal-500" />
                  Acesso rápido de teste:
                </p>
                <p className="text-slate-600">
                  <strong>Gestor:</strong> guivemax@hotmail.com / Skip@Pass
                </p>
                <p className="text-slate-600">
                  <strong>Equipe:</strong> maria@clinica.com.br / Skip@Pass
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all shadow-md shadow-teal-600/20 active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    Entrar no Sistema
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              <div className="text-center text-xs text-slate-500 mt-2">
                Ainda não tem conta?{' '}
                <Link
                  to="/signup"
                  className="font-semibold text-teal-600 hover:text-teal-700 hover:underline"
                >
                  Cadastrar novo membro
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
