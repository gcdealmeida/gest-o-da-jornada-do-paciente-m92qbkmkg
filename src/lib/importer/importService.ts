// Serviço de processamento em lotes e persistência de importação
import pb from '@/lib/pocketbase/client'
import type { PatientRecord, StageId } from '@/types/crm'
import type {
  ColumnMapping,
  ImportOptions,
  ImportSummary,
  ImportErrorDetail,
  SystemFieldKey,
} from './types'
import {
  cleanText,
  normalizeCpf,
  normalizeDate,
  normalizePhone,
  normalizeBool,
  normalizeName,
  inferChannelOrigin,
  getDedupKey,
} from './normalizers'

export interface ProgressCallbackData {
  processed: number
  total: number
  created: number
  updated: number
  skipped: number
  errors: number
  currentBatch: number
  totalBatches: number
  percentage: number
}

export type ProgressCallback = (data: ProgressCallbackData) => void

/**
 * Normaliza uma linha bruta da planilha aplicando o mapeamento
 */
export function transformRow(
  rawRow: Record<string, unknown>,
  mapping: ColumnMapping,
  stage: StageId,
): {
  patientData: Partial<PatientRecord>
  originalTimestamp?: string | null
  isValid: boolean
  validationError?: string
} {
  const mappedValues: Partial<Record<SystemFieldKey, unknown>> = {}

  for (const [colName, fieldKey] of Object.entries(mapping)) {
    if (fieldKey === 'ignore') continue
    const val = rawRow[colName]
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      // Se duas colunas mapearem pro mesmo campo, não sobrescrever se já tiver valor
      if (mappedValues[fieldKey] === undefined) {
        mappedValues[fieldKey] = val
      }
    }
  }

  const rawName = cleanText(mappedValues.name)
  const rawPhone = cleanText(mappedValues.phone)

  // Validação: pular linhas sem nome e sem telefone
  if (!rawName && !rawPhone) {
    return {
      patientData: {},
      isValid: false,
      validationError: 'Linha sem nome e sem telefone preenchidos',
    }
  }

  const name = rawName ? normalizeName(rawName) : 'Paciente Sem Nome'
  const phone = normalizePhone(rawPhone)
  const cpf = normalizeCpf(mappedValues.cpf)
  const birthDate = normalizeDate(mappedValues.birth_date)
  const email = cleanText(mappedValues.email)
  const gender = cleanText(mappedValues.gender)
  const reasonForVisit = cleanText(mappedValues.reason_for_visit)
  const hasPain = normalizeBool(mappedValues.has_pain)
  const painLocation = cleanText(mappedValues.pain_location)
  const practicesActivity = normalizeBool(mappedValues.practices_physical_activity)
  const physicalActivities = cleanText(mappedValues.physical_activities)
  const activityFrequency = cleanText(mappedValues.activity_frequency)
  const activityDuration = cleanText(mappedValues.activity_duration)
  const dietControl = cleanText(mappedValues.diet_control)
  const street = cleanText(mappedValues.street)
  const addressNumber = cleanText(mappedValues.address_number)
  const complement = cleanText(mappedValues.complement)
  const neighborhood = cleanText(mappedValues.neighborhood)
  const city = cleanText(mappedValues.city)
  const state = cleanText(mappedValues.state)
  const postalCode = cleanText(mappedValues.postal_code)
  const landmark = cleanText(mappedValues.landmark)
  const referralSource = cleanText(mappedValues.referral_source)
  const referredBy = cleanText(mappedValues.referred_by)
  const notes = cleanText(mappedValues.notes)

  const channelOrigin = inferChannelOrigin(referralSource)

  const patientData: Partial<PatientRecord> = {
    name,
    phone: phone || undefined,
    email: email || undefined,
    channel_origin: channelOrigin,
    stage: stage,
    cpf: cpf || undefined,
    birth_date: birthDate || undefined,
    gender: gender || undefined,
    reason_for_visit: reasonForVisit || undefined,
    has_pain: hasPain !== null ? hasPain : undefined,
    pain_location: painLocation || undefined,
    practices_physical_activity: practicesActivity !== null ? practicesActivity : undefined,
    physical_activities: physicalActivities || undefined,
    activity_frequency: activityFrequency || undefined,
    activity_duration: activityDuration || undefined,
    diet_control: dietControl || undefined,
    street: street || undefined,
    address_number: addressNumber || undefined,
    complement: complement || undefined,
    neighborhood: neighborhood || undefined,
    city: city || undefined,
    state: state || undefined,
    postal_code: postalCode || undefined,
    landmark: landmark || undefined,
    referral_source: referralSource || undefined,
    referred_by: referredBy || undefined,
    notes: notes || undefined,
    tags: ['lead_quente'],
    score: 75,
  }

  const originalTimestamp = cleanText(mappedValues.created_at)

  return {
    patientData,
    originalTimestamp,
    isValid: true,
  }
}

/**
 * Importa um lote completo de linhas para a coleção patients
 */
