export const shortAddress = (value: string) => {
  if (!value.startsWith("0x") || value.length < 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const EXPLORER = "https://explorer.test.mezo.org";

/** Canonical on-chain proof for the live KinVault deployment (Mezo Testnet). */
export const PROOF = {
  network: "Mezo Testnet",
  chainId: 31611,
  contract: "0x15ad9d57A5A6Fea6b7efdA228ef117a4A7ed9ef9",
  deployBlock: 13261962n,
  deployTx:
    "0xac884951e1e194e577f440badad29818086692eff479e4afa879da20602cdfe3",
  // Live release() execution — opened MUSD trove + distributed to beneficiaries.
  releaseTx:
    "0x019e6c1c5c37740b6d11c28203853139b6be0b926d2d3a5110f9d26a84564eab",
  liveUrl: "https://mezo-kinvault.vercel.app",
  proofJson:
    "https://github.com/BonneyMantra/mezo-kinvault/blob/main/outputs/proofs/latest.json",
} as const;

export const explorerAddress = (addr: string) => `${EXPLORER}/address/${addr}`;
export const explorerTx = (tx: string) => `${EXPLORER}/tx/${tx}`;
