import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { config } from '../fileModels/config'
import { number, saved, stopped } from '../utils'

const roundSpec = sdk.InputSpec.of({
  maximum: number(
    'Maximum Inputs',
    100,
    2,
    1000,
    null,
    true,
    'Maximum UTXOs allowed in one round.',
  ),
  minimum: number(
    'Minimum Inputs (%)',
    50,
    1,
    100,
    '%',
    false,
    'Percentage of Maximum Inputs required for a standard round.',
  ),
  blame: number(
    'Blame Round Minimum (%)',
    40,
    1,
    100,
    '%',
    false,
    'Percentage of Maximum Inputs required for a blame round.',
  ),
  smallest: number(
    'Minimum Input Amount',
    5000,
    1,
    2100000000000000,
    'sat',
    true,
    'UTXOs below this amount cannot register.',
  ),
  largest: number(
    'Maximum Input Amount',
    4300000000000,
    1,
    2100000000000000,
    'sat',
    true,
    'UTXOs above this amount cannot register.',
  ),
  suggested: number(
    'Suggested Input Amount',
    10000000,
    1,
    2100000000000000,
    'sat',
    true,
    'Base amount used to vary the suggested maximum input amount between rounds.',
  ),
  parallel: number(
    'Simultaneous Rounds',
    1,
    1,
    20,
    null,
    true,
    'Number of standard rounds open for input registration.',
  ),
})

export const configureRounds = sdk.Action.withInput(
  'configure-rounds',
  stopped(
    'Configure Rounds',
    'Set round size and accepted input amounts.',
    '2. Round Settings',
  ),
  roundSpec,
  async () => {
    const c = await config.read().once()
    if (!c) return null
    return {
      maximum: c.MaxInputCountByRound,
      minimum: c.MinInputCountByRoundMultiplier * 100,
      blame: c.MinInputCountByBlameRoundMultiplier * 100,
      smallest: Math.round(Number(c.MinRegistrableAmount) * 1e8),
      largest: Math.round(Number(c.MaxRegistrableAmount) * 1e8),
      suggested: Math.round(Number(c.MaxSuggestedAmountBase) * 1e8),
      parallel: c.RoundParallelization,
    }
  },
  async ({ effects, input }) => {
    const minimumMultiplier = input.minimum / 100
    const minimumInputs = Math.max(
      1,
      Math.trunc(input.maximum * minimumMultiplier),
    )
    if (
      minimumInputs < 2 ||
      input.smallest > input.largest ||
      input.suggested < input.smallest ||
      input.suggested > input.largest
    )
      throw new Error(
        i18n(
          'Require at least two inputs and keep the suggested amount within the accepted amount range.',
        ),
      )
    await config.merge(effects, {
      MaxInputCountByRound: input.maximum,
      MinInputCountByRoundMultiplier: minimumMultiplier,
      MinInputCountByBlameRoundMultiplier: input.blame / 100,
      MinRegistrableAmount: (input.smallest / 1e8).toFixed(8),
      MaxRegistrableAmount: (input.largest / 1e8).toFixed(8),
      MaxSuggestedAmountBase: (input.suggested / 1e8).toFixed(8),
      RoundParallelization: input.parallel,
    })
    return {
      ...saved(),
      message: i18n('Settings saved. The minimum registered input count is:'),
      result: {
        type: 'single',
        value: String(minimumInputs),
        copyable: false,
        qr: false,
        masked: false,
        launchable: false,
      },
    }
  },
)
