import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'
import { config } from '../fileModels/config'
import { store } from '../fileModels/store.json'
import { sdk } from '../sdk'

export const v_2_8_3_1 = VersionInfo.of({
  version: '2.8.3:1',
  releaseNotes: {
    en_US:
      'Orders configuration groups, combines discovery and address settings, requires a valid receiving account, and reduces unused framework log warnings.',
    es_ES:
      'Ordena los grupos, combina descubrimiento y dirección, exige una cuenta receptora válida y reduce avisos innecesarios.',
    de_DE:
      'Ordnet Einstellungsgruppen, verbindet Auffindbarkeit und Adresse, verlangt ein gültiges Empfangskonto und reduziert unnötige Warnungen.',
    pl_PL:
      'Porządkuje grupy, łączy ustawienia ogłoszeń i adresu, wymaga poprawnego konta odbiorczego i ogranicza zbędne ostrzeżenia.',
    fr_FR:
      'Ordonne les groupes, réunit la découverte et l’adresse, exige un compte de réception valide et réduit les avertissements inutiles.',
  },
  migrations: {
    up: async ({ effects }) => {
      const existing = await store.read().once()
      const native = await config.read().once()
      if (existing && !existing.announcement && native) {
        const a = native.AnnouncerConfig
        await store.merge(effects, {
          announcement: {
            CoordinatorName: a.CoordinatorName,
            CoordinatorDescription: a.CoordinatorDescription,
            AbsoluteMinInputCount: a.AbsoluteMinInputCount,
            ReadMoreUri: a.ReadMoreUri,
            RelayUris: a.RelayUris,
          },
        })
      }
      await sdk.action.clearTask(
        effects,
        `${sdk.manifest.id}:select-announcement-address`,
      )
    },
    down: IMPOSSIBLE,
  },
})
