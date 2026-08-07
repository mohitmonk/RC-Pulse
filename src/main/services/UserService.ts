import { UserProfile } from '../../types/user'
import { RingCentralClient } from '../auth/RingCentral'
import { TokenStore } from '../auth/TokenStore'
import { Logger } from '../utils/Logger'

export class UserService {
  public static async getCurrentUser(client: RingCentralClient): Promise<UserProfile> {
    const tokens = await TokenStore.getTokens()
    if (!client || !tokens || !tokens.accessToken) {
      throw new Error('RingCentral client is not authenticated')
    }

    const extInfo = (await client.fetchApi('/account/~/extension/~')) as any
    if (!extInfo || !extInfo.id) {
      throw new Error('Could not retrieve RingCentral extension profile')
    }

    let presenceInfo: any = null
    try {
      presenceInfo = (await client.fetchApi('/account/~/extension/~/presence')) as any
    } catch (err: any) {
      Logger.warn('Failed to fetch presence info from RingCentral API:', err?.message || err)
    }

    const firstName = extInfo.contact?.firstName || ''
    const lastName = extInfo.contact?.lastName || ''
    const name = extInfo.name || `${firstName} ${lastName}`.trim() || `Extension ${extInfo.extensionNumber || extInfo.id}`

    return {
      id: String(extInfo.id),
      extensionId: String(extInfo.id),
      accountId: String(extInfo.account?.id || 'acc_active'),
      name,
      firstName: firstName || 'RingCentral',
      lastName: lastName || 'User',
      email: extInfo.contact?.email || 'user@ringcentral.com',
      extensionNumber: extInfo.extensionNumber || '101',
      status: extInfo.status || 'Enabled',
      contactPhone: extInfo.contact?.businessPhone || '',
      companyName: extInfo.account?.name || 'RingCentral Account',
      site: extInfo.site ? { id: String(extInfo.site.id), name: extInfo.site.name } : undefined,
      presenceStatus: presenceInfo?.presenceStatus || 'Available',
      userStatus: presenceInfo?.userStatus || 'Online'
    }
  }
}


