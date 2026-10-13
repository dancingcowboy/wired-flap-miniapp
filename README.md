# WIRED Launches — Flap Mini App v2

This repository contains only the WIRED Mini App artifact intended for integration into Flap's official Mini App v2 framework.

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

Live preview: https://wiredup.app/miniapp
