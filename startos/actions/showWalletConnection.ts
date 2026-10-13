import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { store } from '../fileModels/store.json'
import { announcementUrl, effectiveReadMore, profile, stopped } from '../utils'

export const showWalletConnection = sdk.Action.withoutInput(
  'show-wallet-connection',
  {
    ...stopped(
      'Show Wallet Connection',
      'Copy the connection string for the selected public coordinator address.',
      '3. Discovery',
    ),
    allowedStatuses: 'any',
  },
  async ({ effects }) => {
    const url = await announcementUrl.once(effects)
    if (!url)
      throw new Error(
        i18n('Select an enabled public announcement address first.'),
      )
    const a = (await store.read().once())!.announcement!
    const connection = `name=${encodeURIComponent(a.CoordinatorName)}&network=${profile.network}&coordinatorUri=${encodeURIComponent(url)}&coordinationFeeRate=0&readMore=${encodeURIComponent(effectiveReadMore(a.ReadMoreUri, url))}&absoluteMinInputCount=${a.AbsoluteMinInputCount}`
    return {
      version: '1',
      title: i18n('Wallet Connection'),
      message: i18n(
        'Share this connection string with compatible Wasabi wallets.',
      ),
      result: {
        type: 'single',
        value: connection,
        copyable: true,
        qr: true,
        masked: false,
        launchable: false,
      },
    }
  },
)
