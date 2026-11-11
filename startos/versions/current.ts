import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '2.8.5:0',
  releaseNotes: {
    en_US:
      'Updates Wasabi to 2.8.5. Bans are persisted, retry rounds honor their configured minimum, and the obsolete suggested input amount setting is removed. [Upstream release notes](https://github.com/WalletWasabi/WalletWasabi/releases/tag/v2.8.5)',
    es_ES:
      'Actualiza Wasabi a 2.8.5. Se guardan los bloqueos, las rondas de reintento respetan su mínimo y se elimina el ajuste obsoleto de importe sugerido.',
    de_DE:
      'Aktualisiert Wasabi auf 2.8.5. Sperren werden gespeichert, Wiederholungsrunden beachten ihr Minimum und die veraltete Einstellung für den vorgeschlagenen Eingabebetrag entfällt.',
    pl_PL:
      'Aktualizuje Wasabi do 2.8.5. Blokady są zapisywane, rundy ponowne uwzględniają swoje minimum, a przestarzałe ustawienie sugerowanej kwoty usunięto.',
    fr_FR:
      'Met à jour Wasabi vers 2.8.5. Les bannissements sont enregistrés, les tours de reprise respectent leur minimum et le réglage obsolète du montant suggéré est supprimé.',
  },
  migrations: { up: async () => {}, down: IMPOSSIBLE },
})
