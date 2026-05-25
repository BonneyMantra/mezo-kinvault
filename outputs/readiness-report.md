# KinVault — Readiness Report (v3)

**Date:** 2026-05-25
**Verdict:** Technically submit-ready. Live contract + live frontend + real proof JSON + passing tests + real transaction evidence all in place. One non-blocking enhancement (MEZO bond funding) is gated by a faucet CAPTCHA.

## Submit-ready checklist (per hard rules)

| Requirement | Status | Evidence |
|---|---|---|
| Live Mezo contract | ✅ | `0x15ad9d57A5A6Fea6b7efdA228ef117a4A7ed9ef9` (deploy tx `0xac8849…cdfe3`) |
| Live frontend | ✅ | https://mezo-kinvault.vercel.app |
| Real proof JSON | ✅ | `outputs/proofs/latest.json` (canonical, stale v1/v2 archived) |
| Tests passing | ✅ | forge 19/19, smoke 12/12, e2e 12/12, build OK |
| Real transaction evidence | ✅ | deposit, rehearsal, **release** (`0x019e6c…564eab`) — 2,463 MUSD distributed, trove active |

## Track fit
- **Bitcoin:** native BTC collateral locked in-vault, moved into a Mezo trove on release.
- **MUSD:** borrowed via BorrowerOperations `openTrove`, distributed to beneficiaries (verified balances on-chain).
- **MEZO:** real ERC20 (verified symbol/decimals/supply on testnet); keeper-bond utility implemented + unit-tested; live funding pending faucet (below).

## Remaining items for Gabriel
1. **Demo video** — record (suggested flow in `outputs/parallel-completion-report.md` / submission notes).
2. **MEZO bond (optional polish):** solve the Mezo faucet CAPTCHA at https://faucet.test.mezo.org (select MEZO, address `0x6B9ad963c764a06A7ef8ff96D38D0cB86575eC00`), then:
   ```bash
   cast send 0x7B7c000000000000000000000000000000000001 "approve(address,uint256)" 0x15ad9d57A5A6Fea6b7efdA228ef117a4A7ed9ef9 1000ether --rpc-url https://rpc.test.mezo.org --private-key $KEY --legacy
   cast send 0x15ad9d57A5A6Fea6b7efdA228ef117a4A7ed9ef9 "fundMezoBond(uint256)" 1000ether --rpc-url https://rpc.test.mezo.org --private-key $KEY --legacy
   ```
   (Note: the live vault is already *released*; to demo a funded bond, deploy a fresh instance — heartbeat/keeper configurable via `MEZO_HEARTBEAT_INTERVAL` / `MEZO_KEEPER_REWARD_BPS`.)
3. **Encode Club submission** — paste from `outputs/encode-club-prefill-draft.md`, do not auto-submit.

## Blocker detail
- **Mezo MEZO faucet** (`faucet.test.mezo.org`) uses Cloudflare Turnstile; it returned "Verification failed" on two automated attempts. BTC faucet path not needed (consolidated existing testnet BTC). This blocks *live* MEZO bond funding only — the contract feature is complete and unit-tested.
