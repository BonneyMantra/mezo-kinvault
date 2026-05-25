import {
  getConfig,
  mezoTestnet,
  okxWalletMezoTestnet,
  unisatWalletMezoTestnet,
  xverseWalletMezoTestnet,
} from "@mezo-org/passport";

const projectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ??
  "07386577a7711651c83f5ef08c19e7e8";

export const isPassportConfigured = true;

export const mezoPassportConfig = getConfig({
  appName: "KinVault",
  appDescription:
    "Heartbeat-based beneficiary release for Bitcoin-backed MUSD on Mezo.",
  appUrl: "https://mezo-kinvault.vercel.app",
  mezoNetwork: "testnet",
  walletConnectProjectId: projectId,
  wallets: [
    {
      groupName: "Bitcoin",
      wallets: [
        okxWalletMezoTestnet,
        unisatWalletMezoTestnet,
        xverseWalletMezoTestnet,
      ],
    },
  ],
});

export { mezoTestnet };

export const mezoLinks = {
  docs: "https://mezo.org/docs/developers/getting-started/",
  faucet: "https://faucet.test.mezo.org/",
  explorer: "https://explorer.test.mezo.org/",
  hackathon: "https://mezo.org/blog/the-mezo-hackathon-is-back/",
};
