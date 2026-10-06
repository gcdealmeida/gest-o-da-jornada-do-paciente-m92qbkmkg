// Parser de arquivos Excel (.xlsx, .xls) e CSV no browser
// Usa CDN dinâmica do SheetJS para XLSX (ou parser nativo RFC 4180 para CSV)
import { SYSTEM_FIELDS, type ParsedSheet, type ColumnMapping, type SystemFieldKey } from './types'

let xlsxLoadingPromise: Promise<any> | null = null

/**
 * Carrega a biblioteca SheetJS sob demanda caso ainda não esteja no window
 */
export function loadXLSXLibrary(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).XLSX) {
    return Promise.resolve((window as any).XLSX)
  }

  if (xlsxLoadingPromise) {
    return xlsxLoadingPromise
  }

  xlsxLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    // cdnjs estável e seguro
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    script.async = true
    script.onload = () => {
      if ((window as any).XLSX) {
        resolve((window as any).XLSX)
      } else {
        reject(new Error('SheetJS não foi carregado corretamente.'))
      }
    }
    script.onerror = () => {
      // Fallback para jsdelivr
      const fallbackScript = document.createElement('script')
      fallbackScript.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
      fallbackScript.async = true
      fallbackScript.onload = () => {
        if ((window as any).XLSX) {
          resolve((window as any).XLSX)
        } else {
          reject(new Error('Não foi possível carregar a biblioteca de leitura de planilhas.'))
        }
      }
      fallbackScript.onerror = () => {
        reject(new Error('Falha de conexão ao carregar o leitor de arquivos XLSX.'))
      }
      document.head.appendChild(fallbackScript)
    }
    document.head.appendChild(script)
  })

  return xlsxLoadingPromise
}

/**
 * Parser de CSV nativo robusto (lida com vírgula ou ponto-e-vírgula, aspas duplas, quebras de linha em células)
 */
export function parseCSVText(csvContent: string): ParsedSheet {
  const lines: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let insideQuotes = false

  // Detectar delimitador provável (; ou ,)
  const firstLine = csvContent.split('\n')[0] || ''
  const semicolonCount = (firstLine.match(/;/g) || []).length
  const commaCount = (firstLine.match(/,/g) || []).length
  const delimiter = semicolonCount >= commaCount ? ';' : ','

  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i]
    const nextChar = csvContent[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"'
        i++ // pula a segunda aspa escapada
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentCell.trim())
      currentCell = ''
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++
      }
      currentRow.push(currentCell.trim())
      if (currentRow.some((c) => c.length > 0)) {
        lines.push(currentRow)
      }
      currentRow = []
      currentCell = ''
    } else {
      currentCell += char
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim())
    if (currentRow.some((c) => c.length > 0)) {
      lines.push(currentRow)
    }
  }

  if (lines.length === 0) {
    return { headers: [], rows: [], totalRows: 0 }
  }

  const rawHeaders = lines[0].map((h) => h.replace(/^"|"$/g, '').trim())
  // Desduplicar headers vazios ou repetidos
  const headers = deduplicateHeaders(rawHeaders)

  const rows: Record<string, unknown>[] = []
  for (let r = 1; r < lines.length; r++) {
    const rowObj: Record<string, unknown> = {}
    const cells = lines[r]
    headers.forEach((h, idx) => {
      rowObj[h] = cells[idx] !== undefined ? cells[idx] : null
    })
    rows.push(rowObj)
  }

  return {
    headers,
    rows,
    totalRows: rows.length,
  }
}

/**
 * Lê arquivo enviado pelo usuário (.xlsx, .xls ou .csv) e retorna estrutura padronizada
 */
export async function parseSpreadsheetFile(file: File): Promise<ParsedSheet> {
  const fileName = file.name.toLowerCase()

  if (fileName.endsWith('.csv')) {
    const text = await file.text()
    return parseCSVText(text)
  }

  // Se for .xlsx ou .xls
  const XLSX = await loadXLSXLibrary()
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })

  // Pega a primeira aba
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    throw new Error('A planilha está vazia (nenhuma aba encontrada).')
  }

  const worksheet = workbook.Sheets[firstSheetName]
  // Converte para JSON com headers na linha 1
  const rawJson: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
    dateNF: 'yyyy-mm-dd',
  })

  if (!rawJson || rawJson.length === 0) {
    return { headers: [], rows: [], totalRows: 0 }
  }

  // Primeira linha com dados vira headers
  const rawHeaders: string[] = (rawJson[0] || []).map((h: any) => String(h || '').trim())
  const headers = deduplicateHeaders(rawHeaders)

  const rows: Record<string, unknown>[] = []
  for (let i = 1; i < rawJson.length; i++) {
    const line = rawJson[i]
    if (!line || line.length === 0) continue

    const rowObj: Record<string, unknown> = {}
    let hasAnyData = false

    headers.forEach((h, colIdx) => {
      const val = line[colIdx]
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        hasAnyData = true
        rowObj[h] = val
      } else {
        rowObj[h] = null
      }
    })

    if (hasAnyData) {
      rows.push(rowObj)
    }
  }

  return {
    headers,
    rows,
    totalRows: rows.length,
  }
}

/**
 * Garante que nomes de colunas sejam únicos e não vazios
 */
function deduplicateHeaders(rawHeaders: string[]): string[] {
  const counts: Record<string, number> = {}
  return rawHeaders.map((h, idx) => {
    let name = h || `Coluna_${idx + 1}`
    if (counts[name]) {
      counts[name]++
      name = `${name}_${counts[name]}`
    } else {
      counts[name] = 1
    }
    return name
  })
}

/**
 * Sugere mapeamento automático das colunas do arquivo para os campos do sistema
 */
export function suggestColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {}
  const usedKeys = new Set<SystemFieldKey>()

  headers.forEach((header) => {
    const cleanH = header
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s?]/g, '')
      .trim()

    let matchedKey: SystemFieldKey | null = null

    // Procurar match exato ou por aliases
    for (const field of SYSTEM_FIELDS) {
      if (usedKeys.has(field.key)) continue

      for (const alias of field.aliases) {
        const cleanAlias = alias
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^\w\s?]/g, '')
          .trim()

        if (cleanH === cleanAlias || cleanH.includes(cleanAlias) || cleanAlias.includes(cleanH)) {
          matchedKey = field.key
          break
        }
      }
      if (matchedKey) break
    }

    if (matchedKey) {
      mapping[header] = matchedKey
      usedKeys.add(matchedKey)
    } else {
      mapping[header] = 'ignore'
    }
  })

  return mapping
}
