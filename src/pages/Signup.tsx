import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Activity, ArrowRight, Loader2, Lock, Mail, User } from 'lucide-react'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'Gestor' | 'Coordenador' | 'Recepcionista'>('Recepcionista')
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password) {
      toast({
        title: 'Campos incompletos',
        description: 'Preencha todos os campos obrigatórios.',
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

    try {
      setLoading(true)
      await signup(name, email, password, role)
      toast({
        title: 'Conta criada com sucesso!',
        description: 'Faça login com suas novas credenciais.',
      })
      navigate('/login')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao cadastrar usuário.'
      toast({
        title: 'Erro no cadastro',
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
            <p className="text-xs text-slate-500 font-medium">Cadastro de Membro da Equipe</p>
          </div>
        </div>

        <Card className="border-slate-200/80 shadow-xl bg-white/95 backdrop-blur">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold text-slate-900">Criar nova conta</CardTitle>
            <CardDescription className="text-slate-500">
              Cadastre seu usuário para ter acesso ao CRM e conversas
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
                  Nome completo
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Dra. Juliana Mendes"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9 h-10 border-slate-200 focus-visible:ring-teal-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                  E-mail institucional
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="juliana@clinica.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 h-10 border-slate-200 focus-visible:ring-teal-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role" className="text-xs font-semibold text-slate-700">
                  Função na clínica
                </Label>
                <Select
                  value={role}
                  onValueChange={(val: 'Gestor' | 'Coordenador' | 'Recepcionista') => setRole(val)}
                >
                  <SelectTrigger className="h-10 border-slate-200 focus:ring-teal-500">
                    <SelectValue placeholder="Selecione sua função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Recepcionista">Recepcionista / Atendimento</SelectItem>
                    <SelectItem value="Coordenador">Coordenador(a) da Jornada</SelectItem>
                    <SelectItem value="Gestor">Gestor(a) / Direção Clínica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                  Senha (mínimo 8 caracteres)
                </Label>
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
                    Criando conta...
                  </>
                ) : (
                  <>
                    Cadastrar conta
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              <div className="text-center text-xs text-slate-500 mt-2">
                Já possui acesso?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-teal-600 hover:text-teal-700 hover:underline"
                >
                  Faça login aqui
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
