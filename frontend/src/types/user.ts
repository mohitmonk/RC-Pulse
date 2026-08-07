export interface UserProfile {
  id: string
  extensionId: string
  accountId: string
  name: string
  firstName: string
  lastName: string
  email: string
  extensionNumber: string
  status: 'Enabled' | 'Disabled' | 'NotActivated'
  contactPhone?: string
  site?: {
    id: string
    name: string
  }
  companyName?: string
  presenceStatus?: 'Available' | 'Busy' | 'Offline' | 'DoNotDisturb'
  userStatus?: string
  avatarUrl?: string
}

export interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: UserProfile | null
  accessToken: string | null
  refreshToken: string | null
  expiresAt: number | null
  error: string | null
  isDemoMode: boolean
}
