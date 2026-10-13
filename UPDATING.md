# Updating the Regtest Lab

Maintain the Mainnet wrapper on `main` first. Carry shared changes to `regtest` in `https://github.com/remcoros/wasabi-coordinator-startos`, retaining its fixed regtest profile, embedded node startup, lab actions, disposable receiving-account setup, and third volume.

Keep this branch's `Dockerfile` aligned with the Mainnet Dockerfile. Refresh `Dockerfile.runner` from it, preserving the runner build stages, and synchronize `docker/helper` before building. Both images build entirely from this checkout. The runner references the signed coordinator libraries; do not replace them with patched application source or mocked server startup.

Bitcoin's version is pinned in the lab manifest and its Dockerfile comes from the locked Bitcoin packaging dependency. Retain the upstream package's signature and checksum verification.

Build and install locally, check startup and health, one small completed round, restart persistence, interfaces, and the ordinary configuration actions. Record findings and run evidence outside the repository in the workspace research folder.

Release tags use `v<upstream>_<revision>-regtest`, for example `v2.8.4_0-regtest`, created on the `regtest` branch. Mainnet uses `v2.8.4_0` on `main`; Testnet4 uses `v2.8.4_0-testnet4` on `testnet4`. Push each tag individually to start Start9's reusable release workflow. The package version remains `2.8.4:0`; the tag suffix does not change it.

Automatic tag-and-release is disabled. PR builds cover all three branches. The shared repository needs a `DEV_KEY` secret for signed releases; `RELEASE_REGISTRY` is optional for registry publication, and S3 settings are optional. Without a registry setting, the workflow still publishes GitHub release assets.
