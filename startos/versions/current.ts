import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '2.8.4:0',
  releaseNotes: {
    en_US:
      'Updates the coordinator to 2.8.4 with native credential processing, limits on oversized requests, and improved output-script reuse checks. Includes required receiving-account setup, combined live discovery settings, corrected round and ban policy actions, and ongoing dependency health alerts that preserve the native process. [Upstream release notes](https://github.com/WalletWasabi/WalletWasabi/releases/tag/v2.8.4)',
    es_ES:
      'Actualiza el coordinador a 2.8.4 con procesamiento nativo de credenciales, límites para solicitudes excesivas y mejores comprobaciones de reutilización de scripts. Incluye configuración obligatoria de la cuenta receptora, descubrimiento en vivo, acciones de rondas y bloqueos corregidas y avisos de dependencias que mantienen el proceso activo. [Notas de la versión](https://github.com/WalletWasabi/WalletWasabi/releases/tag/v2.8.4)',
    de_DE:
      'Aktualisiert den Koordinator auf 2.8.4 mit nativer Berechtigungsverarbeitung, Grenzen für übergroße Anfragen und verbesserten Prüfungen auf Skriptwiederverwendung. Enthält die erforderliche Empfangskontoeinrichtung, gemeinsame Live-Auffindbarkeit, korrigierte Runden- und Sperreinstellungen und Abhängigkeitswarnungen bei weiterlaufendem Prozess. [Versionshinweise](https://github.com/WalletWasabi/WalletWasabi/releases/tag/v2.8.4)',
    pl_PL:
      'Aktualizuje koordynator do 2.8.4, używa natywnej obsługi poświadczeń, ogranicza zbyt duże żądania i poprawia sprawdzanie ponownego użycia skryptów. Zawiera wymagane konto odbiorcze, wspólne ustawienia ogłoszeń na żywo, poprawione ustawienia rund i blokad oraz ostrzeżenia o zależnościach bez zatrzymywania procesu. [Informacje o wydaniu](https://github.com/WalletWasabi/WalletWasabi/releases/tag/v2.8.4)',
    fr_FR:
      'Met à jour le coordinateur vers 2.8.4 avec un traitement natif des justificatifs, des limites de taille des requêtes et de meilleures vérifications de réutilisation des scripts. Inclut le compte de réception obligatoire, la découverte en direct, les paramètres de tours et de bannissement corrigés et les alertes de dépendances sans arrêter le processus. [Notes de version](https://github.com/WalletWasabi/WalletWasabi/releases/tag/v2.8.4)',
  },
  migrations: { up: async () => {}, down: IMPOSSIBLE },
})
