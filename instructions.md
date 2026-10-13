# Wasabi Coordinator (Testnet4)

## Documentation

- [Wasabi documentation](https://docs.wasabiwallet.io/) — wallet compatibility, CoinJoin operation, and connecting to a coordinator.

## What you get on StartOS

The **Coordinator** interface is the address compatible wallets use to join your rounds. **Round Status** shows current rounds and their registered input counts. StartOS also gives you actions for receiving funds left over from rounds, setting round policy, and optionally announcing your coordinator.

## Getting set up

1. Install Bitcoin Testnet4 and wait for it to finish synchronizing.
2. In a wallet you control, export the native SegWit **account public key (xpub)** and copy its receiving address at index 1. Never enter a seed or private key.
3. Under **1. Setup**, run **Set Receiving Account** and enter both values. Startup remains blocked until they match.
4. Tor is enabled by default. Install Tor, or turn it off with **Configure Tor** under **4. Advanced** before starting.
5. Under **2. Round Settings**, review **Configure Rounds** if you want different input counts or amounts. The default requires 50 of a maximum of 100 inputs.
6. Share the Testnet4 **Coordinator** address with compatible wallets. To get a wallet connection string, enable a public interface address, choose it in **Configure Discovery** under **3. Discovery**, then run **Show Wallet Connection**. Nostr announcements can remain off.

## Running your coordinator

Use **Round Status** to see whether a round is available and how many inputs it has. **Configure Round Timing** controls how long wallets have to take each step. **Configure Mining Fees** sets the confirmation target for fee estimates. Address types, bans, and the handling of leftover funds are under **4. Advanced**. **Trim Coordinator Output** can reduce the amount sent to your receiving account and add the difference to mining fees. It can still create a receiving output, and keeps the original amount when no suitable smaller amount is available.

Nostr discovery is optional. Enable a public address for the Coordinator interface, then open **Configure Discovery** under **3. Discovery**. Choose the announcement address, enter the name and description wallets will see, and turn on **Enable Nostr Announcements** if you want to publish on Nostr. Choose **No Announcement Address** and leave announcements off if you do not need discovery or a connection string. The coordinator remains usable without Nostr discovery. StartOS controls whether a wallet can reach the enabled address over Tor, a public domain, or another route.

**Configure Tor** controls outbound connections to public fee services and Nostr relays. When it is off, those connections go directly from your server. Bitcoin RPC remains on the private StartOS network. StartOS Interfaces separately control how wallets reach the coordinator.

Ongoing rounds continue while discovery updates. Discovery reports success after a relay accepts an announcement for your current address and settings.

In **Configure Discovery**, enter one or more relay URLs. At least one relay must be reachable and accept your announcement.

## Limitations

The coordinator does not hold spending keys or charge a coordination fee. Eligible leftover funds can be sent to the receiving account you choose; mining fees still apply. Check the receiving account carefully before changing it. New bans can be lost when you restart, and retry rounds may still require the normal minimum number of inputs. Bitcoin must be ready before startup. When Tor is enabled, it must also be ready. A dependency outage appears in health checks and can pause discovery. Restore the dependency and check **Round Status**.
