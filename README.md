# Wasabi Coordinator Regtest on StartOS

This is a local development package for exercising real CoinJoin rounds on StartOS with disposable regtest coins. Mainnet and Testnet4 remain separate production packages. Regtest is fixed for this package and is not a production configuration option.

## Image and Container Runtime

The coordinator image builds directly from the sibling `../wasabi-coordinator-startos` workspace, including its current signed upstream coordinator and package helper. The signed coordinator runtime includes the native WabiSabi credential library for the selected architecture. The private node image uses the existing Bitcoin package Dockerfile from the locked npm dependency, with its release-signature quorum and SHA-256 verification. A separate runner image contains the scenario program and the same signed Wasabi libraries. `Dockerfile.runner` and its helper build inputs must track the sibling Dockerfile and `docker/helper` source.

Subcontainers are `coordinator-sub`, `regtest-node-sub`, and a temporary test subcontainer per action. The SDK runs `/opt/coordinator/wcoordinator` directly from `/opt/coordinator` with a 60-second SIGTERM timeout. When Tor is enabled, the package adds the shared proxy environment. Native exits reach SDK crash reporting and restart/backoff. The C# helper retains readiness probes and discovery, without a supervisor loop. The coordinator owns its container; discovery retains the process-only lifecycle used by the production wrapper. The lab does not publish to a registry automatically.

## Volume and Data Layout

`main` holds native coordinator configuration and state. `bitcoin` holds the private regtest chain and funding wallet. `startos` holds package settings, Tor mode, announcement address and metadata, and `reports/<run-id>.json`. The coordinator subcontainer mounts only its `announcement` subdirectory, which holds the helper's discovery status; test actions mount the whole volume. Participant spending keys live only in the test process. The setup creates a disposable account public key for coordinator leftovers; its spending key is discarded.

## File Models

The production wrapper's loose configuration model is retained with a fixed `RegTest` network. Quick defaults use four maximum inputs and a two-minute input registration period. Native phase timings otherwise follow the upstream defaults. The quick settings action restores that small round configuration; ordinary configuration actions remain available.

## Dependencies

Tor is optional and disabled by default. When enabled, public fee services and Nostr relays use it; when disabled, those public connections are direct. The package owns its Bitcoin node and has no dependency on the Mainnet or Testnet4 Bitcoin services. RPC binds only to loopback and uses the private node's cookie. The runner checks both the RPC chain and coordinator network before creating a wallet, mining, or participating.

## Network Access and Interfaces

The Coordinator API and Round Status interfaces follow the production wrapper. Bitcoin RPC is not exported. Test participants connect to the actual coordinator HTTP server inside the installed package. Public interface reachability needs separate verification; the internal protocol scenarios do not exercise an external TLS or Tor client route. Discovery starts disabled.

## Installation and First-Run Flow

Initialization seeds the coordinator config and disposable receiving account. A missing or invalid receiving key blocks native coordinator launch; the lab normally satisfies this with its generated account. Startup launches the private node, checks its reported chain, creates or loads the lab funding wallet, and mines mature regtest coins if needed. The outer startup function awaits the shared FileHelper RPC-config merge before returning the daemon chain. The coordinator starts after Bitcoin readiness and, when enabled, Tor readiness. Discovery-only reconciliation does not rewrite native config. This uses upstream's native startup and arena rather than the upstream mock test server.

## Actions

Groups are 1. Setup, 2. Round Settings, 3. Discovery, 4. Advanced, and 5. RegTest Tests. Existing action IDs are retained. Configure Discovery combines address selection, opt-in, metadata, and relays in one form, available while running. It writes only the StartOS store; native round saves cannot overwrite its settings. Relay URLs use a multiline field with one URL per line. The result confirms that the settings were saved.

Configure Round Timing allows 120–86,400 seconds for standard input registration and 10–300 seconds for finished-round retention. Defaults are unchanged. These limits avoid idle round accumulation exceeding Wasabi 2.8.4's 1,000-checkpoint request limit within the supported parallelization range.

`Use Quick Round Settings` restores four maximum inputs and a two-minute registration window. Ordinary wrapper configuration actions remain available. Set Receiving Account verifies the account public key against its native SegWit receiving address at index 1. Configure Tor is stopped-only. Round minimum validation and results use the native calculation `max(1, trunc(maximum × (percentage / 100)))`. Ban budgets are fixed-point BTC values with up to eight decimal places; sub-satoshi precision is rejected. Trim Coordinator Output reduces an eligible output to a standard CoinJoin denomination, giving only the difference to miners; it can still create a receiving-account output.

`Test Complete CoinJoin` funds fresh independent participant keys and fills the current input cap. It uses upstream production client protocol classes, checks participant results and outputs, verifies real-node mempool acceptance, mines the transaction, and checks confirmation and spent inputs. Regtest fee estimation retains upstream's built-in simulated fee curve; UTXO validation, broadcast, and block confirmation use the real node.

`Show Regtest Status` reports the private node, active round input limits, stored ban budget and output-trimming policy, and confirmation of the last tested CoinJoin when one exists. Results use unique run IDs; failure cannot reuse an older successful report. A file lock serializes test processes and is released by process exit. Actions have a ten-minute test deadline.

The workspace driver `../qa/wasabi-coordinator/run-startos.sh <host>` checks startup, runs one small CoinJoin, restarts the package, and verifies that the chain and confirmed transaction persist. It writes evidence under `../research/wasabi-coordinator/` and leaves the lab running. The scope is package acceptance; protocol regression tests remain upstream's responsibility.

## Tasks

The shared receiving-account task is normally cleared by the generated disposable account. When discovery is enabled without a usable public address, its important task opens Configure Discovery to choose an address or disable announcements.

## Health Checks

The node must answer RPC and report regtest. The preparation oneshot must finish before the shared Bitcoin readiness check. Coordinator readiness requires a round in InputRegistration, ConnectionConfirmation, OutputRegistration, or TransactionSigning; retained Ended rounds do not count. Bitcoin startup must succeed before the native process starts; Tor startup is also required when Tor is enabled. Continuous health checks report Bitcoin and optional Tor outages without terminating the native process. Discovery requires ongoing Bitcoin and coordinator health, plus Tor health when enabled, and pauses its process when they fail. Bitcoin readiness rejects a block/header mismatch. Explicit service stops, crashes, receiving-account edits, and Tor-mode changes still restart the native process. A completed test report is separate from service health. The coordinator inherits an Error threshold for Microsoft.AspNetCore.DataProtection, suppressing unused framework key-storage warnings while retaining errors and all other log categories.

## Backups and Restore

All three lab volumes are backed up together. Restoring the lab affects only disposable test data. Uninstall/reinstall creates a fresh lab. Reports contain public transaction data and error descriptions, never participant keys or RPC cookies.

## Limitations and Differences

This package validates a regtest variant of the shared wrapper, with an embedded node instead of the production dependency bindings. Mainnet/Testnet4 dependency, cookie, address, and no-spend lifecycle checks remain necessary. This lab covers startup, one successful round, and restart persistence. Interface access and ordinary configuration actions are checked separately during package acceptance; it is not an upstream protocol regression suite. Upstream ban persistence and blame-threshold limitations remain unchanged.

## Quick Reference for AI Consumers

Package ID: `wasabi-coordinator-regtest`. Build on the packaging workspace with the Mainnet sibling present. Use `make x86` for the current test server. No release workflow, commit, push, or registry publication is part of this local lab.
