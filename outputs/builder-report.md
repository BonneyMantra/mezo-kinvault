# KinVault — Builder Report (v3 scope expansion)

**Date:** 2026-05-25
**Scope:** Upgrade KinVault from demo-ready to strongest-possible Mezo submission — real proof, real MEZO utility, beneficiary rehearsal.

## What changed

### Smart contract (`contracts/KinVault.sol`)
- Added **MEZO keeper bond**: `fundMezoBond(uint256)` (owner, via ERC20 `transferFrom`), `mezoBond` storage, `keeperRewardBps` immutable.
- On `release()`: after MUSD distribution, pays the keeper `keeperRewardBps` (10%) of the MEZO bond and splits the remainder to beneficiaries by BPS. Events: `MezoBondFunded`, `MezoKeeperRewardPaid`, `MezoBeneficiaryRewardPaid`. No-op when bond is 0.
- Added **on-chain rehearsal**: `rehearseClaim()` gated to configured beneficiaries, `rehearsalAt[address]`, `hasRehearsed()`, event `BeneficiaryRehearsed`.
- Added views: `isBeneficiary`, `beneficiaryBps`, `secondsUntilRelease`; `canRelease` now also requires `balance > 0`.
- Constructor now takes `mezo_` + `keeperRewardBps_`.

### Tests
- `test/KinVault.t.sol`: **19 tests** (was 10). New: MEZO bond funding, non-owner rejected, zero-bond reverts, keeper reward + beneficiary MEZO split, zero-bond release skips MEZO, beneficiary can rehearse, non-beneficiary rehearse reverts, isBeneficiary view, bad keeperBps constructor revert. Added `MockMEZO` (approve/transferFrom).
- `scripts/mezo-smoke.mjs`: 12 live read-only checks against Mezo Testnet. `npm run smoke:mezo`.

### Frontend
- `src/lib/contracts.ts`: new contract address + extended ABI (rehearsal, MEZO bond, views, events) + `BORROWER_OPS_ABI`.
- `src/hooks/useKinVault.ts`: `mezoBond`/`keeperRewardBps` reads, `useMezoRiskParams()`, `useBeneficiaryStatus(address)`.
- `src/components/Dashboard.tsx`: live Mezo borrow preview, MEZO keeper bond row, rehearsal box, judge-proof rail + disclaimer, loading-vs-empty beneficiary state.
- `src/lib/proof.ts`: canonical `PROOF` constants + explorer helpers.

### E2E
- `tests/e2e/kinvault.spec.ts` rewritten for the current app. Landing (no fake-proof labels) + dashboard owner/beneficiary/spectator via mock-connector harness (`harness.html` + `tests/harness/main.tsx`) reading **real on-chain state**. 12 checks at 375/768/1440. Screenshots → `outputs/v3-*.png`.

## Deploy + live execution
- New contract **`0x15ad9d57A5A6Fea6b7efdA228ef117a4A7ed9ef9`** (heartbeat 120s, keeper 10%).
- Deposited 0.045 BTC, added 2 beneficiaries (70/30), rehearsed from beneficiary wallet, executed `release()` — opened MUSD trove + distributed 2,463 MUSD.

## Blocker
- **MEZO bond live-funding**: Mezo MEZO faucet is Cloudflare-Turnstile gated (fails for automation); deployer holds 0 testnet MEZO. Contract path implemented + unit-tested; needs one human CAPTCHA + one `fundMezoBond` tx.

## Command results
| Command | Result |
|---|---|
| `forge test -vv` | 19/19 pass |
| `npm run smoke:mezo` | 12/12 pass |
| `npm run build` | pass |
| `npm run test:e2e` | 12/12 pass (375/768/1440) |
| `npm run check:mezo` | pass |
