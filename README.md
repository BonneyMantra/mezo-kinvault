# KinVault

Mezo Hackathon execution for **Onchain Bitcoin Will / Beneficiary Release**.

KinVault is beneficiary-release infrastructure for Bitcoin holders using Mezo. An owner funds a MUSD-denominated emergency reserve, keeps it active with heartbeats, and a beneficiary can release the reserve only after the heartbeat expires.

This is custody-planning infrastructure only. It is not a legal will, probate product, financial advice, or seed-phrase custody substitute.

## What Is Built

- Solidity `KinVault` contract with heartbeat, deposit, beneficiary rotation, no-early-release, and beneficiary release behavior.
- Foundry tests proving the release state transition with a local `MockMUSD` fixture.
- Vite/React/TypeScript cockpit with fixture/Mezo proof labeling, countdown state, release action, receipt rail, and Mezo Passport/RainbowKit wallet entry when `VITE_WALLETCONNECT_PROJECT_ID` is configured.
- Mezo Testnet deployment script at `script/DeployMezo.s.sol`.

## Run Locally

```bash
npm install
npm run dev -- --port 5317 --strictPort
```

App URL used during verification: `http://localhost:5317/`.

## Verify

```bash
npm run build
forge test -vv
npm run check:mezo
npm run test:e2e
```

The current proof is intentionally labeled `local fixture` because no primary submitter/profile wallet was assigned for Mezo Testnet funding. Without `VITE_WALLETCONNECT_PROJECT_ID`, the local UI disables the Passport button instead of pretending WalletConnect is configured.

## Mezo Deployment

Required environment variables:

```bash
export MEZO_PRIVATE_KEY=<testnet-owner-private-key>
export MEZO_BENEFICIARY=<beneficiary-address>
export MEZO_RPC_URL=https://rpc.test.mezo.org
export MEZO_MUSD=0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503
```

Then:

```bash
forge script script/DeployMezo.s.sol --rpc-url "$MEZO_RPC_URL" --broadcast
```

Do not commit private keys or wallet secrets.

## Readiness Boundary

Current readiness status on 2026-05-22 IST: `auth-blocked`.

Local E2E, contract tests, build, and read-only Mezo RPC/MUSD metadata checks pass. Real Passport wallet connection, signature, Mezo Testnet deployment, MUSD transfer, and explorer proof remain blocked until a selected submitter wallet/profile, WalletConnect project id, testnet BTC, and MUSD are available.
