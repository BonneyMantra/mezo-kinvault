import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Wallet } from "lucide-react";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { formatEther } from "viem";
import { ERC20_ABI, MEZO_ADDRESSES } from "../lib/contracts";

const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const dicebear = (addr: string) =>
  `https://api.dicebear.com/9.x/shapes/svg?seed=${addr}`;

export function WalletEntry({ passportEnabled }: { passportEnabled: boolean }) {
  const { address } = useAccount();
  const { data: bal } = useBalance({
    address,
    query: { refetchInterval: 15000 },
  });
  const { data: musdRaw } = useReadContract({
    address: MEZO_ADDRESSES.musd as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 15000 },
  });

  const btcNum = bal ? Number(formatEther(bal.value)) : null;
  const btc =
    btcNum === null
      ? "…"
      : btcNum < 0.0001 && btcNum > 0
        ? btcNum.toFixed(6)
        : btcNum.toFixed(4);

  const musdVal = musdRaw as bigint | undefined;
  const musd =
    musdVal !== undefined
      ? Number(formatEther(musdVal)).toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })
      : null;

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
            {musd !== null && Number(musd) > 0 && (
              <span className="sidebarMusd">{musd} MUSD</span>
            )}
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
