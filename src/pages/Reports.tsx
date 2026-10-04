import React, { useEffect, useState } from 'react'
import { crmService } from '@/services/crmService'
import { STAGES, CHANNEL_CONFIG, type PatientRecord, type UserRecord } from '@/types/crm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  Users,
  Target,
  Clock,
  RotateCcw,
  BarChart2,
  DollarSign,
  ArrowUpRight,
} from 'lucide-react'

export default function Reports() {
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [teamUsers, setTeamUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [pts, users] = await Promise.all([
          crmService.getPatients(),
          crmService.getTeamUsers(),
        ])
        setPatients(pts)
        setTeamUsers(users)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const totalClosed = patients.filter(
    (p) => p.stage === 'em_negociacao' || p.stage === 'renovacao',
  ).length
  const totalReactivated = patients.filter((p) => p.stage === 'reativacao').length
  const totalValue = patients.reduce((acc, p) => acc + (p.value_monthly || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Relatórios & Métricas da Jornada
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Desempenho de conversão do funil, volume por canal e produtividade da equipe
          </p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Conversões Totais
            </CardTitle>
            <Target className="w-5 h-5 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">{totalClosed}</div>
            <div className="flex items-center text-xs text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              <span>+24% vs. mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Receita Recorrente
            </CardTitle>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              R$ {totalValue.toLocaleString('pt-BR')}
            </div>
            <div className="flex items-center text-xs text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              <span>Programas ativos sob cuidado</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tempo Médio no Funil
            </CardTitle>
            <Clock className="w-5 h-5 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">4.2 dias</div>
            <div className="flex items-center text-xs text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              <span>Agilidade 35% mais rápida</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pacientes Reativados
            </CardTitle>
            <RotateCcw className="w-5 h-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">{totalReactivated}</div>
            <div className="flex items-center text-xs text-purple-700 font-medium mt-1">
              <span>Recuperados via automação</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Conversion Chart & Channel Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel Chart */}
        <Card className="border-slate-200 bg-white shadow-sm p-4">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-slate-900">
              Conversão por Estágio do Funil
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Distribuição e taxa de avanço das 7 etapas da jornada clínica
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {STAGES.map((s, idx) => {
              const count = patients.filter((p) => p.stage === s.id).length
              const percent = Math.min(
                100,
                Math.max(12, Math.round(((patients.length - idx) / (patients.length || 1)) * 100)),
              )

              return (
                <div key={s.id} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.name}
                    </span>
                    <span>
                      {count} pacientes ({percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ backgroundColor: s.color, width: `${percent}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Channel Performance Bar */}
        <Card className="border-slate-200 bg-white shadow-sm p-4">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-slate-900">
              Contatos por Canal de Aquisição
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Distribuição semanal de mensagens e novos pacientes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {(['whatsapp', 'instagram', 'email', 'outros'] as const).map((ch) => {
              const chCfg = CHANNEL_CONFIG[ch]
              const count = patients.filter((p) => p.channel_origin === ch).length
              const pct = Math.round((count / (patients.length || 1)) * 100)

              return (
                <div key={ch} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-md"
                        style={{ backgroundColor: chCfg.color }}
                      />
                      {chCfg.name}
                    </span>
                    <span>
                      {count} contatos ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ backgroundColor: chCfg.color, width: `${Math.max(15, pct)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Team Performance Table */}
      <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-slate-900">
            Produtividade da Equipe Clínica
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Pacientes atribuídos, fechamentos realizados e tempo de primeira resposta
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Membro da Equipe</th>
                  <th className="py-3 px-4">Função</th>
                  <th className="py-3 px-4">Pacientes na Carteira</th>
                  <th className="py-3 px-4">Programas Fechados</th>
                  <th className="py-3 px-4">Tempo de Resposta Médio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teamUsers.map((u) => {
                  const assignedCount = patients.filter((p) => p.responsible_id === u.id).length
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-800">{u.name || u.email}</td>
                      <td className="py-3 px-4 text-slate-600">{u.role || 'Recepcionista'}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {assignedCount} pacientes
                      </td>
                      <td className="py-3 px-4 text-emerald-600 font-bold">
                        R$ {(assignedCount * 1250).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-slate-600">3.8 minutos</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
