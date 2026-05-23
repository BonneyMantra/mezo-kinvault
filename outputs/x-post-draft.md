# X Post Drafts — KinVault / Mezo Hackathon

**DO NOT POST — for review only.**
**Post from Bonney's account after submission.**

---

## Primary Post (Bonney — technical, infra-focused voice)

```
Built KinVault for the @MezoNetwork hackathon.

A heartbeat-based beneficiary release vault for MUSD on Mezo Testnet.

→ Owner funds an emergency MUSD reserve
→ Keeps it alive with periodic heartbeats
→ Heartbeat expires → beneficiary releases the vault

Deployed on Mezo Testnet ⛓️

🔗 https://mezo-kinvault.vercel.app
📦 https://github.com/BonneyMantra/mezo-kinvault
🔍 https://explorer.test.mezo.org/address/0xa6a621e9C92fb8DFC963d2C20e8C5CB4C5178cBb

#Mezo #Bitcoin #DeFi #Hackathon
```

---

## Short Version (single tweet)

```
KinVault — heartbeat-based Bitcoin beneficiary release on @MezoNetwork.

Fund a MUSD reserve → heartbeat keeps it locked → miss a heartbeat → beneficiary claims it.

Solidity + Foundry + Vite/React. Deployed on Mezo Testnet.

Demo: https://mezo-kinvault.vercel.app
Code: github.com/BonneyMantra/mezo-kinvault

#Mezo #Bitcoin
```

---

## Thread Version (2 posts)

Post 1:
```
Bitcoin inheritance is broken. Seed phrases aren't a plan — they're a liability.

KinVault is a custody-planning primitive built for the @MezoNetwork hackathon. It doesn't replace a will. It moves one narrow piece onchain: an emergency MUSD reserve with a dead-man's switch.

🧵
```

Post 2:
```
How it works:

1. Owner funds a MUSD emergency reserve on Mezo
2. Owner sends heartbeat transactions periodically
3. Miss the heartbeat window → beneficiary can release the vault

5/5 Foundry tests ✅ | Deployed on Mezo Testnet ⛓️

Demo: https://mezo-kinvault.vercel.app
Code: github.com/BonneyMantra/mezo-kinvault
Contract: explorer.test.mezo.org/address/0x2298…3047

#Mezo #Bitcoin #DeFi
```

---

## Notes

- DO NOT post until after Encode Club submission is complete.
- Verify Mezo's official X handle before posting (could be @MezoNetwork, @mezo_org, or @mezo_btc).
- Contract: `0xa6a621e9C92fb8DFC963d2C20e8C5CB4C5178cBb` on Mezo Testnet
- Explorer: https://explorer.test.mezo.org/address/0xa6a621e9C92fb8DFC963d2C20e8C5CB4C5178cBb
- Post after submission, not before.
