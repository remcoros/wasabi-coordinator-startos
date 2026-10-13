import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '2.8.4:0',
  releaseNotes: {
    en_US:
      'Adds a development package with a private Bitcoin regtest node, disposable receiving account, and automated participants. Test Complete CoinJoin runs a small round and confirms the transaction; Show Regtest Status checks the node and the previous result. Includes quick round settings, restart persistence, and optional Tor routing, disabled by default. Uses the signed Wasabi 2.8.4 coordinator with native credential processing, request-size limits, and improved output-script reuse checks. [Upstream release notes](https://github.com/WalletWasabi/WalletWasabi/releases/tag/v2.8.4)',
    es_ES:
      'Añade un paquete de desarrollo con un nodo Bitcoin regtest privado, una cuenta receptora desechable y participantes automatizados. Probar CoinJoin completo ejecuta una ronda pequeña y confirma la transacción; Mostrar estado regtest comprueba el nodo y el resultado anterior. Incluye rondas rápidas, persistencia tras reinicios y Tor opcional, desactivado por defecto. Usa el coordinador Wasabi 2.8.4 firmado con procesamiento nativo de credenciales, límites de solicitudes y mejores comprobaciones de reutilización de scripts. [Notas de la versión](https://github.com/WalletWasabi/WalletWasabi/releases/tag/v2.8.4)',
    de_DE:
      'Fügt ein Entwicklungspaket mit privatem Bitcoin-Regtest-Knoten, Einweg-Empfangskonto und automatischen Teilnehmern hinzu. Der vollständige CoinJoin-Test führt eine kleine Runde aus und bestätigt die Transaktion; der Regtest-Status prüft den Knoten und das vorherige Ergebnis. Enthält schnelle Rundeneinstellungen, Datenpersistenz bei Neustarts und optionales Tor, standardmäßig ausgeschaltet. Verwendet den signierten Wasabi-2.8.4-Koordinator mit nativer Berechtigungsverarbeitung, Anfragegrößenlimits und verbesserten Prüfungen auf Skriptwiederverwendung. [Versionshinweise](https://github.com/WalletWasabi/WalletWasabi/releases/tag/v2.8.4)',
    pl_PL:
      'Dodaje pakiet deweloperski z prywatnym węzłem Bitcoin regtest, jednorazowym kontem odbiorczym i automatycznymi uczestnikami. Pełny test CoinJoin wykonuje małą rundę i potwierdza transakcję; stan regtest sprawdza węzeł i poprzedni wynik. Zawiera szybkie rundy, zachowanie danych po restarcie i opcjonalny Tor, domyślnie wyłączony. Używa podpisanego koordynatora Wasabi 2.8.4 z natywną obsługą poświadczeń, limitami żądań i poprawioną kontrolą ponownego użycia skryptów. [Informacje o wydaniu](https://github.com/WalletWasabi/WalletWasabi/releases/tag/v2.8.4)',
    fr_FR:
      'Ajoute un paquet de développement avec un nœud Bitcoin regtest privé, un compte de réception jetable et des participants automatisés. Le test CoinJoin complet exécute une petite ronde et confirme la transaction ; le statut regtest vérifie le nœud et le résultat précédent. Inclut des rondes rapides, la conservation des données après redémarrage et Tor facultatif, désactivé par défaut. Utilise le coordinateur Wasabi 2.8.4 signé avec traitement natif des justificatifs, limites de requêtes et meilleures vérifications de réutilisation des scripts. [Notes de version](https://github.com/WalletWasabi/WalletWasabi/releases/tag/v2.8.4)',
  },
  migrations: { up: async () => {}, down: IMPOSSIBLE },
})
