import { useAccount } from "wagmi";
import { Landing } from "./components/Landing";
import { AppShell } from "./components/AppShell";

type AppProps = { passportEnabled: boolean };

export function App({ passportEnabled }: AppProps) {
  const { isConnected } = useAccount();

  return isConnected ? (
    <AppShell passportEnabled={passportEnabled} />
  ) : (
    <Landing />
  );
}
