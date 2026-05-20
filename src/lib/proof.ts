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
  proofSource: "mezo testnet",
  network: "Mezo Testnet",
  chainId: 31611,
  owner: "0x6B9ad963c764a06A7ef8ff96D38D0cB86575eC00",
  beneficiary: "0x86CA136dc8B2Ac6B10143Ed23AC361FCBbd6bFCa",
  vault: "0x229869949693f1467b8b43d2907bDAE3C58E3047",
  asset: "MUSD",
  amount: "0.00 MUSD",
  heartbeatIntervalSeconds: 60,
  verifiedBy: "forge script DeployMezo.s.sol --broadcast --legacy",
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
      detail:
        "Owner liveness timestamp initializes and can be refreshed before timeout.",
    },
    {
      label: "VaultFunded",
      status: "complete",
      detail: "Owner deposits ERC-20 MUSD-compatible reserve after approval.",
    },
    {
      label: "EarlyReleaseRejected",
      status: "complete",
      detail:
        "Beneficiary release reverts while heartbeat window is still active.",
    },
    {
      label: "BeneficiaryReleased",
      status: "complete",
      detail:
        "Beneficiary receives the full reserve after the missed heartbeat.",
    },
    {
      label: "MezoDeployment",
      status: "complete",
      detail: "Deployed to Mezo Testnet at 0x2298...3047. Tx: 0x41f2...d965.",
    },
  ],
};

export const shortAddress = (value: string) => {
  if (!value.startsWith("0x") || value.length < 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};
