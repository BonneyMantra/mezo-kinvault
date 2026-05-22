import { ConnectButton } from "@rainbow-me/rainbowkit";
import { BadgeCheck, WalletCards } from "lucide-react";

type WalletEntryProps = {
  passportEnabled: boolean;
};

export function WalletEntry({ passportEnabled }: WalletEntryProps) {
  if (!passportEnabled) {
    return (
      <button
        className="iconTextButton secondary"
        type="button"
        disabled
        title="Set VITE_WALLETCONNECT_PROJECT_ID to enable Mezo Passport."
      >
        <WalletCards size={17} />
        Passport config needed
      </button>
    );
  }

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        if (!connected) {
          return (
            <button
              className="iconTextButton"
              type="button"
              onClick={openConnectModal}
            >
              <WalletCards size={17} />
              Connect Passport
            </button>
          );
        }

        return (
          <div className="walletConnected">
            <button
              className="iconOnlyButton"
              type="button"
              onClick={openChainModal}
              aria-label="Change network"
            >
              <BadgeCheck size={17} />
            </button>
            <button
              className="iconTextButton secondary"
              type="button"
              onClick={openAccountModal}
            >
              {account.displayName}
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
