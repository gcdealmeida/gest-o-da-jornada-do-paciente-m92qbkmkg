// Utilitários de normalização para importação de pacientes (pt-BR)

/**
 * Remove espaços extras nas pontas e normaliza espaços internos múltiplos.
 * Retorna null se for vazio.
 */
export function cleanText(val: unknown): string | null {
  if (val === null || val === undefined) return null
  const str = String(val).replace(/\s+/g, ' ').trim()
  return str.length > 0 ? str : null
}

/**
 * Normaliza CPF:
 * - Remove pontuação (pontos, traços, barras)
 * - Completa com zeros à esquerda se tiver entre 9 e 10 dígitos (caso comum de export Excel numérico)
 * - Se tiver exatamente 11 dígitos, formata opcionalmente ou armazena 11 dígitos limpos
 * - Retorna apenas dígitos (11 chars) ou null se inválido/vazio
 */
export function normalizeCpf(val: unknown): string | null {
  if (val === null || val === undefined) return null
  const digits = String(val).replace(/\D/g, '')
  if (!digits) return null

  // Se o Excel comeu os zeros à esquerda (ex: 9 ou 10 dígitos)
  let clean = digits
  if (clean.length > 0 && clean.length < 11) {
    clean = clean.padStart(11, '0')
  }

  // Verifica se tem 11 dígitos válidos
  if (clean.length === 11) {
    return clean
  }

  return clean || null
}

/**
 * Formata CPF para exibição: 000.000.000-00
 */
