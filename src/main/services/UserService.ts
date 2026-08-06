import { UserProfile } from '../../types/user'
import { RingCentralClient } from '../auth/RingCentral'
import { Logger } from '../utils/Logger'

export class UserService {
  public static getDemoUser(): UserProfile {
    return {
      id: 'usr_rc_99812',
      extensionId: 'ext_401',
      accountId: 'acc_88102',
      name: 'Sarah Connor',
      firstName: 'Sarah',
      lastName: 'Connor',
      email: 'sarah.connor@enterprise.org',
      extensionNumber: '104',
      status: 'Enabled',
      contactPhone: '+1 (555) 234-5678',
      companyName: 'Apex Enterprise Solutions',
      site: {
        id: 'site_101',
        name: 'Headquarters - San Francisco'
      },
      presenceStatus: 'Available',
      userStatus: 'Online',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
    }
  }

  public static async getCurrentUser(client?: RingCentralClient | null): Promise<UserProfile> {
    if (!client) {
      return this.getDemoUser()
    }

    try {
      const extInfo = (await client.fetchApi('/account/~/extension/~')) as any
      const presenceInfo = (await client.fetchApi('/account/~/extension/~/presence')) as any

      return {
        id: String(extInfo.id),
        extensionId: String(extInfo.id),
        accountId: String(extInfo.account?.id || 'acc_default'),
        name: extInfo.name || `${extInfo.contact?.firstName || ''} ${extInfo.contact?.lastName || ''}`.trim() || 'RingCentral User',
        firstName: extInfo.contact?.firstName || 'RingCentral',
        lastName: extInfo.contact?.lastName || 'User',
        email: extInfo.contact?.email || 'user@company.com',
        extensionNumber: extInfo.extensionNumber || '101',
        status: extInfo.status || 'Enabled',
        contactPhone: extInfo.contact?.businessPhone || '+15551234567',
        companyName: extInfo.account?.name || 'Enterprise Account',
        site: extInfo.site ? { id: String(extInfo.site.id), name: extInfo.site.name } : undefined,
        presenceStatus: presenceInfo.presenceStatus || 'Available',
        userStatus: presenceInfo.userStatus || 'Online'
      }
    } catch (err) {
      Logger.warn('Failed to fetch user from RingCentral API, defaulting to demo user:', err)
      return this.getDemoUser()
    }
  }
}
