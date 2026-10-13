import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { config } from '../fileModels/config'

export const useQuickRoundSettings = sdk.Action.withoutInput(
  'lab-quick-rounds',
  {
    name: i18n('Use Quick Round Settings'),
    description: i18n(
      'Apply this round preset, then start the lab and run the complete CoinJoin test.',
    ),
    warning: i18n(
      'This replaces the lab’s round settings with quick test settings.',
    ),
    allowedStatuses: 'only-stopped',
    group: i18n('5. RegTest Tests'),
    visibility: 'enabled',
  },
  async ({ effects }) => {
    await config.merge(effects, {
      MaxInputCountByRound: 4,
      MinInputCountByRoundMultiplier: 0.5,
      MinInputCountByBlameRoundMultiplier: 0.4,
      StandardInputRegistrationTimeout: '0d 0h 2m 0s',
      BlameInputRegistrationTimeout: '0d 0h 3m 0s',
      ConnectionConfirmationTimeout: '0d 0h 1m 0s',
      OutputRegistrationTimeout: '0d 0h 1m 0s',
      TransactionSigningTimeout: '0d 0h 1m 0s',
      FailFastOutputRegistrationTimeout: '0d 0h 3m 0s',
      FailFastTransactionSigningTimeout: '0d 0h 1m 0s',
      RoundExpiryTimeout: '0d 0h 5m 0s',
    })
    return {
      version: '1',
      title: i18n('Settings Saved'),
      message: i18n('Start the service to use these settings.'),
      result: null,
    }
  },
)
