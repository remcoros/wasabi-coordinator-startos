import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'
import { config } from '../fileModels/config'
import { bitcoinAmount } from '../utils'

export const v_2_8_3_2 = VersionInfo.of({
  version: '2.8.3:2',
  releaseNotes: {
    en_US:
      'Fixes ban-budget formatting and round-minimum reporting, checks for active rounds, clarifies receiving-output trimming and discovery updates, and keeps the native process running through temporary dependency probe failures.',
    es_ES:
      'Corrige el formato del presupuesto y el mínimo de entradas, comprueba rondas activas y aclara la reducción de salidas y los cambios de descubrimiento; mantiene el proceso nativo durante fallos temporales de dependencias.',
    de_DE:
      'Korrigiert Budgetformat und Mindesteingaben, prüft aktive Runden und erklärt Ausgabekürzung und Auffindbarkeitsänderungen; der native Prozess bleibt bei vorübergehenden Abhängigkeitsfehlern aktiv.',
    pl_PL:
      'Poprawia format budżetu i liczbę minimalnych wejść, sprawdza aktywne rundy oraz wyjaśnia zmniejszanie wyjść i zmiany ogłoszeń; proces pozostaje aktywny przy przejściowych błędach zależności.',
    fr_FR:
      'Corrige le format du budget et le minimum des entrées, vérifie les tours actifs et clarifie la réduction des sorties et les mises à jour de découverte ; le processus reste actif lors des pannes temporaires de dépendances.',
  },
  migrations: {
    up: async ({ effects }) => {
      const existing = await config.read().once()
      if (existing && /e/i.test(existing.DoSSeverity)) {
        const fixed = bitcoinAmount(Number(existing.DoSSeverity))
        if (fixed !== null) await config.merge(effects, { DoSSeverity: fixed })
      }
    },
    down: IMPOSSIBLE,
  },
})
