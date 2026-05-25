export const MEZO_CHAIN_ID = 31611;

export const MEZO_ADDRESSES = {
  borrowerOperations: "0xCdF7028ceAB81fA0C6971208e83fa7872994beE5",
  troveManager: "0xE47c80e8c23f6B4A1aE41c34837a0599D5D16bb0",
  priceFeed: "0x86bCF0841622a5dAC14A313a15f96A95421b9366",
  musd: "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503",
  mezo: "0x7B7c000000000000000000000000000000000001" as `0x${string}`,
  // KinVault v3 — MEZO bond + keeper reward + beneficiary rehearsal
  kinVault: "0x15ad9d57A5A6Fea6b7efdA228ef117a4A7ed9ef9" as `0x${string}`,
} as const;

export const KINVAULT_ABI = [
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "released",
    inputs: [],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "lastHeartbeatAt",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "heartbeatInterval",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "vaultBalance",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalBps",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "beneficiaryCount",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "canRelease",
    inputs: [],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "releaseAt",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "secondsUntilRelease",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getBeneficiary",
    inputs: [{ type: "uint256", name: "index" }],
    outputs: [
      { type: "address", name: "addr" },
      { type: "uint16", name: "bps" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "estimateMUSD",
    inputs: [{ type: "uint256", name: "price" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "secondsUntilRelease",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "mezoBond",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "keeperRewardBps",
    inputs: [],
    outputs: [{ type: "uint16" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isBeneficiary",
    inputs: [{ type: "address", name: "who" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "beneficiaryBps",
    inputs: [{ type: "address", name: "who" }],
    outputs: [{ type: "uint16" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasRehearsed",
    inputs: [{ type: "address", name: "who" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "rehearsalAt",
    inputs: [{ type: "address", name: "" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "rehearseClaim",
    inputs: [],
    outputs: [{ type: "uint16" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "fundMezoBond",
    inputs: [{ type: "uint256", name: "amount" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "deposit",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "heartbeat",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "addBeneficiary",
    inputs: [
      { type: "address", name: "addr_" },
      { type: "uint16", name: "bps_" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "removeBeneficiary",
    inputs: [{ type: "uint256", name: "index" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "release",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "Deposited",
    inputs: [
      { type: "address", name: "owner", indexed: true },
      { type: "uint256", name: "amount" },
      { type: "uint256", name: "totalBalance" },
    ],
  },
  {
    type: "event",
    name: "Heartbeat",
    inputs: [
      { type: "address", name: "owner", indexed: true },
      { type: "uint256", name: "at" },
    ],
  },
  {
    type: "event",
    name: "BeneficiaryAdded",
    inputs: [
      { type: "address", name: "addr", indexed: true },
      { type: "uint16", name: "bps" },
      { type: "uint256", name: "index" },
    ],
  },
  {
    type: "event",
    name: "TroveOpened",
    inputs: [
      { type: "uint256", name: "collateral" },
      { type: "uint256", name: "debtBorrowed" },
      { type: "uint256", name: "musdReceived" },
    ],
  },
  {
    type: "event",
    name: "InheritanceMUSDDistributed",
    inputs: [
      { type: "address", name: "beneficiary", indexed: true },
      { type: "uint256", name: "amount" },
      { type: "uint16", name: "bps" },
    ],
  },
  {
    type: "event",
    name: "VaultReleased",
    inputs: [
      { type: "uint256", name: "totalMUSD" },
      { type: "uint256", name: "beneficiaryCount" },
      { type: "uint256", name: "releasedAt" },
    ],
  },
  {
    type: "event",
    name: "MezoBondFunded",
    inputs: [
      { type: "address", name: "owner", indexed: true },
      { type: "uint256", name: "amount" },
      { type: "uint256", name: "totalBond" },
    ],
  },
  {
    type: "event",
    name: "MezoKeeperRewardPaid",
    inputs: [
      { type: "address", name: "keeper", indexed: true },
      { type: "uint256", name: "amount" },
    ],
  },
  {
    type: "event",
    name: "MezoBeneficiaryRewardPaid",
    inputs: [
      { type: "address", name: "beneficiary", indexed: true },
      { type: "uint256", name: "amount" },
      { type: "uint16", name: "bps" },
    ],
  },
  {
    type: "event",
    name: "BeneficiaryRehearsed",
    inputs: [
      { type: "address", name: "beneficiary", indexed: true },
      { type: "uint256", name: "at" },
      { type: "uint16", name: "bps" },
    ],
  },
] as const;

export const PRICE_FEED_ABI = [
  {
    type: "function",
    name: "fetchPrice",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
  },
] as const;

export const BORROWER_OPS_ABI = [
  {
    type: "function",
    name: "minNetDebt",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MUSD_GAS_COMPENSATION",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MCR",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "borrowingRate",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const TROVE_MANAGER_ABI = [
  {
    type: "function",
    name: "getEntireDebtAndColl",
    inputs: [{ type: "address", name: "_borrower" }],
    outputs: [
      { type: "uint256", name: "coll" },
      { type: "uint256", name: "principal" },
      { type: "uint256", name: "interest" },
      { type: "uint256", name: "pendingCollateral" },
      { type: "uint256", name: "pendingPrincipal" },
      { type: "uint256", name: "pendingInterest" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTroveStatus",
    inputs: [{ type: "address", name: "_borrower" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;
