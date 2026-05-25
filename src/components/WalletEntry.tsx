import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Wallet } from "lucide-react";
import { useAccount, useBalance } from "wagmi";
import { formatEther } from "viem";

const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const dicebear = (addr: string) =>
  `https://api.dicebear.com/9.x/shapes/svg?seed=${addr}`;

export function WalletEntry({ passportEnabled }: { passportEnabled: boolean }) {
  const { address } = useAccount();
  const { data: bal } = useBalance({
    address,
    query: { refetchInterval: 15000 },
  });

  const btc = bal ? Number(formatEther(bal.value)).toFixed(4) : "…";

  if (!passportEnabled) {
    return (
      <button className="walletBtn" type="button" disabled>
        <Wallet size={15} />
        Config needed
      </button>
    );
  }

  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;

        if (!connected) {
          return (
            <button
              className="walletBtn"
              type="button"
              onClick={openConnectModal}
            >
              <Wallet size={15} />
              Connect
            </button>
          );
        }

        return (
          <button
            className="sidebarAccount"
            type="button"
            onClick={openAccountModal}
          >
            <span className="sidebarBal">{btc} BTC</span>
            <span className="sidebarAddr">
              <img
                className="walletAvatar"
                src={dicebear(account.address)}
                alt=""
                width={18}
                height={18}
              />
              {shortAddr(account.address)}
            </span>
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
