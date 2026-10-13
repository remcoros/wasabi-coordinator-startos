# Wasabi Coordinator Regtest

## Documentation

- [Wasabi documentation](https://docs.wasabiwallet.io/) — CoinJoin operation and wallet compatibility.

## What you get on StartOS

This lab runs a coordinator and a private Bitcoin regtest node. It creates its own test coins and participants. You do not need a faucet, a funded wallet, or other people to join the tests.

## Running tests

1. Start the lab. Wait for Bitcoin and Coordinator health to become ready.
2. Under **5. RegTest Tests**, run **Show Regtest Status** to check the node and round.
3. Run **Test Complete CoinJoin**. The result should show a completed transaction, its input and output counts, mining fee, and a confirmation.
4. Restart the lab, then run **Show Regtest Status** again. The previously tested transaction should still have a confirmation.

If the private Bitcoin node becomes unavailable, its health check shows the problem. Wait for health to recover and run the test again. Run one test at a time. Copy the returned report if you want to keep or share the result. **Round Status** shows the round while a test is running.

If you changed the round settings and want to return to small, quick tests, run **Use Quick Round Settings**.

## Test data

All coins and participant keys used by the tests are disposable regtest data. Use the generated receiving account and keep discovery disabled for ordinary protocol tests. Do not import a real wallet into this lab.

Tor is off by default. Enable it with **Configure Tor** only if you want public fee or Nostr relay connections to use Tor. StartOS Interfaces separately control how wallets reach the coordinator.

Restarting preserves the private chain and reports. Uninstalling and reinstalling creates a fresh lab. The Mainnet and Testnet4 Bitcoin services are separate from this lab.
