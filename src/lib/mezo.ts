import { getConfig, mezoTestnet } from "@mezo-org/passport";
import { createConfig, http } from "wagmi";

const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
const placeholderProjectId = "00000000000000000000000000000000";
const configuredProjectId =
  walletConnectProjectId && walletConnectProjectId !== placeholderProjectId
    ? walletConnectProjectId
    : null;

export const isPassportConfigured = Boolean(configuredProjectId);

export const mezoPassportConfig = configuredProjectId
  ? getConfig({
      appName: "KinVault",
      appDescription:
        "Heartbeat-based beneficiary release for Bitcoin-backed MUSD on Mezo.",
      mezoNetwork: "testnet",
      walletConnectProjectId: configuredProjectId,
    })
  : createConfig({
      chains: [mezoTestnet],
      transports: {
        [mezoTestnet.id]: http("https://rpc.test.mezo.org"),
      },
    });

export { mezoTestnet };

export const mezoLinks = {
  docs: "https://mezo.org/docs/developers/getting-started/",
  faucet: "https://faucet.test.mezo.org/",
  explorer: "https://explorer.test.mezo.org/",
  hackathon: "https://mezo.org/blog/the-mezo-hackathon-is-back/",
};
