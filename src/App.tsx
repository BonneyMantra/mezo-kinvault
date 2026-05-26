import { useAccount } from "wagmi";
import { Landing } from "./components/Landing";
import { AppShell } from "./components/AppShell";

type AppProps = { passportEnabled: boolean };

export function App({ passportEnabled }: AppProps) {
  const { isConnected, status } = useAccount();

  if (status === "reconnecting" || status === "connecting") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          background: "#08090b",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: "3px solid rgba(196, 127, 69, 0.2)",
            borderTopColor: "#c47f45",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p
          style={{
            color: "rgba(255, 255, 255, 0.5)",
            fontSize: 14,
            fontFamily: "system-ui, sans-serif",
            margin: 0,
          }}
        >
          Initializing Mezo Passport…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return isConnected ? (
    <AppShell passportEnabled={passportEnabled} />
  ) : (
    <Landing />
  );
}
