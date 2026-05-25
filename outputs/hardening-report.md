# KinVault — Hardening Report (v3)

**Date:** 2026-05-25
**Contract:** `0x15ad9d57A5A6Fea6b7efdA228ef117a4A7ed9ef9` (Mezo Testnet 31611)

## Access control
- `onlyOwner` on `deposit`, `heartbeat`, `addBeneficiary`, `removeBeneficiary`, `fundMezoBond`, and `receive()`.
- `release()` is intentionally permissionless (dead-man's switch) but guarded by `notReleased`, heartbeat expiry, `totalBps == 10000`, `balance > 0`, and `beneficiaries > 0`.
- `rehearseClaim()` reverts with `NotBeneficiary` for non-configured callers (test: `testNonBeneficiaryCannotRehearse`).

## State-machine safety
- `notReleased` modifier blocks all mutations after release; `testDoubleReleaseReverts` covers re-entry of `release`.
- `released` set **before** external calls (`openTrove`, `transfer`) — checks-effects-interactions ordering against re-entrancy.
- BPS math: `addBeneficiary` rejects overflow past 10000; release requires exactly 10000 (`BpsIncomplete`).
- Last-beneficiary remainder pattern avoids dust loss on both MUSD and MEZO distribution.

## MEZO bond
- Funded via `transferFrom` (owner must approve) — no blind `transfer` assumptions; `TransferFailed` on a falsey return.
- Keeper reward capped by `keeperRewardBps` (constructor rejects > 10000, test: `testConstructorRejectsBadKeeperBps`).
- `_payMezoRewards` is a no-op when `mezoBond == 0` — release never reverts for lack of a bond (test: `testReleaseWithZeroBondSkipsMezo`).
- `mezoBond` zeroed before transfers (re-entrancy-safe).

## Collateral / debt math
- 130% safety CR (above Mezo 110% MCR) in `_computeNetDebt`; reverts `InsufficientCollateral` if net debt < `minNetDebt` or collateral can't cover gas comp.
- Live release at 0.045 BTC / ~$77k produced net debt ≈ 2,463 MUSD > 1,800 minNetDebt — comfortable margin.

## Frontend
- All reads are live wagmi `useReadContracts` against Mezo RPC; explicit error states (`risk.isError`) instead of dummy data.
- Gas pre-check disables transaction buttons + shows faucet banner when balance < 0.0001 BTC.
- No `localStorage`/fixture/mock data in shipped app (grep-clean). Mock connector lives only in the Playwright harness (not in the production build).

## Known limitations
- Single-vault-per-deploy (no factory yet).
- Passport verification is API/frontend-enforced, not on-chain (documented in research notes).
- MEZO bond unfunded on testnet (faucet CAPTCHA) — see readiness report blocker.
- Not audited; mainnet roadmap lists audit + multisig pause.
