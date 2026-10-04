import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
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
import { Activity, Eye, EyeOff, Loader2, Lock } from 'lucide-react'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      toast({
        title: 'Token inválido',
        description: 'Link de redefinição inválido ou expirado.',
        variant: 'destructive',
      })
      return
    }

    if (password.length < 8) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter no mínimo 8 caracteres.',
        variant: 'destructive',
      })
      return
    }

    if (password !== passwordConfirm) {
      toast({
        title: 'Senhas divergentes',
        description: 'A confirmação de senha não confere.',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)
      await pb.collection('users').confirmPasswordReset(token, password, passwordConfirm)
      toast({
        title: 'Senha atualizada!',
        description: 'Sua senha foi redefinida com sucesso. Faça login para continuar.',
      })
      navigate('/login')
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Falha ao redefinir senha. O token pode ter expirado.'
      toast({
        title: 'Erro',
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
            <p className="text-xs text-slate-500 font-medium">Nova Senha</p>
          </div>
        </div>

        <Card className="border-slate-200/80 shadow-xl bg-white/95 backdrop-blur">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold text-slate-900">Criar nova senha</CardTitle>
            <CardDescription className="text-slate-500">
              Digite e confirme sua nova senha de acesso
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                  Nova senha (mínimo 8 caracteres)
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9 h-10 border-slate-200 focus-visible:ring-teal-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="passwordConfirm" className="text-xs font-semibold text-slate-700">
                  Confirmar nova senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="passwordConfirm"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className="pl-9 h-10 border-slate-200 focus-visible:ring-teal-500"
                    required
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all shadow-md shadow-teal-600/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando nova senha...
                  </>
                ) : (
                  'Redefinir senha'
                )}
              </Button>

              <Button
                asChild
                variant="ghost"
                className="w-full text-slate-600 hover:text-slate-900"
              >
                <Link to="/login">Voltar ao login</Link>
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
