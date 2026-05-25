# Encode Club Submission — Prefill Draft

**STATUS: ✅ SUBMITTED 2026-05-25** — project "KinVault" created and submitted under Gabriel's Encode Club account (Registered/accepted). Bonney + KaizokuJoel joined the team via join code `[team join code — shared privately]`. Submission is editable.

**Portal:** https://www.encodeclub.com/my-programmes/mezo-hackathon-building-bitcoins-future
**Submitted by:** `gabrielantony56@gmail.com` (Gabriel — primary submitter / Leader)
**Team join code:** `[team join code — shared privately]`

---

## Field Values

### Project Name
```
KinVault
```

### Short Description
```
Inherit Bitcoin without selling it. KinVault borrows MUSD against BTC collateral and releases it to beneficiaries when the owner's check-in lapses — with on-chain claim rehearsal and a MEZO keeper bond.
```

### Long Description
```
KinVault is custody-planning infrastructure for Bitcoin holders on Mezo. An owner deposits BTC, sets percentage splits for multiple beneficiaries, and keeps a heartbeat (dead-man's switch) alive. If the heartbeat lapses, anyone can trigger release: the contract calls BorrowerOperations.openTrove() to borrow MUSD against the BTC at Mezo's fixed rate and distributes the MUSD proportionally to beneficiaries. Bitcoin stays whole as collateral; heirs receive usable money.

Full Mezo fit — Bitcoin, MUSD, and MEZO:
- BTC collateral → MUSD trove via BorrowerOperations (Liquity v1 fork)
- Live BTC price + risk from PriceFeed and TroveManager (ICR, liquidation price)
- Multi-beneficiary BPS splits enforced on-chain
- MEZO keeper bond: owner funds a MEZO bond; the keeper who triggers release earns a reward and beneficiaries split the rest (real MEZO ERC20 at 0x7B7c…0001)
- On-chain beneficiary rehearsal: heirs practice their claim before the day comes
- Mezo Passport for beneficiary identity

Proven live on Mezo Testnet: deposited 0.045 BTC, configured 2 beneficiaries (70/30), rehearsed, and executed a real release that opened a MUSD trove and distributed 2,463 MUSD. 19/19 Solidity tests, 12-check live RPC smoke suite, 12 Playwright E2E at 375/768/1440.

Not a legal will. An operational fallback for Bitcoin-backed money.
```

### Track
```
Bank on Bitcoin - Bitcoin Track
```

### GitHub Repository
```
https://github.com/BonneyMantra/mezo-kinvault
```

### Demo URL
```
https://mezo-kinvault.vercel.app
```

### Video URL (submitted)
```
https://pub-941451dcd151465daae86e7f9a1ae2ca.r2.dev/hackathon-demo.mp4
```

### Pitch Deck URL (submitted)
```
https://pub-941451dcd151465daae86e7f9a1ae2ca.r2.dev/kinvault-pitch-deck.pdf
```

### Smart Contract Address (if asked)
```
0x15ad9d57A5A6Fea6b7efdA228ef117a4A7ed9ef9
```

### Deployment Network
```
Mezo Testnet (Chain ID: 31611)
```

### Explorer Link (if asked)
```
https://explorer.test.mezo.org/address/0x15ad9d57A5A6Fea6b7efdA228ef117a4A7ed9ef9
```

### Transaction Hashes (if asked)
```
Deploy:  0xac884951e1e194e577f440badad29818086692eff479e4afa879da20602cdfe3
Release: 0x019e6c1c5c37740b6d11c28203853139b6be0b926d2d3a5110f9d26a84564eab
```

---

## Team Members

| Name | Role | GitHub | Email |
|------|------|--------|-------|
| Gabriel Antony Xaviour | Leader / Primary Submitter | gabrielantonyxaviour | gabrielantony56@gmail.com |
| Bonney Mantra | Co-builder / repo owner | BonneyMantra | 1inchunitedefi@gmail.com |
| KaizokuJoel (Joel Peter) | Co-member | — | loganfernando69@gmail.com |

All three are confirmed on the Encode Club team (Team Members: 3). Tracks submitted: Bank on Bitcoin (Bitcoin), MEZO Utilization (MEZO), Supernormal dApps (MUSD).

---

## Notes

- Pre-fill blocked on Encode Club account creation for `1inchunitedefi@gmail.com`.
- Once Gabriel creates the Encode Club account for Bonney, paste values from this file into the form.
- DO NOT click final Submit until demo video URL is added.
- The portal URL is: https://www.encodeclub.com/programmes/mezo-hackathon-building-bitcoins-future
- Sign in with Google using `1inchunitedefi@gmail.com`, then click "Apply".
