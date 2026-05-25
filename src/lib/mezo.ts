import { getConfig, mezoTestnet } from "@mezo-org/passport";

const walletConnectProjectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ??
  "00000000000000000000000000000000";

export const isPassportConfigured = true;

export const mezoPassportConfig = getConfig({
  appName: "KinVault",
  appDescription:
    "Heartbeat-based beneficiary release for Bitcoin-backed MUSD on Mezo.",
  mezoNetwork: "testnet",
  walletConnectProjectId,
});

export { mezoTestnet };

export const mezoLinks = {
  docs: "https://mezo.org/docs/developers/getting-started/",
  faucet: "https://faucet.test.mezo.org/",
  explorer: "https://explorer.test.mezo.org/",
  hackathon: "https://mezo.org/blog/the-mezo-hackathon-is-back/",
};
