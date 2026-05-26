export type Scene = {
  id: string;
  start: number;
  end: number;
  kicker: string;
  title: string;
  body: string;
  caption: string;
  visual:
    | "hook"
    | "problem"
    | "architecture"
    | "slot"
    | "value"
    | "close"
    | "stakes"
    | "proof";
  slot?: string;
};

export const scenes: Scene[] = [
  {
    id: "hook",
    start: 0,
    end: 13,
    kicker: "KinVault",
    title: "Bitcoin stays collateral. Families receive MUSD.",
    body: "A Mezo-native beneficiary release vault for BTC-backed emergency liquidity.",
    caption:
      "KinVault helps Bitcoin holders pass emergency liquidity to their families without selling Bitcoin.",
    visual: "stakes",
  },
  {
    id: "team",
    start: 13,
    end: 29,
    kicker: "Why this team",
    title: "Proof-first, not pitch-first.",
    body: "Foundry contracts, live Mezo reads, Vite frontend, and product screens that show the full vault lifecycle.",
    caption:
      "We built custody-planning infrastructure, not a legal will or a fake demo.",
    visual: "proof",
  },
  {
    id: "problem",
    start: 29,
    end: 49,
    kicker: "Problem",
    title: "Inheritance plans break at execution time.",
    body: "Families may not know how to recover BTC, what to sell, or how to act safely under pressure.",
    caption:
      "Bitcoin holders need a narrow release path that preserves BTC exposure.",
    visual: "problem",
  },
  {
    id: "solution",
    start: 49,
    end: 66,
    kicker: "Solution",
    title: "A check-in unlocks BTC-backed MUSD liquidity.",
    body: "The 60-second heartbeat is demo speed. In production, this is a monthly or quarterly owner check-in with reminders and grace periods.",
    caption:
      "If the owner misses enough check-ins, beneficiaries can follow the prepared MUSD release flow.",
    visual: "architecture",
  },
  {
    id: "demo-explorer",
    start: 66,
    end: 74,
    kicker: "Live app",
    title: "Protocol Explorer on Mezo Testnet.",
    body: "Vaults created, BTC price from oracle, borrow rate, deployed contracts.",
    caption: "KinVault on Mezo Testnet — live on-chain data.",
    visual: "slot",
    slot: "recordings/demo-full.mp4",
  },
  {
    id: "demo-create",
    start: 74,
    end: 98,
    kicker: "Create vault",
    title: "Name, description, cover, check-in interval.",
    body: "Add beneficiaries with wallet addresses and percentage splits. Deploy with one click.",
    caption:
      "The factory contract deploys the vault and adds each beneficiary on-chain.",
    visual: "slot",
    slot: "recordings/demo-full.mp4",
  },
  {
    id: "demo-deposit",
    start: 98,
    end: 120,
    kicker: "Fund & monitor",
    title: "Deposit BTC. Watch the dashboard.",
    body: "BTC locked, live price, estimated MUSD, beneficiary split, check-in timer.",
    caption:
      "The owner can check in with one tap. Miss it, and the gate opens.",
    visual: "slot",
    slot: "recordings/demo-full.mp4",
  },
  {
    id: "demo-beneficiary",
    start: 120,
    end: 153,
    kicker: "Beneficiary claim",
    title: "Switch wallet. Claim MUSD.",
    body: "The beneficiary sees their allocation and triggers the release when the check-in expires.",
    caption:
      "The relay opens a MUSD trove and distributes to each beneficiary by the configured split.",
    visual: "slot",
    slot: "recordings/demo-full.mp4",
  },
  {
    id: "demo-proof",
    start: 153,
    end: 170,
    kicker: "Proof-first",
    title: "Real BTC. Real MUSD. Real trove.",
    body: "Not a mockup. Deployed, funded, and released on Mezo Testnet.",
    caption: "Activity feed with explorer links for every transaction.",
    visual: "slot",
    slot: "recordings/demo-full.mp4",
  },
  {
    id: "business",
    start: 170,
    end: 195,
    kicker: "Mezo value",
    title: "More BTC collateral. More MUSD demand.",
    body: "First users: Bitcoin-native families, founders, and small treasury holders who need rehearsable emergency liquidity.",
    caption:
      "KinVault gives people a concrete reason to bring BTC into Mezo and use MUSD.",
    visual: "value",
  },
  {
    id: "close",
    start: 195,
    end: 210,
    kicker: "KinVault",
    title: "Bitcoin stays collateral. Families receive MUSD.",
    body: "Built for Mezo Testnet with BTC collateral, MUSD borrowing, and onchain beneficiary release.",
    caption:
      "KinVault helps Bitcoin holders pass emergency liquidity without selling their Bitcoin.",
    visual: "close",
  },
];
