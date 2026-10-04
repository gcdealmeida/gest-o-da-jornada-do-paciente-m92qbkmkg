import React, { useState } from 'react'
import { Link } from 'react-router-dom'
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
import { Activity, ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    try {
      setLoading(true)
      await pb.collection('users').requestPasswordReset(email)
      setSubmitted(true)
      toast({
        title: 'E-mail enviado',
        description: 'Verifique sua caixa de entrada para redefinir sua senha.',
      })
    } catch (err: unknown) {
      toast({
        title: 'Aviso',
        description: 'Se o e-mail estiver cadastrado, o link de recuperação foi enviado.',
      })
      setSubmitted(true)
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
            <p className="text-xs text-slate-500 font-medium">Recuperação de Acesso</p>
          </div>
        </div>

        <Card className="border-slate-200/80 shadow-xl bg-white/95 backdrop-blur">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold text-slate-900">Esqueceu sua senha?</CardTitle>
            <CardDescription className="text-slate-500">
              Digite seu e-mail cadastrado para receber o link seguro de redefinição
            </CardDescription>
          </CardHeader>
          {submitted ? (
            <CardContent className="space-y-4 text-center py-6">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <p className="text-sm text-slate-600">
                Enviamos as instruções para <strong>{email}</strong>. Siga o link no e-mail para
                cadastrar sua nova senha.
              </p>
              <Button asChild variant="outline" className="mt-4 w-full">
                <Link to="/login">Voltar ao Login</Link>
              </Button>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                    E-mail cadastrado
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
                      Enviando...
                    </>
                  ) : (
                    'Enviar link de redefinição'
                  )}
                </Button>

                <Button
                  asChild
                  variant="ghost"
                  className="w-full text-slate-600 hover:text-slate-900"
                >
                  <Link to="/login" className="flex items-center justify-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Voltar para o login
                  </Link>
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
