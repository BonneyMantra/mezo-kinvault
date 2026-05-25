// TEST-ONLY harness. Renders the real <Dashboard> with a wagmi `mock`
// connector so Playwright can screenshot the owner/beneficiary/spectator
// views. All contract data is REAL on-chain reads over the live Mezo RPC —
// only the connected-wallet identity is simulated. NOT part of the shipped
// app build (vite build uses index.html, never harness.html).
import "@rainbow-me/rainbowkit/styles.css";
import "../../src/polyfills";
import { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { defineChain } from "viem";
import {
  createConfig,
  http,
  WagmiProvider,
  useAccount,
  useConnect,
} from "wagmi";
import { mock } from "wagmi/connectors";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Dashboard } from "../../src/components/Dashboard";
import "../../src/styles.css";

const mezoTestnet = defineChain({
  id: 31611,
  name: "Mezo Testnet",
  nativeCurrency: { name: "Bitcoin", symbol: "BTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.test.mezo.org"] } },
});

const ROLES: Record<string, `0x${string}`> = {
  owner: "0x6B9ad963c764a06A7ef8ff96D38D0cB86575eC00",
  beneficiary: "0x86CA136dc8B2Ac6B10143Ed23AC361FCBbd6bFCa",
  spectator: "0x1111111111111111111111111111111111111111",
};

const role = new URLSearchParams(location.search).get("role") ?? "owner";
const account = ROLES[role] ?? ROLES.owner;

const config = createConfig({
  chains: [mezoTestnet],
  connectors: [mock({ accounts: [account], features: { reconnect: true } })],
  transports: { [mezoTestnet.id]: http("https://rpc.test.mezo.org") },
});

const queryClient = new QueryClient();

function AutoConnect({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  useEffect(() => {
    if (!isConnected) connect({ connector: connectors[0] });
  }, [isConnected, connect, connectors]);
  return isConnected ? (
    <>{children}</>
  ) : (
    <div style={{ padding: 40 }}>connecting…</div>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider initialChain={mezoTestnet}>
        <AutoConnect>
          <Dashboard passportEnabled={true} />
        </AutoConnect>
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>,
);
