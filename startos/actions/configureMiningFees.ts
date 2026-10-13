import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { config } from '../fileModels/config'
import { number, saved, stopped } from '../utils'

export const configureMiningFees = sdk.Action.withInput(
  'configure-mining-fees',
  stopped(
    'Configure Mining Fees',
    'Set the confirmation target for mining fee estimates.',
    '2. Round Settings',
  ),
  sdk.InputSpec.of({
    target: number(
      'Confirmation Target',
      108,
      2,
      1008,
      i18n('blocks'),
      true,
      'Block target used to estimate the fee rate for a new round.',
    ),
  }),
  async () => ({
    target: (await config.read().once())?.ConfirmationTarget ?? 108,
  }),
  async ({ effects, input }) => {
    await config.merge(effects, { ConfirmationTarget: input.target })
    return saved()
  },
)
