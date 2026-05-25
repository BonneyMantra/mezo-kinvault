import { motion } from "motion/react";
import {
  Activity,
  ArrowLeft,
  HeartPulse,
  Plus,
  RotateCcw,
  Trash2,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useDisconnect,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import { shortAddress } from "../lib/proof";
import { KINVAULT_ABI, MEZO_ADDRESSES } from "../lib/contracts";
import { useKinVaultState, useBeneficiaries } from "../hooks/useKinVault";
import { useBtcPrice } from "../hooks/useBtcPrice";
import { WalletEntry } from "./WalletEntry";

const ease = [0.22, 1, 0.36, 1] as const;

const formatTimer = (seconds: number) => {
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60)
    .toString()
    .padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`;
};

const formatBtc = (wei: bigint | undefined) => {
  if (!wei) return "0";
  return Number(formatEther(wei)).toFixed(6);
};

const formatMusd = (wei: bigint | undefined) => {
  if (!wei) return "0";
  return Number(formatEther(wei)).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
};

const formatUsd = (price: bigint | undefined) => {
  if (!price) return "$0";
  return `$${Number(formatEther(price)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

export function Dashboard({ passportEnabled }: { passportEnabled: boolean }) {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const vault = useKinVaultState();
  const { price: btcPrice } = useBtcPrice();
  const benCount = vault.beneficiaryCount ? Number(vault.beneficiaryCount) : 0;
  const { beneficiaries, refetch: refetchBens } = useBeneficiaries(benCount);

  const [now, setNow] = useState(() => Date.now());
  const [depositAmount, setDepositAmount] = useState("");
  const [newBenAddress, setNewBenAddress] = useState("");
  const [newBenBps, setNewBenBps] = useState("");
  const [txStatus, setTxStatus] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const isOwner =
    address &&
    vault.owner &&
    address.toLowerCase() === vault.owner.toLowerCase();
  const isBeneficiary =
    address &&
    beneficiaries.some((b) => b.addr.toLowerCase() === address!.toLowerCase());
  const myBeneficiary = beneficiaries.find(
    (b) => address && b.addr.toLowerCase() === address.toLowerCase(),
  );

  const releaseTimestamp = vault.releaseAt ? Number(vault.releaseAt) : 0;
  const secondsRemaining = useMemo(() => {
    if (!releaseTimestamp || vault.released) return 0;
    return Math.max(0, releaseTimestamp - Math.floor(now / 1000));
  }, [releaseTimestamp, now, vault.released]);

  const heartbeatSec = vault.heartbeatInterval
    ? Number(vault.heartbeatInterval)
    : 60;
  const progress = vault.released
    ? 1
    : heartbeatSec > 0
      ? 1 - secondsRemaining / heartbeatSec
      : 0;

  const estimatedMusd = useMemo(() => {
    if (!vault.vaultBalance || !btcPrice || vault.vaultBalance === 0n)
      return 0n;
    const maxDebt = (vault.vaultBalance * btcPrice) / (13n * 10n ** 17n);
    const gasComp = 200n * 10n ** 18n;
    if (maxDebt <= gasComp) return 0n;
    const rate = 10n ** 15n;
    return ((maxDebt - gasComp) * 10n ** 18n) / (10n ** 18n + rate);
  }, [vault.vaultBalance, btcPrice]);

  const scenario: "active" | "ready" | "released" = vault.released
    ? "released"
    : secondsRemaining === 0 && vault.vaultBalance && vault.vaultBalance > 0n
      ? "ready"
      : "active";

  const { writeContract, data: txHash } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (txConfirmed) {
      setTxStatus("Confirmed");
      vault.refetch();
      refetchBens();
      setTimeout(() => setTxStatus(""), 3000);
    }
  }, [txConfirmed]);

  const doDeposit = () => {
    if (!depositAmount) return;
    setTxStatus("Depositing...");
    writeContract({
      address: MEZO_ADDRESSES.kinVault,
      abi: KINVAULT_ABI,
      functionName: "deposit",
      value: parseEther(depositAmount),
    });
  };

  const doHeartbeat = () => {
    setTxStatus("Recording heartbeat...");
    writeContract({
      address: MEZO_ADDRESSES.kinVault,
      abi: KINVAULT_ABI,
      functionName: "heartbeat",
    });
  };

  const doAddBeneficiary = () => {
    if (!newBenAddress || !newBenBps) return;
    setTxStatus("Adding beneficiary...");
    writeContract({
      address: MEZO_ADDRESSES.kinVault,
      abi: KINVAULT_ABI,
      functionName: "addBeneficiary",
      args: [newBenAddress as `0x${string}`, Number(newBenBps)],
    });
    setNewBenAddress("");
    setNewBenBps("");
  };

  const doRemoveBeneficiary = (index: number) => {
    setTxStatus("Removing...");
    writeContract({
      address: MEZO_ADDRESSES.kinVault,
      abi: KINVAULT_ABI,
      functionName: "removeBeneficiary",
      args: [BigInt(index)],
    });
  };

  const doRelease = () => {
    setTxStatus("Releasing vault — opening MUSD trove...");
    writeContract({
      address: MEZO_ADDRESSES.kinVault,
      abi: KINVAULT_ABI,
      functionName: "release",
    });
  };

  const statusCopy = {
    active: { eyebrow: "Heartbeat active", title: "Release blocked" },
    ready: { eyebrow: "Heartbeat missed", title: "Release available" },
    released: { eyebrow: "Vault released", title: "MUSD distributed" },
  };
  const copy = statusCopy[scenario];

  return (
    <div className="dashboard">
      <header className="dashHeader">
        <button className="backBtn" type="button" onClick={() => disconnect()}>
          <ArrowLeft size={16} />
          <img
            className="brandLogo"
            src="/logo.png"
            alt="KinVault"
            width={22}
            height={22}
          />
          <strong>KinVault</strong>
        </button>
        <div className="dashRole">
          {isOwner && <span className="roleBadge owner">Owner</span>}
          {isBeneficiary && (
            <span className="roleBadge beneficiary">Beneficiary</span>
          )}
          {!isOwner && !isBeneficiary && (
            <span className="roleBadge">Spectator</span>
          )}
        </div>
        <div className="walletSlot">
          <WalletEntry passportEnabled={passportEnabled} />
        </div>
      </header>

      <div className="dashGrid">
        <motion.div
          className="dashPanel vaultPanel"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          <h2 className="panelTitle">Vault Status</h2>
          <dl className="vaultStats">
            <div>
              <dt>BTC Locked</dt>
              <dd>{formatBtc(vault.vaultBalance)} BTC</dd>
            </div>
            <div>
              <dt>BTC Price</dt>
              <dd>{formatUsd(btcPrice)}</dd>
            </div>
            <div>
              <dt>Est. MUSD</dt>
              <dd>{formatMusd(estimatedMusd)}</dd>
            </div>
            <div>
              <dt>Splits</dt>
              <dd>{vault.totalBps?.toString() ?? "0"} / 10000</dd>
            </div>
          </dl>

          {isOwner && !vault.released && (
            <div className="ownerControls">
              <div className="depositRow">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="BTC amount"
                  value={depositAmount}
                  onChange={(e) =>
                    setDepositAmount(e.target.value.replace(/[^0-9.]/g, ""))
                  }
                />
                <button className="actionBtn" type="button" onClick={doDeposit}>
                  <Wallet size={15} /> Deposit
                </button>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          className={`dashPanel cockpitPanel ${scenario}`}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.65, delay: 0.08, ease }}
        >
          <div className="stateHeader">
            <span>{copy.eyebrow}</span>
            <strong>{copy.title}</strong>
          </div>

          <div className="timerModule">
            <svg className="timerRing" viewBox="0 0 200 200">
              <circle className="ringTrack" cx="100" cy="100" r="78" />
              <circle
                className="ringProgress"
                cx="100"
                cy="100"
                r="78"
                pathLength="1"
                style={{ strokeDashoffset: 1 - progress }}
              />
            </svg>
            <div className="timerCore">
              <HeartPulse size={24} />
              <strong>
                {scenario === "released"
                  ? "done"
                  : formatTimer(secondsRemaining)}
              </strong>
              <span>
                {scenario === "active"
                  ? "until release"
                  : scenario === "ready"
                    ? "ready"
                    : "released"}
              </span>
            </div>
          </div>

          <div className="controlRail">
            {isOwner && !vault.released && (
              <button className="actionBtn" type="button" onClick={doHeartbeat}>
                <RotateCcw size={15} /> Heartbeat
              </button>
            )}
            <button
              className="actionBtn release"
              type="button"
              disabled={scenario !== "ready" || !vault.canRelease}
              onClick={doRelease}
            >
              <Activity size={15} /> Release MUSD
            </button>
          </div>

          {txStatus && <div className="txStatus">{txStatus}</div>}
        </motion.div>

        <motion.div
          className="dashPanel beneficiaryPanel"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.14, ease }}
        >
          <h2 className="panelTitle">
            Beneficiaries <span className="benCountBadge">{benCount}</span>
          </h2>

          {beneficiaries.length > 0 ? (
            <ol className="beneficiaryList">
              {beneficiaries.map((b, i) => (
                <li key={b.addr}>
                  <span className="benAddress">{shortAddress(b.addr)}</span>
                  <span className="benBps">{(b.bps / 100).toFixed(1)}%</span>
                  {isOwner && !vault.released && (
                    <button
                      className="benRemove"
                      type="button"
                      onClick={() => doRemoveBeneficiary(i)}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="emptyNote">No beneficiaries added yet.</p>
          )}

          {isBeneficiary && myBeneficiary && (
            <div className="myAllocation">
              <strong>Your allocation</strong>
              <span className="allocPct">
                {(myBeneficiary.bps / 100).toFixed(1)}%
              </span>
              {estimatedMusd > 0n && (
                <span className="allocMusd">
                  ~
                  {formatMusd(
                    (estimatedMusd * BigInt(myBeneficiary.bps)) / 10000n,
                  )}{" "}
                  MUSD
                </span>
              )}
            </div>
          )}

          {isOwner && !vault.released && (
            <div className="addBenForm">
              <input
                type="text"
                placeholder="0x address"
                value={newBenAddress}
                onChange={(e) => setNewBenAddress(e.target.value)}
              />
              <input
                type="text"
                inputMode="numeric"
                placeholder="BPS"
                value={newBenBps}
                onChange={(e) =>
                  setNewBenBps(e.target.value.replace(/[^0-9]/g, ""))
                }
              />
              <button
                className="actionBtn"
                type="button"
                onClick={doAddBeneficiary}
              >
                <Plus size={15} />
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
