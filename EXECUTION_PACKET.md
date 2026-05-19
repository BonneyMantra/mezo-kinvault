# Execution Packet: KinVault

## README Source

**KinVault** is a Mezo beneficiary-release cockpit for Bitcoin holders. It lets an owner fund a MUSD emergency reserve, keep it active with a periodic heartbeat, and let a beneficiary release the funds after the heartbeat expires.

This is custody-planning infrastructure, not a legal will, financial advice, or probate replacement.

## Judging Criteria Mapping

- Mezo Integration: MUSD is the vault asset; Mezo Testnet is the target deployment; BTC is used for gas.
- Technical Implementation: Solidity heartbeat/release contract, tests, deployment scripts, event receipts.
- Business Viability: Bitcoin holders need a beneficiary rehearsal and emergency expense path that does not require seed-phrase chaos after death/incapacity.
- UX: first screen shows the liveness gate, countdown, beneficiary state, and proof receipt.
- Presentation: 60-second compressed demo produces a visible state transition.

## Demo Script

1. "This is not a legal will. It is a Mezo custody-planning primitive."
2. Show KinVault active with owner, beneficiary, MUSD reserve, and heartbeat timer.
3. Attempt release before timeout: blocked.
4. Let the 60-second heartbeat expire.
5. Beneficiary triggers release.
6. Show `BeneficiaryReleased` in the local fixture proof artifact unless a real Mezo deployment has been completed.
7. Close with continuation: recurring heartbeat agents and beneficiary rehearsal service for Mezo users.

## Video Script

Open on the countdown cockpit. Narration:

"Most Bitcoin inheritance plans fail at the worst moment: the family does not know what to do, and the seed phrase becomes the whole plan. KinVault moves one narrow part onchain. A holder funds a MUSD emergency reserve on Mezo, keeps it locked with a heartbeat, and if the heartbeat expires, the beneficiary can release the reserve. It is not a legal will. It is an operational fallback for Bitcoin-backed money."

Then show early release rejection, timeout, beneficiary release, and the receipt. Label the current receipt as a local fixture until a Mezo Testnet explorer transaction exists.

## Links

- Repo: `https://github.com/gabrielantonyxaviour/mezo-kinvault`
- Local demo URL: `http://localhost:5317/`
- Public demo URL: `https://mezo-kinvault.vercel.app`
- Mezo docs: `https://mezo.org/docs/developers/getting-started/`
- Hackathon: `https://mezo.org/blog/the-mezo-hackathon-is-back/`
- Submission portal: `https://www.competehub.dev/en/competitions/encodeclub_mezo-hackathon-building-bitcoins-future`

## Final Checklist

- [x] Team selected. (Gabriel — autonomous default 2026-05-24)
- [x] Public repo created under selected owner. (gabrielantonyxaviour/mezo-kinvault)
- [x] Contract tests pass. (5/5)
- [x] Local proof generated.
- [x] Mezo RPC chain ID verified.
- [ ] Mezo Testnet deployment attempted or blocker recorded. (BLOCKED — zero testnet BTC)
- [x] UI built and tested locally.
- [x] Polish workflow blocker reported.
- [x] Frontend deployed publicly. (https://mezo-kinvault.vercel.app)
- [ ] Submission portal submitted (needs Gabriel login to Encode Club).
- [x] Builder/completion report written.
