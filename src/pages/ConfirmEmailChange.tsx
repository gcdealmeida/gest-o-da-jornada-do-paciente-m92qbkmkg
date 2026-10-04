import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Activity, CheckCircle2, Loader2, XCircle } from 'lucide-react'

export default function ConfirmEmailChange() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMessage('Token de alteração ausente na URL.')
      return
    }

    pb.collection('users')
      .confirmEmailChange(token, '')
      .then(() => {
        pb.authStore.clear()
        setStatus('success')
      })
      .catch((err) => {
        setStatus('error')
        setErrorMessage(err?.message || 'Token inválido ou expirado.')
      })
  }, [token])

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
            <p className="text-xs text-slate-500 font-medium">Confirmação de Alteração</p>
          </div>
        </div>

        <Card className="border-slate-200/80 shadow-xl bg-white/95 backdrop-blur text-center py-6">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-900">
              {status === 'loading' && 'Confirmando alteração de e-mail...'}
              {status === 'success' && 'E-mail atualizado com sucesso!'}
              {status === 'error' && 'Falha na confirmação'}
            </CardTitle>
            <CardDescription className="text-slate-500">
              {status === 'loading' && 'Por favor, aguarde enquanto processamos sua solicitação.'}
              {status === 'success' &&
                'Seu novo e-mail foi salvo. Faça login novamente usando o novo endereço.'}
              {status === 'error' && errorMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 flex flex-col items-center">
            {status === 'loading' && <Loader2 className="w-12 h-12 text-teal-600 animate-spin" />}
            {status === 'success' && (
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            )}
            {status === 'error' && (
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <XCircle className="w-10 h-10" />
              </div>
            )}

            <Button
              asChild
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold"
            >
              <Link to="/login">Fazer login com novo e-mail</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
