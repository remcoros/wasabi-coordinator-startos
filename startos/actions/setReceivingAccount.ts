import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { config } from '../fileModels/config'
import { accountKey, hasReceivingAccount, saved, stopped, text } from '../utils'

export const setReceivingAccount = sdk.Action.withInput(
  'set-receiving-account',
  {
    ...stopped(
      'Set Receiving Account',
      'Set the wallet account that receives coordination fees.',
      '1. Setup',
    ),
    warning: i18n(
      'Copy the account public key (xpub) and receiving address at index 1 from the same wallet.',
    ),
  },
  sdk.InputSpec.of({
    account: text(
      'Account Public Key (xpub)',
      'Enter the native SegWit account public key: xpub or zpub on Mainnet; tpub or vpub on Testnet4 and regtest. Never enter a seed or private key.',
      true,
    ),
    address: text(
      'Receiving Address at Index 1',
      'Copy the native SegWit receiving address at index 1 from the same wallet.',
      true,
    ),
  }),
  async () => {
    const c = await config.read().once()
    const key =
      c && hasReceivingAccount(c.CoordinatorExtPubKey)
        ? accountKey(c.CoordinatorExtPubKey)
        : null
    return key ? { account: key.profileKey, address: key.address } : null
  },
  async ({ effects, input }) => {
    let key: ReturnType<typeof accountKey>
    try {
      key = accountKey(input.account!, true)
    } catch {
      throw new Error(i18n('Enter a valid native SegWit account public key.'))
    }
    if (input.address!.trim() !== key.address)
      throw new Error(
        i18n(
          'This address is not receiving index 1 for the account public key.',
        ),
      )
    await config.update(effects, (c) =>
      c
        ? {
            ...c,
            CoordinatorExtPubKey: key.xpub,
            CoordinatorExtPubKeyCurrentDepth:
              c.CoordinatorExtPubKey === key.xpub
                ? c.CoordinatorExtPubKeyCurrentDepth
                : 1,
          }
        : null,
    )
    return saved()
  },
)
