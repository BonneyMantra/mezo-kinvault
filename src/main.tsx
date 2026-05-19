import "@rainbow-me/rainbowkit/styles.css";
import "./polyfills";
import React from "react";
import ReactDOM from "react-dom/client";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { App } from "./App";
import { isPassportConfigured, mezoPassportConfig, mezoTestnet } from "./lib/mezo";
import "./styles.css";

const queryClient = new QueryClient();
const app = <App passportEnabled={isPassportConfigured} />;
const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

root.render(
  <React.StrictMode>
    {mezoPassportConfig ? (
      <WagmiProvider config={mezoPassportConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider initialChain={mezoTestnet}>
            {app}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    ) : (
      app
    )}
  </React.StrictMode>,
);
