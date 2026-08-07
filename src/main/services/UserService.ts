import { UserProfile } from '../../types/user'
import { RingCentralClient } from '../auth/RingCentral'
import { Logger } from '../utils/Logger'

export class UserService {
  public static async getCurrentUser(client: RingCentralClient): Promise<UserProfile> {
    if (!client) {
      throw new Error('RingCentral client is not authenticated')
    }

    let extInfo: any = null
    let presenceInfo: any = null

    try {
      extInfo = (await client.fetchApi('/account/~/extension/~')) as any
    } catch (err: any) {
      Logger.warn('Failed to fetch extension info from RingCentral API:', err?.message || err)
    }

    try {
      presenceInfo = (await client.fetchApi('/account/~/extension/~/presence')) as any
    } catch (err: any) {
      Logger.warn('Failed to fetch presence info from RingCentral API:', err?.message || err)
    }

    const firstName = extInfo?.contact?.firstName || 'RingCentral'
    const lastName = extInfo?.contact?.lastName || 'User'
    const name = extInfo?.name || `${firstName} ${lastName}`.trim() || 'RingCentral User'

    return {
      id: String(extInfo?.id || 'ext_active'),
      extensionId: String(extInfo?.id || 'ext_active'),
      accountId: String(extInfo?.account?.id || 'acc_active'),
      name,
      firstName,
      lastName,
      email: extInfo?.contact?.email || 'user@ringcentral.com',
      extensionNumber: extInfo?.extensionNumber || '101',
      status: extInfo?.status || 'Enabled',
      contactPhone: extInfo?.contact?.businessPhone || '+1 (555) 019-2831',
      companyName: extInfo?.account?.name || 'RingCentral Account',
      site: extInfo?.site ? { id: String(extInfo.site.id), name: extInfo.site.name } : undefined,
      presenceStatus: presenceInfo?.presenceStatus || 'Available',
      userStatus: presenceInfo?.userStatus || 'Online'
    }
  }
}


