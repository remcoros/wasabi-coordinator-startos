import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { config } from '../fileModels/config'
import { saved, stopped } from '../utils'

const { InputSpec, Value } = sdk

export const configureOutputPolicy = sdk.Action.withInput(
  'configure-output-policy',
  stopped(
    'Configure Coordinator Outputs',
    'Configure coordinator outputs and delayed signing.',
    '4. Advanced',
  ),
  InputSpec.of({
    trim: Value.toggle({
      name: i18n('Trim Coordinator Output'),
      description: i18n(
        'When economical, reduce the coordinator output to a standard CoinJoin denomination and add the remainder to the mining fee. Otherwise, keep the full output.',
      ),
      default: false,
    }),
    delay: Value.toggle({
      name: i18n('Delay Signing'),
      description: i18n(
        'Ask compatible wallets to wait 50 seconds before signing.',
      ),
      default: false,
    }),
  }),
  async () => {
    const c = await config.read().once()
    return {
      trim: c?.TrimCoordinatorOutput ?? false,
      delay: c?.DelayTransactionSigning ?? false,
    }
  },
  async ({ effects, input }) => {
    await config.merge(effects, {
      TrimCoordinatorOutput: input.trim,
      DelayTransactionSigning: input.delay,
    })
    return saved()
  },
)
