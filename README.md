# KinVault

Inherit Bitcoin without selling it. KinVault auto-borrows MUSD against BTC collateral at Mezo's fixed rate and distributes the borrowed MUSD to Passport-verified beneficiaries when the owner's heartbeat expires.

This is custody-planning infrastructure. It is not a legal will, probate product, financial advice, or seed-phrase custody substitute.

## How It Works

1. **Owner deposits BTC** into the vault as collateral
2. **Owner sets beneficiaries** with percentage-based splits (basis points summing to 100%)
3. **Owner maintains liveness** via periodic heartbeat transactions
4. **Heartbeat expires** — anyone can trigger the release:
   - Contract calls `BorrowerOperations.openTrove()` to borrow MUSD against the BTC
   - Minted MUSD is distributed proportionally to each beneficiary
   - Bitcoin stays whole as collateral; heirs get usable money

## Mezo Integration

- **MUSD borrowing** via BorrowerOperations (Liquity v1 fork) — `openTrove()` with BTC as `msg.value`
- **PriceFeed oracle** for live BTC/USD price and MUSD debt estimation
- **Mezo Passport** for beneficiary identity verification (API-based, frontend-enforced)
- **Multi-beneficiary BPS splits** — percentage allocations enforced on-chain

## What Is Built

- Solidity `KinVault` contract (~200 lines): BTC deposits, multi-beneficiary management, heartbeat dead-man's switch, MUSD trove opening on release, pro-rata distribution
- 10 Foundry tests with mock Liquity stack (BorrowerOperations, PriceFeed, MUSD)
- Vite/React/TypeScript frontend with role-based UI (owner/beneficiary views), live contract reads via wagmi, real transaction calls
- Mezo Passport + RainbowKit wallet connection

## Run Locally

```bash
npm install
npm run dev -- --port 5317 --strictPort
```

## Verify

```bash
forge test -vv       # 10/10 tests pass
npm run build        # TypeScript + Vite build
```

## Deploy

```bash
export MEZO_PRIVATE_KEY=0x<testnet-owner-private-key>
forge script script/DeployMezo.s.sol --rpc-url https://rpc.test.mezo.org --broadcast --legacy
```

Then add beneficiaries and deposit BTC:

```bash
cast send <VAULT> "addBeneficiary(address,uint16)" <ADDR> 7000 --rpc-url https://rpc.test.mezo.org --private-key $KEY --legacy
cast send <VAULT> "deposit()" --value 0.035ether --rpc-url https://rpc.test.mezo.org --private-key $KEY --legacy
```

## Live Deployment

- **Contract:** [`0xa6a621e9C92fb8DFC963d2C20e8C5CB4C5178cBb`](https://explorer.test.mezo.org/address/0xa6a621e9C92fb8DFC963d2C20e8C5CB4C5178cBb) on Mezo Testnet (chain 31611)
- **Tx:** [`0x44e2ea9a...`](https://explorer.test.mezo.org/tx/0x44e2ea9aa50b61998790909374103efb1937c80387455c033ded7668828100b5)
- **Frontend:** [mezo-kinvault.vercel.app](https://mezo-kinvault.vercel.app)
- **Collateral:** 0.035 BTC deposited, 2 beneficiaries (70/30 split)

## Mezo Contract Addresses Used

| Contract | Testnet Address |
|----------|----------------|
| BorrowerOperations | `0xCdF7028ceAB81fA0C6971208e83fa7872994beE5` |
| PriceFeed | `0x86bCF0841622a5dAC14A313a15f96A95421b9366` |
| MUSD | `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` |
| TroveManager | `0xE47c80e8c23f6B4A1aE41c34837a0599D5D16bb0` |

## Mainnet Roadmap

- Security audit (contract + trove interaction edge cases)
- Multi-sig admin for emergency pause
- Configurable heartbeat intervals (30-day, 90-day, 1-year)
- Mezo Earn integration for yield accrual on idle BTC collateral
- Legal wrapper for trust-like structure (non-US jurisdictions)
- Continuation grant eligibility: BTC Treasury for retail families and DAOs

## License

MIT
