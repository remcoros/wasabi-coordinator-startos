import { sdk } from '../sdk'
import { config } from '../fileModels/config'
import { duration, number, saved, seconds, stopped } from '../utils'

const timingSpec = sdk.InputSpec.of({
  registration: number(
    'Input Registration',
    3600,
    120,
    86400,
    's',
    true,
    'Time allowed for input registration in a standard round.',
  ),
  retry: number(
    'Blame Round Registration',
    180,
    10,
    86400,
    's',
    true,
    'Time allowed for input registration in a blame round.',
  ),
  confirmation: number(
    'Connection Confirmation',
    60,
    10,
    3600,
    's',
    true,
    'Time allowed for registered inputs to confirm their connection.',
  ),
  output: number(
    'Output Registration',
    60,
    10,
    3600,
    's',
    true,
    'Time allowed for output registration.',
  ),
  signing: number(
    'Transaction Signing',
    60,
    10,
    3600,
    's',
    true,
    'Time allowed for transaction signing.',
  ),
  failedOutput: number(
    'Early-Failure Output Registration',
    180,
    10,
    3600,
    's',
    true,
    'Output registration timeout after a connection confirmation failure.',
  ),
  failedSigning: number(
    'Early-Failure Signing',
    60,
    10,
    3600,
    's',
    true,
    'Signing timeout after output registration ends early.',
  ),
  expiry: number(
    'Finished Round Retention',
    300,
    10,
    300,
    's',
    true,
    'Time that ended rounds remain in status data.',
  ),
})

export const configureRoundTiming = sdk.Action.withInput(
  'configure-timing',
  stopped(
    'Configure Round Timing',
    'Set round phase timeouts and finished-round retention.',
    '2. Round Settings',
  ),
  timingSpec,
  async () => {
    const c = await config.read().once()
    if (!c) return null
    return {
      registration: seconds(c.StandardInputRegistrationTimeout),
      retry: seconds(c.BlameInputRegistrationTimeout),
      confirmation: seconds(c.ConnectionConfirmationTimeout),
      output: seconds(c.OutputRegistrationTimeout),
      signing: seconds(c.TransactionSigningTimeout),
      failedOutput: seconds(c.FailFastOutputRegistrationTimeout),
      failedSigning: seconds(c.FailFastTransactionSigningTimeout),
      expiry: seconds(c.RoundExpiryTimeout),
    }
  },
  async ({ effects, input }) => {
    await config.merge(effects, {
      StandardInputRegistrationTimeout: duration(input.registration),
      BlameInputRegistrationTimeout: duration(input.retry),
      ConnectionConfirmationTimeout: duration(input.confirmation),
      OutputRegistrationTimeout: duration(input.output),
      TransactionSigningTimeout: duration(input.signing),
      FailFastOutputRegistrationTimeout: duration(input.failedOutput),
      FailFastTransactionSigningTimeout: duration(input.failedSigning),
      RoundExpiryTimeout: duration(input.expiry),
    })
    return saved()
  },
)
