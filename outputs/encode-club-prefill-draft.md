# Encode Club Submission — Prefill Draft

**Portal:** https://www.encodeclub.com/programmes/mezo-hackathon-building-bitcoins-future
**Account to use:** `1inchunitedefi@gmail.com` (Bonney — must create Encode Club account first)

---

## Field Values

### Project Name
```
KinVault
```

### Short Description
```
Inherit Bitcoin without selling it. KinVault auto-borrows MUSD against BTC collateral and distributes it to Passport-verified beneficiaries.
```

### Long Description
```
KinVault is custody-planning infrastructure for Bitcoin holders on Mezo. An owner deposits BTC into the vault, sets percentage-based splits for multiple beneficiaries, and maintains liveness with periodic heartbeat transactions.

When the heartbeat expires, anyone can trigger the release: the contract calls BorrowerOperations.openTrove() to borrow MUSD against the BTC collateral at Mezo's fixed rate, then distributes the minted MUSD proportionally to each beneficiary.

Deep Mezo integration:
- BTC collateral → MUSD trove via BorrowerOperations (Liquity fork)
- Live BTC price from Mezo PriceFeed oracle
- Multi-beneficiary BPS splits (basis points, summing to 100%)
- Passport-verified beneficiary addresses
- 10/10 Foundry tests including trove opening mock

This solves a real problem: most Bitcoin inheritance plans fail because families don't know what to do with seed phrases. KinVault moves one narrow piece onchain — BTC stays whole as collateral, heirs receive usable MUSD.

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

### Video URL
```
(Gabriel records and pastes — leave blank or use placeholder)
```

### Smart Contract Address (if asked)
```
0xa6a621e9C92fb8DFC963d2C20e8C5CB4C5178cBb
```

### Deployment Network
```
Mezo Testnet (Chain ID: 31611)
```

### Explorer Link (if asked)
```
https://explorer.test.mezo.org/address/0xa6a621e9C92fb8DFC963d2C20e8C5CB4C5178cBb
```

### Transaction Hash (if asked)
```
0x44e2ea9aa50b61998790909374103efb1937c80387455c033ded7668828100b5
```

---

## Team Members

| Name | Role | GitHub | Email |
|------|------|--------|-------|
| Bonney | Lead / Primary Submitter | BonneyMantra | 1inchunitedefi@gmail.com |
| Gabriel Antony Xavier | Co-builder | gabrielantonyxaviour | gabrielantony56@gmail.com |
| KaizokuJoel | Co-member | — | loganfernando69@gmail.com |

---

## Notes

- Pre-fill blocked on Encode Club account creation for `1inchunitedefi@gmail.com`.
- Once Gabriel creates the Encode Club account for Bonney, paste values from this file into the form.
- DO NOT click final Submit until demo video URL is added.
- The portal URL is: https://www.encodeclub.com/programmes/mezo-hackathon-building-bitcoins-future
- Sign in with Google using `1inchunitedefi@gmail.com`, then click "Apply".
