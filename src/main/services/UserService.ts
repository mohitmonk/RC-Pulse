import { UserProfile } from '../../types/user'
import { RingCentralClient } from '../auth/RingCentral'
import { Logger } from '../utils/Logger'

export class UserService {
  public static async getCurrentUser(client: RingCentralClient): Promise<UserProfile> {
    if (!client) {
      throw new Error('RingCentral client is not authenticated')
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
        presenceStatus: presenceInfo?.presenceStatus || 'Available',
        userStatus: presenceInfo?.userStatus || 'Online'
      }
    } catch (err: any) {
      Logger.error('Failed to fetch user from RingCentral API:', err)
      throw new Error(`Failed to load user profile from RingCentral API: ${err.message || err}`)
    }
  }
}

