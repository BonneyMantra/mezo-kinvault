import "@rainbow-me/rainbowkit/styles.css";
import "./polyfills";
import React from "react";
import ReactDOM from "react-dom/client";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { Toaster } from "sonner";
import { App } from "./App";
import {
  isPassportConfigured,
  mezoPassportConfig,
  mezoTestnet,
} from "./lib/mezo";
import "./styles.css";

const queryClient = new QueryClient();

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);

root.render(
  <React.StrictMode>
    <WagmiProvider config={mezoPassportConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          initialChain={mezoTestnet}
          theme={darkTheme({
            accentColor: "#c47f45",
            accentColorForeground: "#08090b",
            borderRadius: "medium",
          })}
        >
          <App passportEnabled={isPassportConfigured} />
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#141820",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#e8e4db",
              },
            }}
          />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
);
