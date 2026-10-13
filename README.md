<p align="center">
  <img src="icon.png" alt="Wasabi Coordinator logo" width="21%" />
</p>

# Wasabi Coordinator (Testnet4) on StartOS

> Everything not listed here should behave as in upstream Wasabi Coordinator. See the Documentation section of `instructions.md` for upstream documentation.

This package runs the coordinator from [WalletWasabi](https://github.com/WalletWasabi/WalletWasabi), serving WabiSabi CoinJoin rounds to compatible wallets. It does not run the Wasabi wallet.

The Mainnet, Testnet4, and regtest packages use [remcoros/wasabi-coordinator-startos](https://github.com/remcoros/wasabi-coordinator-startos) on `main`, `testnet4`, and `regtest`, respectively. Each has a separate package ID. Mainnet and Testnet4 use their corresponding Bitcoin dependencies; regtest includes its own private node.

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

## Image and Container Runtime

The package builds a container for x86_64 and aarch64 from official Wasabi Linux archives. The Dockerfile downloads the archive, signatures, checksum list, and developer key for the pinned release, checks the full signing fingerprint and SHA-256 digest, then extracts the coordinator's runtime dependency set. Verification files are removed after extraction. The signed coordinator binary and libraries are not patched. Wasabi 2.8.4 uses native WabiSabi credential issuance; the signed runtime set includes the architecture-specific `libwabisabi.so`. The package-owned .NET helper in `docker/helper` checks Bitcoin, optional Tor, and coordinator readiness, and sends optional Nostr announcements using upstream's Nostr client. Its source is a Docker build input; `assets/` contains no service runtime files. The image uses digest-pinned .NET build and runtime bases. The SDK daemon launches `/opt/coordinator/wcoordinator` directly with `/opt/coordinator` as its working directory and a 60-second SIGTERM timeout. When Tor is enabled, the package adds the proxy environment. SDK crash reporting and restart/backoff manage native exits. Attach to `coordinator-sub` for runtime inspection.

## Volume and Data Layout

The `main` volume is mounted at `/data` and holds native `Config.json`, coordinator logs, persistent round data, and the Nostr signing key. The `startos` volume holds `store.json` with the announcement-address choice, discovery opt-in, announcement metadata and relays. Only its `announcement` subdirectory is mounted, at `/startos`, and holds the last accepted announcement's event ID, metadata, and timestamp; the native coordinator process cannot write `store.json`. The signing key is not copied into that status record. Both volumes are backed up. The Bitcoin dependency's main volume is mounted read-only at `/mnt/bitcoin` so the coordinator can follow RPC cookie replacement. Configuration and store files are private to the service.

## File Models

`/data/Config.json` is the native configuration, modelled with loose nested schemas so future upstream fields survive a package action. The model accepts the UTF-8 BOM emitted by Wasabi. The native output derivation counter is preserved when the receiving account is unchanged and reset only after an explicit account change. `store.json` in the `startos` volume holds package settings that the native configuration has no equivalent for: Tor routing, opt-in discovery, the chosen address, and publisher metadata and relays. The coordinator's own announcer remains disabled; the helper owns announcement delivery.

## Dependencies

This package requires Bitcoin Testnet4 (`bitcoind-testnet`) for blockchain status, fee estimates, UTXO and mempool checks, and transaction broadcast. Tor is optional and enabled by default for outbound public fee requests and the optional Nostr publisher. The Bitcoin RPC address is resolved from the dependency's live binding and authenticated with its mounted cookie. The helper checks the selected network and waits for synchronization before starting the coordinator. Missing enabled dependencies produce a waiting health state rather than a fabricated address.

## Network Access and Interfaces

The coordinator listens inside the container on port `37126`. The `coordinator` API interface exposes the wallet protocol, and the `rounds` UI interface exposes `/wabisabi/human-monitor`. StartOS controls whether an address is available on LAN, Tor, or a public domain. A chosen public address is required for Nostr announcements. When Tor routing is enabled, the package routes native HTTP requests and the helper's Nostr WebSocket connections to the Tor dependency. When it is disabled, public fee services and Nostr relays receive direct connections from the server. Bitcoin RPC stays on the internal bridge in both modes.

The Nostr announcement network tag and Bitcoin RPC chain checks both use `testnet4`. These labels have separate package profile fields.

## Installation and First-Run Flow

The install seeds both file models and a unique Nostr secret. The native coordinator inherits a category-specific Error logging threshold for Microsoft.AspNetCore.DataProtection, suppressing unused framework key-storage warnings while retaining errors and other categories. A critical receiving-account task blocks the service until the operator enters a valid account public key and its receiving address at index 1. An invalid stored key reopens this task, and the account form remains usable to repair it. Bitcoin Testnet4 is required. Tor is optional and enabled by default. RPC credentials and addresses are populated automatically. Round settings retain upstream defaults and require no first-run confirmation. After resolving dependencies and validating the receiving account, the outer setupMain directly awaits FileHelper.merge to write the selected Bitcoin RPC URL and cookie path before returning the daemon chain. It preserves the payout account, derivation counter, Nostr identity, and other native fields. The merge stays outside dynamic discovery reconciliation, so publisher-only changes do not rewrite native config. The helper does not rewrite native config. The selected network and native onion-publishing flag are fixed by the package. Discovery starts disabled and needs an enabled public address plus explicit opt-in.

## Actions

Groups are 1. Setup, 2. Round Settings, 3. Discovery, and 4. Advanced. Existing action IDs are retained; StartOS sorts actions within each group by ID.

Configure Round Timing allows 120–86,400 seconds for standard input registration and 10–300 seconds for finished-round retention. Defaults are unchanged. These limits avoid idle round accumulation exceeding Wasabi 2.8.4's 1,000-checkpoint request limit within the supported parallelization range.

Set Receiving Account requires a testnet account key (`tpub` or `vpub`) and its native SegWit receiving address at index 1; mainnet keys are rejected. The stored key is normalized to `xpub` form. Saving a different receiving account changes the address that receives eligible coordinator leftovers and resets the native derivation counter. Configure Tor is available only while stopped and controls the optional Tor dependency plus outbound public fee and Nostr connections. Round, timing, fee-target, address-type, output, and ban actions edit native config. The normal round minimum is `max(1, trunc(maximum × stored multiplier))`, with `stored multiplier = percentage / 100`. The action validates and reports this exact calculation, including its floating-point rounding. A retry eligibility percentage does not guarantee the native blame-round minimum because of the upstream issue below.

Configure Discovery combines the enabled public interface address, announcement opt-in, metadata, and relays. No Announcement Address keeps the form usable with discovery disabled. An enable attempt without a usable selected address is rejected; there is no silent address fallback. The chosen address is stored as the exact URL, so a change of its port or scheme makes it unusable until it is selected again. The action is available while running and writes only the StartOS store, so native config saves cannot overwrite its settings. Relay URLs use a multiline field with one URL per line. The result confirms that the settings were saved. The connection action copies a Wasabi-compatible connection string using the chosen address, network, zero coordination fee, and wallet minimum input policy. The information URL falls back to the chosen coordinator address if blank. Address and announcement-setting changes restart or stop only the publisher, preserving ongoing rounds. A dynamic daemon chain watches discovery settings in its reconciliation context; its cancellable publisher function uses the existing command controller inside `coordinator-sub` without owning that container. Other native config edits require a restart.

Ban disruption budgets are written as fixed-point BTC amounts with eight decimal places. Values with sub-satoshi precision are rejected. Trim Coordinator Output can reduce an eligible receiving output to a standard CoinJoin denomination and give the difference to miners; it does not suppress the output. Without a suitable economical denomination, upstream keeps the original output amount.

## Tasks

A critical task requests a receiving account while the saved key is missing or invalid. When discovery is enabled without a usable public address, an important task opens Configure Discovery to choose an address or disable announcements. Disabling discovery clears its address task.

## Health Checks

`bitcoin` validates the RPC cookie, correct chain, completed synchronization, nonzero height, and a header count no more than two blocks ahead of the block count. The `bitcoin-ready` startup oneshot must succeed before the native daemon starts. When Tor is enabled, `tor-ready` must also succeed. Their commands retry through the SDK until success and do not subscribe to ongoing health failures. The continuous Bitcoin and optional Tor health checks report outages without stopping the native process. Discovery requires ongoing Bitcoin and coordinator success, plus Tor success when enabled, so an outage pauses only its publisher process. Restoring readiness resumes publication without destroying the shared container. Explicit service stops, native crashes, receiving-account changes, Tor-mode changes, and dependency-address changes still restart the coordinator and can discard upstream in-memory bans. `tor` checks that the SOCKS proxy accepts a handshake. `coordinator` requires at least one round in InputRegistration, ConnectionConfirmation, OutputRegistration, or TransactionSigning. Retained Ended rounds do not satisfy readiness or allow the publisher to announce. `discovery` is disabled when opt-in is off. When enabled, it requires a positive acknowledgement for the signed event from at least one configured relay in the last 30 minutes, matching the current endpoint, network, announced metadata, relay list, and signing-key fingerprint. A rejection or disconnected socket does not record success. Old status files without matching metadata fail this check. Health messages avoid exposing the RPC cookie, private keys, or raw exception details.

Each relay has an independent concurrent connection and publication attempt, using Tor when enabled, so publication does not wait for every relay to connect. The first positive acknowledgement for the signed event completes publication; the publisher cancels and awaits the remaining attempts before returning. All attempts share a 45-second deadline, and publication repeats after 15 minutes. The signed event, status metadata, and wallet connection string use the same information-URL fallback; the C# and TypeScript helpers share an explicit blank-character set.

## Backups and Restore

The package backs up and restores the `main` and `startos` volumes together. This preserves the payout-account selection, native derivation depth, Nostr key, and discovery choice. Stop the service before restoring an older snapshot; a restored derivation depth may reuse an address used after the snapshot. Compare the receiving account with the controlling wallet after restore. Native bans written only in memory cannot be recovered from a backup.

## Limitations and Differences

This package intentionally has no wallet, wallet seed, private spending key, or coin custody. An account public key is required for receiving eligible leftover funds. The native coordination fee is fixed at zero, while actual Bitcoin mining fees remain part of transactions. Upstream can fall back from Bitcoin RPC fee estimates to public fee services; it offers no configurable provider selector. These external requests use Tor when Tor routing is enabled and connect directly when it is disabled.

In the pinned upstream coordinator, new bans are lost after restart because the ban writer is not started, and retry rounds may require the normal input minimum despite the configured retry multiplier. The package retains upstream behavior. Small rounds provide less privacy; lowering the minimum does not guarantee that a round can cover its mining costs.

## Quick Reference for AI Consumers

```yaml
package_id: wasabi-coordinator-testnet
image: local Dockerfile from signed upstream releases
architectures: [x86_64, aarch64]
subcontainers: [coordinator-sub]
volumes:
  main: /data
  startos: /startos (subpath announcement; store.json stays outside the mount)
file_models: [/data/Config.json, startos volume store.json]
startos_managed_env_vars: [BITCOIN_RPC, BITCOIN_COOKIE, BITCOIN_CHAIN, DISCOVERY_NETWORK, USE_TOR, TOR_PROXY, ANNOUNCEMENT_URL, ANNOUNCEMENT_CONFIG, Logging__LogLevel__Microsoft.AspNetCore.DataProtection]
dependencies: [bitcoind-testnet, optional tor]
interfaces:
  coordinator: { type: api, port: 37126 }
  rounds: { type: ui, port: 37126, path: /wabisabi/human-monitor }
actions:
  - set-receiving-account
  - configure-rounds
  - configure-timing
  - configure-mining-fees
  - configure-address-types
  - configure-ban-policy
  - configure-output-policy
  - configure-tor
  - configure-discovery
  - show-wallet-connection
tasks:
  - { action: set-receiving-account, severity: critical }
  - { action: configure-discovery, severity: important }
health_checks: [bitcoin, tor, coordinator, discovery]
```
