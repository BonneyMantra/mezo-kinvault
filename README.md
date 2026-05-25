# KinVault

**Bitcoin beneficiary rehearsal + emergency MUSD liquidity on Mezo.** Inherit Bitcoin without selling it. KinVault borrows MUSD against BTC collateral at Mezo's fixed rate and distributes it to beneficiaries when the owner's heartbeat expires — and lets beneficiaries *rehearse* their claim on-chain before that day ever comes.

This is custody-planning infrastructure. It is not a legal will, probate product, financial advice, or seed-phrase custody substitute.

## How It Works

1. **Owner deposits BTC** into the vault as collateral
2. **Owner sets beneficiaries** with percentage-based splits (basis points summing to 100%)
3. **Owner (optionally) funds a MEZO keeper bond** — rewards whoever triggers release
4. **Beneficiaries rehearse** their claim on-chain to prove readiness (no funds move)
5. **Owner maintains liveness** via periodic heartbeat transactions
6. **Heartbeat expires** — anyone can trigger the release:
   - Contract calls `BorrowerOperations.openTrove()` to borrow MUSD against the BTC
   - Minted MUSD is distributed proportionally to each beneficiary
   - The MEZO bond pays the keeper (10%) + tops up beneficiaries (90%)
   - Bitcoin stays whole as collateral in the trove; heirs get usable money

## Mezo Integration

- **MUSD borrowing** via BorrowerOperations (Liquity v1 fork) — `openTrove()` with BTC as `msg.value`
- **PriceFeed oracle** for live BTC/USD price and MUSD debt estimation
- **MEZO token utility** — owner funds a MEZO bond; keeper earns a reward on release, beneficiaries split the rest (`MezoBondFunded` / `MezoKeeperRewardPaid` / `MezoBeneficiaryRewardPaid`)
- **Mezo Passport** for beneficiary identity verification (API-based, frontend-enforced)
- **Multi-beneficiary BPS splits** — percentage allocations enforced on-chain

## What Is Built

- Solidity `KinVault` contract: BTC deposits, multi-beneficiary management, heartbeat dead-man's switch, MUSD trove opening on release, pro-rata distribution, **MEZO keeper bond**, and **on-chain beneficiary rehearsal**
- **19 Foundry tests** with mock Liquity + MEZO stack (BorrowerOperations, PriceFeed, MUSD, MEZO)
- **Mezo read-only smoke suite** (`scripts/mezo-smoke.mjs`, 12 live checks)
- Vite/React/TypeScript frontend: role-aware owner/beneficiary/spectator views, **live Mezo borrow preview**, **rehearsal flow**, **judge-proof rail**, live contract reads via wagmi, real transaction calls
- **12 Playwright E2E checks** at 375/768/1440 (real on-chain reads via a mock-connector harness)
- Mezo Passport + RainbowKit wallet connection

## Live Proof — fully executed on Mezo Testnet

| Step | Tx |
|------|----|
| Deploy | [`0xac8849…cdfe3`](https://explorer.test.mezo.org/tx/0xac884951e1e194e577f440badad29818086692eff479e4afa879da20602cdfe3) |
| Deposit 0.045 BTC | [`0xaf9a0a…f96a762`](https://explorer.test.mezo.org/tx/0xaf9a0a29cd26bb7b34de54dafcba1f92a3c44d25b5991ab6b6e4b77b9f96a762) |
| Beneficiary rehearsal | [`0x190dad…07ca68`](https://explorer.test.mezo.org/tx/0x190dad36523279cf7e63f92fb9c2c1cdbe4129a0647b2e1792f7284bb307ca68) |
| **Release → MUSD trove + distribution** | [`0x019e6c…564eab`](https://explorer.test.mezo.org/tx/0x019e6c1c5c37740b6d11c28203853139b6be0b926d2d3a5110f9d26a84564eab) |

Release distributed **2,463 MUSD** (1,724.07 to the 70% beneficiary, 739.09 to the 30%) and opened an active trove (`getTroveStatus` = 1). Full proof: [`outputs/proofs/latest.json`](outputs/proofs/latest.json).

> **MEZO bond note:** the bond funding path is implemented and unit-tested, but the live bond is **0 MEZO** because the Mezo MEZO faucet is gated by Cloudflare Turnstile (fails for automation). One human CAPTCHA solve + a single `fundMezoBond` tx activates it.

## Run Locally

```bash
npm install
npm run dev -- --port 5317 --strictPort
```

## Verify

```bash
forge test -vv          # 19/19 contract tests pass
npm run smoke:mezo      # 12 live Mezo Testnet read checks
npm run build           # TypeScript + Vite build
npm run test:e2e        # 12 Playwright checks at 375/768/1440
```

## Deploy

```bash
export MEZO_PRIVATE_KEY=0x<testnet-owner-private-key>
forge script script/DeployMezo.s.sol --rpc-url https://rpc.test.mezo.org --broadcast --legacy
```

Then add beneficiaries, deposit BTC, and (optionally) fund a MEZO bond:

```bash
cast send <VAULT> "addBeneficiary(address,uint16)" <ADDR> 7000 --rpc-url https://rpc.test.mezo.org --private-key $KEY --legacy
cast send <VAULT> "deposit()" --value 0.045ether --rpc-url https://rpc.test.mezo.org --private-key $KEY --legacy
# MEZO bond (requires testnet MEZO): approve, then fund
cast send 0x7B7c000000000000000000000000000000000001 "approve(address,uint256)" <VAULT> 1000ether --rpc-url https://rpc.test.mezo.org --private-key $KEY --legacy
cast send <VAULT> "fundMezoBond(uint256)" 1000ether --rpc-url https://rpc.test.mezo.org --private-key $KEY --legacy
```

## Live Deployment

- **Contract (v3):** [`0x15ad9d57A5A6Fea6b7efdA228ef117a4A7ed9ef9`](https://explorer.test.mezo.org/address/0x15ad9d57A5A6Fea6b7efdA228ef117a4A7ed9ef9) on Mezo Testnet (chain 31611)
- **Deploy tx:** [`0xac8849…cdfe3`](https://explorer.test.mezo.org/tx/0xac884951e1e194e577f440badad29818086692eff479e4afa879da20602cdfe3)
- **Release tx:** [`0x019e6c…564eab`](https://explorer.test.mezo.org/tx/0x019e6c1c5c37740b6d11c28203853139b6be0b926d2d3a5110f9d26a84564eab)
- **Frontend:** [mezo-kinvault.vercel.app](https://mezo-kinvault.vercel.app)
- **Lifecycle proven:** 0.045 BTC deposited → 2 beneficiaries (70/30) → rehearsal → release distributed 2,463 MUSD via an active trove

## Mezo Contract Addresses Used

| Contract | Testnet Address |
|----------|----------------|
| BorrowerOperations | `0xCdF7028ceAB81fA0C6971208e83fa7872994beE5` |
| PriceFeed | `0x86bCF0841622a5dAC14A313a15f96A95421b9366` |
| MUSD | `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` |
| TroveManager | `0xE47c80e8c23f6B4A1aE41c34837a0599D5D16bb0` |
| MEZO | `0x7B7c000000000000000000000000000000000001` |

## Mainnet Roadmap

- Security audit (contract + trove interaction edge cases)
- Multi-sig admin for emergency pause
- Configurable heartbeat intervals (30-day, 90-day, 1-year)
- Mezo Earn integration for yield accrual on idle BTC collateral
- Legal wrapper for trust-like structure (non-US jurisdictions)
- Continuation grant eligibility: BTC Treasury for retail families and DAOs

## License

MIT
