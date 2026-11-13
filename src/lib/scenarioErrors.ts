import pb from '@/lib/pocketbase/client'
import type { ClientResponseError } from 'pocketbase'

/**
 * Helpers de tratamento de erro para os Cenários de Teste (modo demo).
 * Converte falhas cruas do PocketBase (ex.: "Failed to create record") em
 * mensagens amigáveis em pt-BR, detectando o caso de sessão expirada — que é
 * como o PocketBase responde quando a createRule (auth obrigatória) falha.
 */

const SESSION_KEY = 'soul_session_expired'

export function isAuthError(err: unknown): boolean {
  const e = err as ClientResponseError | undefined
  if (!e) return false
  // PocketBase responde 400 "Failed to create record." quando a createRule
  // (@request.auth.id != "") rejeita a criação, e 401 quando o token é
  // inválido/expirado. Ambos indicam sessão ausente ou expirada.
  const raw = typeof e?.response === 'string' ? e.response : e?.response?.message || e?.message
  if (e.status === 401) return true
  if (e.status === 0) return false // erro de rede, não de autenticação
  if (e.status === 400 && /failed to create record/i.test(String(raw))) return true
  // PocketBase v0.23+: violação de regra chega como {"message":"..."} genérico
  if (e.status === 403) return true
  return false
}

/** Marca no localStorage que a sessão expirou (o Login mostra o aviso). */
export function markSessionExpired(): void {
  try {
    localStorage.setItem(SESSION_KEY, '1')
  } catch {
    /* storage indisponível */
  }
}

/** Consome (e limpa) o aviso de sessão expirada para exibir no Login. */
export function consumeSessionExpiredFlag(): boolean {
  try {
    const has = localStorage.getItem(SESSION_KEY) === '1'
    if (has) localStorage.removeItem(SESSION_KEY)
    return has
  } catch {
    return false
  }
}

export interface ScenarioErrorInfo {
  friendlyMessage: string
  isAuth: boolean
}

/**
 * Valida a sessão antes de executar um cenário: tenta renovar o token
 * (authRefresh) quando existe um auth store salvo e devolve a mensagem
 * amigável em pt-BR quando não há sessão válida.
 */
export async function ensureValidSession(): Promise<ScenarioErrorInfo | null> {
  if (!pb.authStore.isValid || !pb.authStore.record?.id) {
    return {
      isAuth: true,
      friendlyMessage:
        'Sua sessão expirou ou você não está autenticado. Faça login novamente para executar o cenário.',
    }
  }
  try {
    await pb.collection('users').authRefresh()
    return null
  } catch {
    pb.authStore.clear()
    return {
      isAuth: true,
      friendlyMessage:
        'Sua sessão expirou. Faça login novamente para continuar usando os cenários de teste.',
    }
  }
}

/**
 * Traduz qualquer erro de execução de cenário para uma mensagem amigável
 * em pt-BR (incluindo o caso de sessão expirada).
 */
export function describeScenarioError(err: unknown): ScenarioErrorInfo {
  const authInfo = isAuthError(err)
  if (authInfo) {
    return {
      isAuth: true,
      friendlyMessage:
        'Sua sessão expirou durante a execução. Faça login novamente para executar o cenário.',
    }
  }

  const e = err as ClientResponseError | undefined
  const fieldMsgs: string[] = []
  const data = e?.response?.data
  if (data && typeof data === 'object') {
    for (const [, detail] of Object.entries(data)) {
      if (detail && typeof detail === 'object' && 'message' in detail) {
        fieldMsgs.push(String((detail as { message: unknown }).message))
      }
    }
  }

  if (e?.status === 0) {
    return {
      isAuth: false,
      friendlyMessage:
        'Não foi possível conectar ao servidor. Verifique sua internet e tente executar o cenário novamente.',
    }
  }

  const raw = typeof e?.response === 'string' ? e.response : e?.response?.message || e?.message
  if (fieldMsgs.length > 0) {
    return {
      isAuth: false,
      friendlyMessage: `Não foi possível criar alguns dados do cenário: ${fieldMsgs.join(' ')}`,
    }
  }
  if (
    raw &&
    String(raw).trim().length > 0 &&
    !/^failed to (create|update|delete) record/i.test(String(raw))
  ) {
    return {
      isAuth: false,
      friendlyMessage: `Não foi possível concluir o cenário: ${String(raw)}`,
    }
  }

  return {
    isAuth: false,
    friendlyMessage:
      'Não foi possível concluir o cenário. Tente novamente em alguns instantes — se o problema persistir, contate o suporte.',
  }
}

/** Redireciona para o login preservando a rota de origem. */
export function redirectToLogin(
  navigate: (to: string, opts?: { replace?: boolean }) => void,
  from?: string,
): void {
  markSessionExpired()
  navigate(`/login${from ? `?from=${encodeURIComponent(from)}` : ''}`, { replace: true })
}
