export type ProofEvent = {
  label: string;
  status: "complete" | "blocked" | "pending";
  detail: string;
};

export type KinVaultProof = {
  product: string;
  proofSource: "local fixture" | "mezo testnet";
  network: string;
  chainId: number;
  owner: string;
  beneficiary: string;
  vault: string;
  asset: string;
  amount: string;
  heartbeatIntervalSeconds: number;
  verifiedBy: string;
  mezoTarget: {
    chainId: number;
    rpc: string;
    explorer: string;
    musd: string;
  };
  events: ProofEvent[];
};

export const kinVaultProof: KinVaultProof = {
  product: "KinVault",
  proofSource: "local fixture",
  network: "Anvil local fixture",
  chainId: 31337,
  owner: "0x00000000000000000000000000000000000A11cE",
  beneficiary: "0x0000000000000000000000000000000000000B0B",
  vault: "deploys in Foundry test runtime",
  asset: "MockMUSD",
  amount: "12,500.00 MUSD",
  heartbeatIntervalSeconds: 60,
  verifiedBy: "forge test -vv",
  mezoTarget: {
    chainId: 31611,
    rpc: "https://rpc.test.mezo.org",
    explorer: "https://explorer.test.mezo.org",
    musd: "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503",
  },
  events: [
    {
      label: "Heartbeat",
      status: "complete",
      detail: "Owner liveness timestamp initializes and can be refreshed before timeout.",
    },
    {
      label: "VaultFunded",
      status: "complete",
      detail: "Owner deposits ERC-20 MUSD-compatible reserve after approval.",
    },
    {
      label: "EarlyReleaseRejected",
      status: "complete",
      detail: "Beneficiary release reverts while heartbeat window is still active.",
    },
    {
      label: "BeneficiaryReleased",
      status: "complete",
      detail: "Beneficiary receives the full reserve after the missed heartbeat.",
    },
    {
      label: "MezoDeployment",
      status: "blocked",
      detail: "Blocked on selected submitter wallet, testnet BTC gas, and testnet MUSD.",
    },
  ],
};

export const shortAddress = (value: string) => {
  if (!value.startsWith("0x") || value.length < 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};
