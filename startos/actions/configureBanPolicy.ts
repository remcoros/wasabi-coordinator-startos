import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { config } from '../fileModels/config'
import {
  bitcoinAmount,
  duration,
  number,
  saved,
  seconds,
  stopped,
} from '../utils'

const { InputSpec } = sdk

export const configureBanPolicy = sdk.Action.withInput(
  'configure-ban-policy',
  {
    ...stopped(
      'Configure Ban Policy',
      'Set ban durations and disruption penalty factors.',
      '4. Advanced',
    ),
    warning: null,
  },
  InputSpec.of({
    severity: number(
      'Disruption Budget',
      0.1,
      0.00000001,
      21000000,
      'BTC/h',
      false,
      'BTC per hour used to calculate disruption bans. Higher values increase ban duration.',
    ),
    verification: number(
      'Failed Verification Ban',
      2678400,
      0,
      31536000,
      's',
      true,
      'Ban duration after failed ownership verification.',
    ),
    cheating: number(
      'Cheating Ban',
      86400,
      0,
      31536000,
      's',
      true,
      'Ban duration for detected cheating.',
    ),
    minimum: number(
      'Minimum Ban',
      1200,
      0,
      31536000,
      's',
      true,
      'Calculated disruption bans below this duration are not applied.',
    ),
    confirmation: number(
      'Confirmation Penalty Factor',
      0.2,
      0,
      100,
      null,
      false,
      'Multiplier applied when an input does not confirm its connection.',
    ),
    ready: number(
      'Readiness Penalty Factor',
      1,
      0,
      100,
      null,
      false,
      'Multiplier applied when an input does not signal that it is ready to sign.',
    ),
    signing: number(
      'Signing Penalty Factor',
      1,
      0,
      100,
      null,
      false,
      'Multiplier applied when an input does not sign the CoinJoin transaction.',
    ),
    doubleSpend: number(
      'Double-Spend Penalty Factor',
      3,
      0,
      100,
      null,
      false,
      'Multiplier applied when a registered UTXO is spent before the round ends.',
    ),
  }),
  async () => {
    const c = await config.read().once()
    return c
      ? {
          severity: Number(c.DoSSeverity),
          verification: seconds(c.DoSMinTimeForFailedToVerify),
          cheating: seconds(c.DoSMinTimeForCheating),
          minimum: seconds(c.DoSMinTimeInPrison),
          confirmation: c.DoSPenaltyFactorForDisruptingConfirmation,
          ready: c.DoSPenaltyFactorForDisruptingSignalReadyToSign,
          signing: c.DoSPenaltyFactorForDisruptingSigning,
          doubleSpend: c.DoSPenaltyFactorForDisruptingByDoubleSpending,
        }
      : null
  },
  async ({ effects, input }) => {
    const severity = bitcoinAmount(input.severity)
    if (severity === null)
      throw new Error(
        i18n(
          'Enter a disruption budget with no more than eight decimal places.',
        ),
      )
    await config.merge(effects, {
      DoSSeverity: severity,
      DoSMinTimeForFailedToVerify: duration(input.verification),
      DoSMinTimeForCheating: duration(input.cheating),
      DoSMinTimeInPrison: duration(input.minimum),
      DoSPenaltyFactorForDisruptingConfirmation: input.confirmation,
      DoSPenaltyFactorForDisruptingSignalReadyToSign: input.ready,
      DoSPenaltyFactorForDisruptingSigning: input.signing,
      DoSPenaltyFactorForDisruptingByDoubleSpending: input.doubleSpend,
    })
    return saved()
  },
)
