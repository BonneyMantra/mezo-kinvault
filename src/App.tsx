import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Landing } from "./components/Landing";
import { AppShell } from "./components/AppShell";

type AppProps = { passportEnabled: boolean };

export function App({ passportEnabled }: AppProps) {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [connectTimeout, setConnectTimeout] = useState(false);

  useEffect(() => {
    if (!isConnecting && !isReconnecting) {
      setConnectTimeout(false);
      return;
    }
    const timer = setTimeout(() => setConnectTimeout(true), 4000);
    return () => clearTimeout(timer);
  }, [isConnecting, isReconnecting]);

  const showConnecting = (isConnecting || isReconnecting) && !connectTimeout;

  function handleConnect() {
    setConnectTimeout(false);
    openConnectModal?.();
  }

  return (
    <AnimatePresence mode="wait">
      {isConnected && address ? (
        <motion.div
          key="app"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <AppShell passportEnabled={passportEnabled} />
        </motion.div>
      ) : (
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Landing onConnect={handleConnect} connecting={showConnecting} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
