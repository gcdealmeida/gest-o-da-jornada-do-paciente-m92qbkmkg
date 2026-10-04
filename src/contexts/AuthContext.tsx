import React, { createContext, useContext, useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import type { UserRecord } from '@/types/crm'

interface AuthContextType {
  user: UserRecord | null
  loading: boolean
  login: (email: string, pass: string) => Promise<void>
  logout: () => void
  signup: (name: string, email: string, pass: string, role?: string) => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserRecord | null>(() => {
    return (pb.authStore.record as unknown as UserRecord) || null
  })
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const unsub = pb.authStore.onChange((_token, model) => {
      setUser((model as unknown as UserRecord) || null)
    })

    // Check validity and refresh auth state on mount
    if (pb.authStore.isValid) {
      pb.collection('users')
        .authRefresh()
        .then((res) => {
          setUser((res.record as unknown as UserRecord) || null)
        })
        .catch(() => {
          pb.authStore.clear()
          setUser(null)
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }

    return () => {
      unsub()
    }
  }, [])

  const login = async (email: string, pass: string) => {
    const authData = await pb.collection('users').authWithPassword(email, pass)
    setUser((authData.record as unknown as UserRecord) || null)
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
  }

  const signup = async (
    name: string,
    email: string,
    pass: string,
    role: string = 'Recepcionista',
  ) => {
    await pb.collection('users').create({
      email,
      password: pass,
      passwordConfirm: pass,
      name,
      role,
    })
    try {
      await pb.collection('users').requestVerification(email)
    } catch {
      /* intentionally ignored */
    }
  }

  const refreshUser = async () => {
    if (pb.authStore.isValid) {
      const authData = await pb.collection('users').authRefresh()
      setUser((authData.record as unknown as UserRecord) || null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, signup, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
