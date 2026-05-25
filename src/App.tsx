import { useAccount } from "wagmi";
import { Landing } from "./components/Landing";
import { Dashboard } from "./components/Dashboard";

type AppProps = { passportEnabled: boolean };

export function App({ passportEnabled }: AppProps) {
  const { isConnected } = useAccount();

  return isConnected ? (
    <Dashboard passportEnabled={passportEnabled} />
  ) : (
    <Landing />
  );
}