export function formatCpf(cpf: string | null | undefined): string {
  if (!cpf) return ''
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return cpf
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/**
 * Normaliza telefone para o padrão brasileiro com DDI 55:
 * Formatos de entrada:
 * - "(19) 99519-1425"
 * - "19995191425"
 * - "011983160131" (com zero de operadora na frente)
 * - "+55 19 99519-1425"
 * - "5519995191425"
 * - "19 99519 1425"
 *
 * Saída normalizada: "+5519995191425" (E.164 padronizado)
 */
export function normalizePhone(val: unknown): string | null {
  if (val === null || val === undefined) return null
  let digits = String(val).replace(/\D/g, '')
  if (!digits) return null

  // Remove leading zeroes (ex: 011 -> 11)
  while (digits.startsWith('0') && digits.length > 10) {
    digits = digits.slice(1)
  }

  // Se já começar com DDI 55
  if (digits.startsWith('55') && digits.length >= 12) {
    // 55 + DDD (2) + 8 ou 9 dígitos = 12 ou 13 dígitos
    return `+${digits}`
  }

  // Se tiver 10 ou 11 dígitos (DDD + número no Brasil)
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`
  }

  // Se tiver 8 ou 9 dígitos (sem DDD), não sabemos o DDD, mas ainda assim guardamos dígitos
  if (digits.length === 8 || digits.length === 9) {
    return `+55${digits}`
  }

  // Fallback: se tiver outro comprimento válido internacional
  if (digits.length >= 7) {
    return `+${digits}`
  }

  return null
}

/**
 * Formata telefone para exibição: +55 (19) 99519-1425
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return ''
  const clean = phone.replace(/[^\d+]/g, '')
  const ddi = clean.startsWith('+55') ? '+55 ' : ''
  const digits = clean.replace(/^\+55/, '').replace(/\D/g, '')

  if (digits.length === 11) {
    return `${ddi}(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `${ddi}(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return phone
}

/**
 * Normaliza datas para ISO YYYY-MM-DD (ou ISO string aceita pelo PocketBase DateField).
 * Lida com:
 * - "13/11/1991", "13/11/91"
 * - "24 03 1944"
 * - "30051983" (DDMMAAAA 8 dígitos)
 * - "2023-11-17", "2023-11-17T15:35:45"
 * - Google Forms timestamp: "Fri Nov 17 2023 15:35:45 GMT+0000"
 * - Números seriais do Excel (ex: 34500)
 */
export function normalizeDate(val: unknown): string | null {
  if (val === null || val === undefined) return null
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10)
  }

  // Se for número serial do Excel (dias desde 1899-12-30)
  if (typeof val === 'number') {
    if (val > 1000 && val < 60000) {
      // Excel epoch: 25569 days between 1899-12-30 and 1970-01-01
      const date = new Date(Math.round((val - 25569) * 86400 * 1000))
      if (!isNaN(date.getTime())) {
        return date.toISOString().slice(0, 10)
      }
    }
  }

  const str = String(val).trim()
  if (!str) return null

  // 1. Tentar parse padrão Date (Google Forms timestamp / ISO)
  const parsedTimestamp = Date.parse(str)
  if (!isNaN(parsedTimestamp) && (str.includes('GMT') || str.includes('T') || str.includes('-'))) {
    const d = new Date(parsedTimestamp)
    return d.toISOString().slice(0, 10)
  }

  // 2. Formato brasileiro com barra ou hífen ou ponto: DD/MM/YYYY ou DD-MM-YYYY ou DD.MM.YYYY
  const brMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/)
  if (brMatch) {
    const day = parseInt(brMatch[1], 10)
    const month = parseInt(brMatch[2], 10)
    let year = parseInt(brMatch[3], 10)
    if (year < 100) {
      year += year > 30 ? 1900 : 2000
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const padM = String(month).padStart(2, '0')
      const padD = String(day).padStart(2, '0')
      return `${year}-${padM}-${padD}`
    }
  }

  // 3. Formato com espaço: "24 03 1944"
  const spaceMatch = str.match(/^(\d{1,2})\s+(\d{1,2})\s+(\d{4})$/)
  if (spaceMatch) {
    const day = parseInt(spaceMatch[1], 10)
    const month = parseInt(spaceMatch[2], 10)
    const year = parseInt(spaceMatch[3], 10)
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const padM = String(month).padStart(2, '0')
      const padD = String(day).padStart(2, '0')
      return `${year}-${padM}-${padD}`
    }
  }

  // 4. Formato compacto de 8 dígitos: "30051983" (DDMMAAAA)
  const digits = str.replace(/\D/g, '')
  if (digits.length === 8) {
    const day = parseInt(digits.slice(0, 2), 10)
    const month = parseInt(digits.slice(2, 4), 10)
    const year = parseInt(digits.slice(4, 8), 10)
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      const padM = String(month).padStart(2, '0')
      const padD = String(day).padStart(2, '0')
      return `${year}-${padM}-${padD}`
    }
  }

  return null
}

/**
 * Normaliza booleano (Sim / Não, 1 / 0, True / False, S / N)
 */
export function normalizeBool(val: unknown): boolean | null {
  if (val === null || val === undefined) return null
  const s = String(val).trim().toLowerCase()
  if (!s) return null
  if (['sim', 's', 'true', '1', 'yes', 'y'].includes(s)) return true
  if (['não', 'nao', 'n', 'false', '0', 'no'].includes(s)) return false
  return null
}

/**
 * Normaliza nome: Remove múltiplos espaços, capitaliza adequadamente
 */
export function normalizeName(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val).replace(/\s+/g, ' ').trim()
  if (!str) return ''

  // Preposições em minúsculas
  const preps = new Set(['de', 'da', 'do', 'dos', 'das', 'e'])
  const parts = str.split(' ')

  const capitalized = parts.map((part, idx) => {
    const lower = part.toLowerCase()
    if (idx > 0 && preps.has(lower)) {
      return lower
    }
    // Preservar se tem parênteses ex: "(Manoela)"
    if (part.startsWith('(') && part.length > 2) {
      return `(${part.charAt(1).toUpperCase()}${part.slice(2).toLowerCase()}`
    }
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
  })

  return capitalized.join(' ')
}

/**
 * Normaliza canal de origem sugerido com base no texto livre de "Como conheceu"
 */
export function inferChannelOrigin(
  sourceText?: string | null,
): 'whatsapp' | 'instagram' | 'email' | 'outros' {
  if (!sourceText) return 'whatsapp'
  const s = sourceText.toLowerCase()
  if (s.includes('insta') || s.includes('direct') || s.includes('face') || s.includes('rede')) {
    return 'instagram'
  }
  if (s.includes('whats') || s.includes('zap') || s.includes('msg')) {
    return 'whatsapp'
  }
  if (s.includes('mail') || s.includes('e-mail')) {
    return 'email'
  }
  return 'outros'
}

/**
 * Gera chave de deduplicação a partir do nome + telefone normalizado
 */
export function getDedupKey(name: string, phone?: string | null): string {
  const normName = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
  const normPhone = phone ? phone.replace(/\D/g, '') : ''
  return `${normName}_${normPhone}`
}
