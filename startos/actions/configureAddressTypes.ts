import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { config } from '../fileModels/config'
import { saved, stopped } from '../utils'

export const configureAddressTypes = sdk.Action.withInput(
  'configure-address-types',
  stopped(
    'Configure Address Types',
    'Choose allowed input and output script types.',
    '4. Advanced',
  ),
  sdk.InputSpec.of({
    inputSegwit: sdk.Value.toggle({
      name: i18n('Native SegWit Inputs'),
      description: i18n('Allow P2WPKH UTXOs as inputs.'),
      default: true,
    }),
    inputTaproot: sdk.Value.toggle({
      name: i18n('Taproot Inputs'),
      description: i18n('Allow P2TR UTXOs as inputs.'),
      default: true,
    }),
    outputSegwit: sdk.Value.toggle({
      name: i18n('Native SegWit Outputs'),
      description: i18n('Allow participants to register P2WPKH outputs.'),
      default: true,
    }),
    outputTaproot: sdk.Value.toggle({
      name: i18n('Taproot Outputs'),
      description: i18n('Allow participants to register P2TR outputs.'),
      default: true,
    }),
    outputLegacy: sdk.Value.toggle({
      name: i18n('Legacy Outputs'),
      description: i18n('Allow participants to register P2PKH outputs.'),
      default: false,
    }),
    outputScript: sdk.Value.toggle({
      name: i18n('Script-Hash Outputs'),
      description: i18n('Allow participants to register P2SH outputs.'),
      default: false,
    }),
    outputWitness: sdk.Value.toggle({
      name: i18n('Witness Script-Hash Outputs'),
      description: i18n('Allow participants to register P2WSH outputs.'),
      default: false,
    }),
  }),
  async () => {
    const c = await config.read().once()
    return c
      ? {
          inputSegwit: c.AllowP2wpkhInputs,
          inputTaproot: c.AllowP2trInputs,
          outputSegwit: c.AllowP2wpkhOutputs,
          outputTaproot: c.AllowP2trOutputs,
          outputLegacy: c.AllowP2pkhOutputs,
          outputScript: c.AllowP2shOutputs,
          outputWitness: c.AllowP2wshOutputs,
        }
      : null
  },
  async ({ effects, input }) => {
    if (
      (!input.inputSegwit && !input.inputTaproot) ||
      (!input.outputSegwit &&
        !input.outputTaproot &&
        !input.outputLegacy &&
        !input.outputScript &&
        !input.outputWitness)
    )
      throw new Error(
        i18n('Enable at least one input type and one output type.'),
      )
    await config.merge(effects, {
      AllowP2wpkhInputs: input.inputSegwit,
      AllowP2trInputs: input.inputTaproot,
      AllowP2wpkhOutputs: input.outputSegwit,
      AllowP2trOutputs: input.outputTaproot,
      AllowP2pkhOutputs: input.outputLegacy,
      AllowP2shOutputs: input.outputScript,
      AllowP2wshOutputs: input.outputWitness,
    })
    return saved()
  },
)