export async function executeBatchImport(
  rawRows: Record<string, unknown>[],
  mapping: ColumnMapping,
  options: ImportOptions,
  onProgress?: ProgressCallback,
): Promise<ImportSummary> {
  const startTime = Date.now()
  const summary: ImportSummary = {
    total: rawRows.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errorsCount: 0,
    errors: [],
    startTime,
    stageUsed: options.stage,
  }

  // 1. Carregar base de pacientes existentes para busca em memória (CPF e Nome+Telefone)
  // Como são centenas ou poucos milhares de registros, um getFullList é rápido (<100ms)
  let existingPatients: PatientRecord[] = []
  try {
    existingPatients = await pb.collection('patients').getFullList<PatientRecord>({
      fields: 'id,name,phone,cpf,stage',
    })
  } catch (err) {
    console.error('Falha ao carregar pacientes existentes para deduplicação:', err)
  }

  // Mapas para busca instantânea O(1)
  const cpfToPatientId = new Map<string, PatientRecord>()
  const dedupKeyToPatientId = new Map<string, PatientRecord>()

  for (const p of existingPatients) {
    if (p.cpf) {
      const clean = p.cpf.replace(/\D/g, '')
      if (clean) cpfToPatientId.set(clean, p)
    }
    const key = getDedupKey(p.name, p.phone)
    if (key) dedupKeyToPatientId.set(key, p)
  }

  const batchSize = options.batchSize || 10
  const totalRows = rawRows.length
  const totalBatches = Math.ceil(totalRows / batchSize)

  const currentUserId = pb.authStore.record?.id

  // Loop de lotes sequenciais com chunks paralelos controlados
  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const start = batchIdx * batchSize
    const chunk = rawRows.slice(start, start + batchSize)

    // Processar os itens do chunk em paralelo controlado
    await Promise.all(
      chunk.map(async (rawRow, indexInChunk) => {
        const rowNumber = start + indexInChunk + 2 // +2 considerando header linha 1 e índice base 1
        const { patientData, isValid, validationError } = transformRow(
          rawRow,
          mapping,
          options.stage,
        )

        if (!isValid) {
          summary.errorsCount++
          summary.errors.push({
            rowNumber,
            name: (rawRow['Nome completo'] as string) || (rawRow['Nome'] as string) || undefined,
            phone:
              (rawRow['Fone / WhatsApp'] as string) || (rawRow['Telefone'] as string) || undefined,
            reason: validationError || 'Dados insuficientes para criar paciente',
          })
          return
        }

        const cleanCpf = patientData.cpf ? patientData.cpf.replace(/\D/g, '') : null
        const dedupKey = getDedupKey(patientData.name || '', patientData.phone)

        // Verificar duplicado por CPF ou por chave Nome+Telefone
        let existingMatch: PatientRecord | undefined
        if (cleanCpf && cpfToPatientId.has(cleanCpf)) {
          existingMatch = cpfToPatientId.get(cleanCpf)
        } else if (dedupKeyToPatientId.has(dedupKey)) {
          existingMatch = dedupKeyToPatientId.get(dedupKey)
        }

        if (existingMatch) {
          if (options.dedupMode === 'skip') {
            summary.skipped++
            return
          }

          // Atualizar paciente existente
          try {
            const updated = await pb
              .collection('patients')
              .update<PatientRecord>(existingMatch.id, {
                ...patientData,
                stage: options.stage, // move ou consolida para a etapa escolhida
              })

            // Registrar journey_event da atualização/reativação
            try {
              await pb.collection('journey_events').create({
                patient_id: updated.id,
                type: 'mudanca_estagio',
                stage: options.stage,
                title: `Importação em lote: atualizado na etapa ${options.stage}`,
                description: `Paciente reativado/atualizado via importação de planilha para a etapa "${options.stage}".`,
                responsible_id: currentUserId,
                is_automatic: false,
              })
            } catch {
              /* intentionally ignored */
            }

            summary.updated++
            // Atualizar cache
            if (cleanCpf) cpfToPatientId.set(cleanCpf, updated)
            dedupKeyToPatientId.set(dedupKey, updated)
          } catch (err: any) {
            summary.errorsCount++
            summary.errors.push({
              rowNumber,
              name: patientData.name,
              phone: patientData.phone,
              reason: `Erro ao atualizar: ${err?.message || 'Falha de gravação'}`,
            })
          }
        } else {
          // Criar novo paciente
          try {
            const created = await pb.collection('patients').create<PatientRecord>(patientData)

            // Registrar journey_event da entrada na jornada
            try {
              await pb.collection('journey_events').create({
                patient_id: created.id,
                type: 'contato_inicial',
                stage: options.stage,
                title: `Importado para a etapa ${options.stage}`,
                description: `Paciente cadastrado via importação em lote para a etapa "${options.stage}". Origem: ${patientData.channel_origin || 'whatsapp'}.`,
                responsible_id: currentUserId,
                is_automatic: false,
              })
            } catch {
              /* intentionally ignored */
            }

            summary.created++
            // Adicionar ao mapa para evitar duplicidade dentro do próprio lote da planilha
            if (cleanCpf) cpfToPatientId.set(cleanCpf, created)
            dedupKeyToPatientId.set(dedupKey, created)
          } catch (err: any) {
            summary.errorsCount++
            summary.errors.push({
              rowNumber,
              name: patientData.name,
              phone: patientData.phone,
              reason: `Erro ao cadastrar: ${err?.message || 'Falha de gravação'}`,
            })
          }
        }
      }),
    )

    // Notificar progresso da interface
    const processedSoFar = Math.min(start + chunk.length, totalRows)
    if (onProgress) {
      onProgress({
        processed: processedSoFar,
        total: totalRows,
        created: summary.created,
        updated: summary.updated,
        skipped: summary.skipped,
        errors: summary.errorsCount,
        currentBatch: batchIdx + 1,
        totalBatches,
        percentage: Math.round((processedSoFar / totalRows) * 100),
      })
    }

    // Pequeno intervalo assíncrono para liberar renderização da UI (não travar o event loop do navegador)
    await new Promise((resolve) => setTimeout(resolve, 20))
  }

  summary.endTime = Date.now()
  return summary
}
