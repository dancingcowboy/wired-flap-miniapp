# WIRED Launches — Flap Mini App v2

This repository contains the WIRED Mini App artifact and the on-chain Flap Shared Indexer launch wrapper used by WIRED on BNB Chain.

## Artifact

`src/vaults/wired-launches/`

- `Component.tsx` — responsive launch interface and sponsored-launch flow
- `manifest.json` — App v2 identity, languages, and endpoint declarations
- `i18n.json` — English, Chinese, and Korean interface copy
- `VaultABI.ts` — required artifact ABI export

## Integration

Copy `src/vaults/wired-launches` into the same path in the official `flap-vault-component-template` repository on its `feat/mini-app-v2` branch, then run:

```bash
yarn app:check wired-launches
yarn app:e2e wired-launches
yarn app:package wired-launches
yarn app:verify-package wired-launches
```

The Mini App calls WIRED's public API endpoints declared in `manifest.json`. Deployment signing, sponsored-launch funding, rate limiting, and private infrastructure remain on the WIRED backend; no credentials or private keys are included here.

## Contracts

- `contracts/WiredFlapFsiLauncher.sol` — launches through Flap Portal and emits the FSI `wired-launch` feed
- `contracts/WiredFlapFsiLauncherV2.sol` — adds caller-bound owner authorization for sponsored and user-paid launches
- `deployments/bsc-mainnet.json` — BNB Chain deployment record

Current BNB Chain deployment:

- Chain ID: `56`
- Contract: `0xE7B3cb466c956f5DeD126240ebdF58eaB48350EA`
- Deployment transaction: `0xd3a53df6f0bf551ccddc208a15f51ea0198fd24a771f35ffc0dcaffc1574dbd2`

The UI deliberately exports an empty `VaultABI`: users do not sign wrapper calls inside the Mini App. It submits to the WIRED sponsored-launch backend, which validates, rate-limits, signs, funds, and executes the wrapper transaction.

Live preview: https://wiredup.app/miniapp
