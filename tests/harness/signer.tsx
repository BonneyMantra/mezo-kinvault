// TEST-ONLY signing harness. Injects a real EIP-1193 provider backed by a
// testnet private key so Playwright can drive the REAL <Dashboard> write
// buttons (deposit/heartbeat/rehearse/release) end-to-end: button -> wagmi
// useWriteContract -> eth_sendTransaction -> signed tx -> live Mezo RPC ->
// confirmed. This is the exact production write code path; only the wallet
// EXTENSION UI (Unisat/OKX/Xverse) is replaced by a programmatic signer.
// NOT shipped: harness-signer.html is excluded from `vite build`.
import "../../src/polyfills";
import { useEffect } from "react";
import ReactDOM from "react-dom/client";
import {
  createWalletClient,
  createPublicClient,
  custom,
  defineChain,
  http,
  type EIP1193RequestFn,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  createConfig,
  http as wagmiHttp,
  WagmiProvider,
  useAccount,
  useConnect,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Dashboard } from "../../src/components/Dashboard";
import "../../src/styles.css";

const RPC = "https://rpc.test.mezo.org";
const mezoTestnet = defineChain({
  id: 31611,
  name: "Mezo Testnet",
  nativeCurrency: { name: "Bitcoin", symbol: "BTC", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});

const role = new URLSearchParams(location.search).get("role") ?? "owner";
const KEY = (
  role === "beneficiary"
    ? import.meta.env.VITE_TEST_BENE_KEY
    : import.meta.env.VITE_TEST_SIGNER_KEY
) as `0x${string}`;

const account = privateKeyToAccount(KEY);
const wallet = createWalletClient({
  account,
  chain: mezoTestnet,
  transport: http(RPC),
});
const pub = createPublicClient({ chain: mezoTestnet, transport: http(RPC) });

// Minimal signing EIP-1193 provider.
const request: EIP1193RequestFn = async ({ method, params }: any) => {
  switch (method) {
    case "eth_requestAccounts":
    case "eth_accounts":
      return [account.address];
    case "eth_chainId":
      return "0x7b7b";
    case "wallet_switchEthereumChain":
      return null;
    case "eth_sendTransaction": {
      const tx = params[0];
      return wallet.sendTransaction({
        to: tx.to,
        data: tx.data,
        value: tx.value ? BigInt(tx.value) : undefined,
        gas: tx.gas ? BigInt(tx.gas) : undefined,
      });
    }
    case "personal_sign":
      return wallet.signMessage({ message: { raw: params[0] } });
    default:
      return pub.request({ method, params } as any);
  }
};
(window as any).ethereum = {
  isMetaMask: true,
  request,
  on: () => {},
  removeListener: () => {},
};

const config = createConfig({
  chains: [mezoTestnet],
  connectors: [injected()],
  transports: { [mezoTestnet.id]: wagmiHttp(RPC) },
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
      <AutoConnect>
        <Dashboard passportEnabled={false} />
      </AutoConnect>
    </QueryClientProvider>
  </WagmiProvider>,
);
