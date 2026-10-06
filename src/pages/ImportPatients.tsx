import React, { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Sliders,
  Table,
  Check,
  X,
  FileText,
  Users,
  ChevronRight,
  Info,
  Download,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { STAGES, type StageId } from '@/types/crm'
import {
  SYSTEM_FIELDS,
  type ParsedSheet,
  type ColumnMapping,
  type ImportSummary,
  type SystemFieldKey,
} from '@/lib/importer/types'
import { parseSpreadsheetFile, suggestColumnMapping } from '@/lib/importer/sheetParser'
import { executeBatchImport, type ProgressCallbackData } from '@/lib/importer/importService'

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'summary'

export default function ImportPatients() {
  const [step, setStep] = useState<ImportStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [isReadingFile, setIsReadingFile] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedSheet | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping>({})

  // Configurações do Lote
  const [selectedStage, setSelectedStage] = useState<StageId>('reativacao') // Default solicitado para reativação de base antiga
  const [dedupMode, setDedupMode] = useState<'update' | 'skip'>('update')

  // Progresso da importação
  const [progressData, setProgressData] = useState<ProgressCallbackData>({
    processed: 0,
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    currentBatch: 0,
    totalBatches: 0,
    percentage: 0,
  })

  // Relatório Final
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const navigate = useNavigate()

  // 1. Tratamento de Arquivo
  const handleFileSelected = async (selectedFile: File) => {
    const name = selectedFile.name.toLowerCase()
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      toast({
        title: 'Formato inválido',
        description: 'Por favor envie um arquivo com extensão .xlsx, .xls ou .csv',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsReadingFile(true)
      setFile(selectedFile)
      const data = await parseSpreadsheetFile(selectedFile)

      if (data.rows.length === 0) {
        toast({
          title: 'Planilha sem dados',
          description: 'O arquivo não contém linhas de dados válidas.',
          variant: 'destructive',
        })
        setIsReadingFile(false)
        return
      }

      setParsedData(data)
      const initialMapping = suggestColumnMapping(data.headers)
      setMapping(initialMapping)
      setStep('mapping')

      toast({
        title: 'Arquivo processado!',
        description: `${data.totalRows} linhas detectadas com ${data.headers.length} colunas.`,
      })
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Falha ao ler arquivo',
        description: err.message || 'Erro ao decodificar a planilha.',
        variant: 'destructive',
      })
    } finally {
      setIsReadingFile(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0])
    }
  }

  // 2. Mapeamento
  const handleMappingChange = (header: string, fieldKey: string) => {
    setMapping((prev) => ({
      ...prev,
      [header]: fieldKey as SystemFieldKey | 'ignore',
    }))
  }

  // Contagem de colunas mapeadas
  const mappedCount = Object.values(mapping).filter((v) => v !== 'ignore').length

  // 3. Execução da Importação
  const handleStartImport = async () => {
    if (!parsedData) return
    setStep('importing')

    try {
      const result = await executeBatchImport(
        parsedData.rows,
        mapping,
        {
          stage: selectedStage,
          dedupMode,
          batchSize: 15,
        },
        (progress) => {
          setProgressData(progress)
        },
      )

      setSummary(result)
      setStep('summary')
      toast({
        title: 'Importação concluída!',
        description: `${result.created} criados, ${result.updated} atualizados.`,
      })
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro na importação',
        description: err.message || 'Falha durante o processamento do lote.',
        variant: 'destructive',
      })
    }
  }

  // Baixar modelo de exemplo CSV
  const handleDownloadSample = () => {
    const headers = [
      'Nome completo',
      'CPF',
      'Data de Nascimento',
      'Gênero',
      'Fone / WhatsApp',
      'Por que nos procurou?',
      'Tem alguma dor ou incômodo?',
      'Caso tenha alguma dor ou incômodo, onde é?',
      'Pratica alguma atividade física?',
      'Qual (is)?',
      'Com que frequência na semana pratica?',
      'Qual a duração em média por dia praticado?',
      'Faz dieta ou algum controle alimentar?',
      'Rua / Avenida',
      'Nº',
      'Complemento',
      'Bairro',
      'Cidade',
      'Estado (UF)',
      'CEP',
      'Ponto de Referência',
      'Como conheceu a Clínica?',
      'No caso de INDICAÇÃO, quem lhe indicou?',
      'Utilize o espaço abaixo caso tenha alguma informação sobre você que seja importante sabermos.',
    ]

    const sampleRow = [
      'Exemplo Maria da Silva',
      '123.456.789-00',
      '15/03/1985',
      'Feminino',
      '+55 19 98888-7777',
      'Fisioterapia e reabilitação postural',
      'Sim',
      'Lombar e coluna cervical',
      'Sim',
      'Pilates e caminhada',
      '2 x',
      'Até 45 minutos',
      'Não',
      'Avenida das Acácias',
      '120',
      'Apto 32',
      'Centro',
      'Vinhedo',
      'SP',
      '13280000',
      'Próximo ao Teatro Municipal',
      'Pesquisa na Internet (Google)',
      '',
      'Paciente com histórico de hérnia discal L4-L5',
    ]

    const csvContent =
      '\uFEFF' +
      headers.map((h) => `"${h}"`).join(';') +
      '\n' +
      sampleRow.map((c) => `"${c}"`).join(';') +
      '\n'

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'modelo_importacao_pacientes_soul.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header com navegação de migalhas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/patients" className="hover:text-teal-600 transition-colors">
              Pacientes
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-800 font-medium">Importação por Planilha</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Importação de Pacientes em Lote
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Cadastre bases de clientes antigos (ex: SportFisio / SOUL) e integre-os diretamente na
            Jornada do Paciente para comunicação e revenda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSample}
            className="text-xs text-slate-600"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-teal-600" />
            Baixar Modelo CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/patients')}
            className="text-xs text-slate-600"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Voltar
          </Button>
        </div>
      </div>

      {/* Indicador de Etapas / Stepper */}
      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        {[
          { key: 'upload', title: '1. Arquivo', desc: 'Upload .xlsx ou .csv' },
          { key: 'mapping', title: '2. Mapeamento', desc: 'Campos e Etapa' },
          { key: 'preview', title: '3. Revisão', desc: 'Validação e Amostra' },
          { key: 'summary', title: '4. Relatório', desc: 'Resultados e Erros' },
        ].map((item, idx) => {
          const isCurrent = step === item.key || (step === 'importing' && item.key === 'preview')
          const isCompleted =
            (step === 'mapping' && idx < 1) ||
            (step === 'preview' && idx < 2) ||
            (step === 'importing' && idx < 3) ||
            (step === 'summary' && idx <= 3)

          return (
            <div
              key={item.key}
              className={`p-3 rounded-xl border transition-all ${
                isCurrent
                  ? 'bg-teal-50/70 border-teal-500 text-teal-900 shadow-xs'
                  : isCompleted
                    ? 'bg-slate-50 border-slate-200 text-slate-700'
                    : 'bg-white border-slate-200 text-slate-400 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">{item.title}</span>
                {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">{item.desc}</p>
            </div>
          )
        })}
      </div>

      {/* ========================================================
          ETAPA 1: UPLOAD DO ARQUIVO
      ======================================================== */}
      {step === 'upload' && (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">
              Selecione ou Arraste sua Planilha
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Compatível com arquivos exportados do Google Forms, Excel, SportFisio (.xlsx, .xls ou
              .csv).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelected(e.target.files[0])
                }
              }}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-teal-500 bg-slate-50 hover:bg-teal-50/30 rounded-2xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center shadow-xs">
                {isReadingFile ? (
                  <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
                ) : (
                  <Upload className="w-8 h-8" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">
                  {isReadingFile
                    ? 'Lendo e estruturando planilha...'
                    : 'Clique para escolher ou arraste o arquivo aqui'}
                </p>
                <p className="text-xs text-slate-500">
                  Formatos aceitos: Microsoft Excel (.xlsx, .xls) ou Valores Separados por Vírgula
                  (.csv)
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-teal-600 text-teal-700 hover:bg-teal-50"
              >
                Procurar no Computador
              </Button>
            </div>

            {/* Dicas e Recursos da Importação */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-200">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Normalização Automática
                </p>
                <p className="text-slate-600">
                  Datas (DD/MM/AAAA, sem barras ou timestamps), telefones com DDI +55 e CPFs são
                  padronizados.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-200">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-teal-600" />
                  Mapeamento Flexível
                </p>
                <p className="text-slate-600">
                  O sistema reconhece as colunas reais da planilha da clínica e permite ajustar
                  qualquer campo.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-200">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-purple-600" />
                  Deduplicação Inteligente
                </p>
                <p className="text-slate-600">
                  Evita registros duplicados por CPF ou Nome + Telefone, com opção de atualizar ou
                  pular.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================
          ETAPA 2: MAPEAMENTO DE COLUNAS & CONFIGURAÇÕES
      ======================================================== */}
      {step === 'mapping' && parsedData && (
        <div className="space-y-6">
          {/* Card com configurações globais do lote */}
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-900">
                1. Configurações da Jornada e Deduplicação
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Defina em qual etapa do funil esses pacientes entrarão e como lidar com clientes já
                cadastrados.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
              {/* Etapa inicial do funil */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">
                  Etapa Inicial do Funil (para todo o lote)
                </Label>
                <Select
                  value={selectedStage}
                  onValueChange={(val: StageId) => setSelectedStage(val)}
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: s.color }}
                          />
                          <span className="font-medium">{s.name}</span>
                          <span className="text-[10px] text-slate-400">({s.description})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-500">
                  Recomendado para base antiga: <strong>Reativação</strong> (clientes para novo
                  contato e oportunidade de revenda).
                </p>
              </div>

              {/* Deduplicação */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Regra de Deduplicação</Label>
                <RadioGroup
                  value={dedupMode}
                  onValueChange={(val: 'update' | 'skip') => setDedupMode(val)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
                    <RadioGroupItem value="update" id="dedup-update" />
                    <Label htmlFor="dedup-update" className="text-xs cursor-pointer">
                      <span className="font-semibold text-slate-900">
                        Atualizar existentes (Recomendado)
                      </span>{' '}
                      — atualiza dados e move para a etapa{' '}
                      <strong>{STAGES.find((s) => s.id === selectedStage)?.name}</strong>.
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
                    <RadioGroupItem value="skip" id="dedup-skip" />
                    <Label htmlFor="dedup-skip" className="text-xs cursor-pointer">
                      <span className="font-semibold text-slate-900">Pular duplicados</span> —
                      mantém o registro atual intacto e não cadastra repetido.
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          {/* Card com mapeamento de colunas */}
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  2. Mapeamento de Colunas ({mappedCount} de {parsedData.headers.length} mapeadas)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Revise o campo do sistema correspondente a cada coluna do seu arquivo. Colunas não
                  mapeadas serão ignoradas.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMapping(suggestColumnMapping(parsedData.headers))}
                className="text-xs text-teal-700 border-teal-200 hover:bg-teal-50"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Auto-mapear novamente
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <tr>
                      <th className="py-2.5 px-4 w-1/3">Coluna no Arquivo</th>
                      <th className="py-2.5 px-4 w-1/3">Exemplo (Linha 1)</th>
                      <th className="py-2.5 px-4 w-1/3">Campo no Sistema</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedData.headers.map((header) => {
                      const currentField = mapping[header] || 'ignore'
                      const sampleVal = parsedData.rows[0]?.[header]

                      return (
                        <tr key={header} className="hover:bg-slate-50/50">
                          <td className="py-2 px-4 font-medium text-slate-800">{header}</td>
                          <td className="py-2 px-4 text-slate-500 truncate max-w-xs font-mono text-[11px]">
                            {sampleVal !== null &&
                            sampleVal !== undefined &&
                            String(sampleVal).trim() !== '' ? (
                              String(sampleVal)
                            ) : (
                              <span className="text-slate-300 italic">(vazio)</span>
                            )}
                          </td>
                          <td className="py-2 px-4">
                            <Select
                              value={currentField}
                              onValueChange={(val) => handleMappingChange(header, val)}
                            >
                              <SelectTrigger className="h-8 text-xs border-slate-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="max-h-80">
                                <SelectItem value="ignore" className="text-slate-400 font-medium">
                                  — Não importar (Ignorar) —
                                </SelectItem>
                                {SYSTEM_FIELDS.map((sf) => (
                                  <SelectItem key={sf.key} value={sf.key}>
                                    <div className="flex items-center justify-between gap-2">
                                      <span>{sf.label}</span>
                                      {sf.required && (
                                        <span className="text-[10px] text-amber-600 font-bold">
                                          *
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-between pt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep('upload')}
                  className="text-xs text-slate-600"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                  Trocar de Arquivo
                </Button>

                <Button
                  size="sm"
                  onClick={() => setStep('preview')}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs"
                >
                  Avançar para Pré-Visualização
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================
          ETAPA 3: PRÉ-VISUALIZAÇÃO DOS PRIMEIROS REGISTROS
      ======================================================== */}
      {step === 'preview' && parsedData && (
        <Card className="border-slate-200 bg-white shadow-sm space-y-6 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Pré-Visualização dos Primeiros Registros (Amostra)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Mostrando como os dados serão inseridos na coleção de pacientes da clínica SOUL.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold">
                Total: {parsedData.totalRows} pacientes
              </Badge>
              <Badge className="bg-teal-600 text-white text-xs font-semibold">
                Etapa: {STAGES.find((s) => s.id === selectedStage)?.name}
              </Badge>
            </div>
          </div>

          {/* Tabela de Amostra dos primeiros 5 registros */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Nome</th>
                  <th className="py-2.5 px-3">Telefone / WhatsApp</th>
                  <th className="py-2.5 px-3">CPF</th>
                  <th className="py-2.5 px-3">Data Nasc.</th>
                  <th className="py-2.5 px-3">Dor / Incômodo</th>
                  <th className="py-2.5 px-3">Cidade/UF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsedData.rows.slice(0, 5).map((row, idx) => {
                  // Mapear campos para exibição na amostra
                  const findVal = (key: SystemFieldKey) => {
                    const col = Object.entries(mapping).find(([_, v]) => v === key)?.[0]
                    return col ? row[col] : null
                  }

                  const name = findVal('name')
                  const phone = findVal('phone')
                  const cpf = findVal('cpf')
                  const birth = findVal('birth_date')
                  const pain = findVal('has_pain')
                  const city = findVal('city')
                  const uf = findVal('state')

                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {String(name || '-')}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                        {String(phone || '-')}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                        {String(cpf || '-')}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{String(birth || '-')}</td>
                      <td className="py-2.5 px-3 text-slate-600">{String(pain || '-')}</td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {city ? `${city}/${uf || ''}` : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Aviso sobre processamento em lotes:</p>
              <p className="mt-0.5">
                Os dados serão inseridos em lotes com normalização em segundo plano e registro
                automático no histórico de eventos da jornada de cada paciente. Linhas que não
                contenham nem nome nem telefone serão desconsideradas e listadas no relatório.
              </p>
            </div>
          </div>

          {/* Botões */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep('mapping')}
              className="text-xs text-slate-600"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Voltar ao Mapeamento
            </Button>

            <Button
              size="sm"
              onClick={handleStartImport}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm shadow-teal-600/20 px-6"
            >
              Iniciar Importação de {parsedData.totalRows} Pacientes
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </Card>
      )}

      {/* ========================================================
          ETAPA 4: PROCESSANDO IMPORTAÇÃO (PROGRESS BAR)
      ======================================================== */}
      {step === 'importing' && (
        <Card className="border-slate-200 bg-white shadow-sm p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto shadow-xs">
            <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">
              Importando e Registrando Pacientes...
            </h2>
            <p className="text-xs text-slate-500">
              Processando lote {progressData.currentBatch} de {progressData.totalBatches} (
              {progressData.processed} de {progressData.total} registros)
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <Progress value={progressData.percentage} className="h-3" />
            <div className="flex justify-between text-xs text-slate-500 font-mono">
              <span>{progressData.percentage}% concluído</span>
              <span>
                {progressData.processed} / {progressData.total}
              </span>
            </div>
          </div>

          {/* Contadores em tempo real */}
          <div className="grid grid-cols-4 gap-3 max-w-lg mx-auto pt-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-slate-500 text-[10px] font-bold uppercase">Novos</p>
              <p className="text-base font-extrabold text-emerald-600">{progressData.created}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-slate-500 text-[10px] font-bold uppercase">Atualizados</p>
              <p className="text-base font-extrabold text-teal-600">{progressData.updated}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-slate-500 text-[10px] font-bold uppercase">Pulados</p>
              <p className="text-base font-extrabold text-slate-500">{progressData.skipped}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-slate-500 text-[10px] font-bold uppercase">Erros</p>
              <p className="text-base font-extrabold text-rose-600">{progressData.errors}</p>
            </div>
          </div>
        </Card>
      )}

      {/* ========================================================
          ETAPA 5: RELATÓRIO FINAL DA IMPORTAÇÃO
      ======================================================== */}
      {step === 'summary' && summary && (
        <div className="space-y-6">
          <Card className="border-slate-200 bg-white shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Importação Finalizada com Sucesso!
                </h2>
                <p className="text-xs text-slate-500">
                  A base de pacientes foi sincronizada com a coleção oficial e inserida na etapa{' '}
                  <strong className="text-slate-800">
                    {STAGES.find((s) => s.id === summary.stageUsed)?.name}
                  </strong>
                  .
                </p>
              </div>
            </div>

            {/* Quadro de Resumo de Números */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <p className="text-emerald-700 text-[11px] font-bold">Novos Pacientes Criados</p>
                <p className="text-2xl font-black text-emerald-800 mt-1">{summary.created}</p>
              </div>

              <div className="p-4 bg-teal-50 rounded-xl border border-teal-200">
                <p className="text-teal-700 text-[11px] font-bold">Pacientes Atualizados</p>
                <p className="text-2xl font-black text-teal-800 mt-1">{summary.updated}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-slate-600 text-[11px] font-bold">Pulados (Duplicados)</p>
                <p className="text-2xl font-black text-slate-700 mt-1">{summary.skipped}</p>
              </div>

              <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
                <p className="text-rose-700 text-[11px] font-bold">Linhas com Erro / Inválidas</p>
                <p className="text-2xl font-black text-rose-800 mt-1">{summary.errorsCount}</p>
              </div>
            </div>

            {/* Lista detalhada de erros caso existam */}
            {summary.errors.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  Detalhes das Linhas que não puderam ser importadas ({summary.errors.length}):
                </h3>
                <div className="border border-slate-200 rounded-xl max-h-60 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Linha</th>
                        <th className="py-2 px-3">Identificação</th>
                        <th className="py-2 px-3">Motivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summary.errors.map((err, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono text-slate-500">#{err.rowNumber}</td>
                          <td className="py-2 px-3 text-slate-800 font-medium">
                            {err.name || err.phone || 'Sem nome/telefone'}
                          </td>
                          <td className="py-2 px-3 text-rose-600">{err.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Ações pós-importação */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStep('upload')
                  setFile(null)
                  setParsedData(null)
                  setSummary(null)
                }}
                className="text-xs text-slate-600 w-full sm:w-auto"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Importar Outra Planilha
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  size="sm"
                  onClick={() => navigate('/funnel')}
                  variant="outline"
                  className="text-xs text-teal-700 border-teal-300 w-full sm:w-auto"
                >
                  Ver Funil de Conversão
                </Button>

                <Button
                  size="sm"
                  onClick={() => navigate('/patients')}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs w-full sm:w-auto"
                >
                  Ir para Carteira de Pacientes
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
