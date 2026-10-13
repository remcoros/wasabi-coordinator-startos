# Updating the Regtest Lab

Maintain the Mainnet wrapper first. Synchronize shared wrapper code into this development variant, retaining its fixed regtest profile, embedded node startup, lab actions, disposable receiving-account setup, and third volume.

The coordinator image builds from the sibling Mainnet package. Refresh `Dockerfile.runner` from that Dockerfile, preserving the runner build stages, and synchronize `docker/helper` before building. The runner references the signed coordinator libraries; do not replace them with patched application source or mocked server startup.

Bitcoin's version is pinned in the lab manifest and its Dockerfile comes from the locked Bitcoin packaging dependency. Retain the upstream package's signature and checksum verification.

Build and install locally, check startup and health, one small completed round, restart persistence, interfaces, and the ordinary configuration actions. Record findings and run evidence outside the repository in the workspace research folder. This development package has no automatic publication workflow.
