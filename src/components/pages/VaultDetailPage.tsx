import { motion } from "motion/react";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Coins,
  Droplet,
  ExternalLink,
  HeartPulse,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useBalance,
  useReadContract,
  useReadContracts,
  useSimulateContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import { shortAddress } from "../../lib/proof";
import { KINVAULT_ABI, MEZO_ADDRESSES } from "../../lib/contracts";
import { useBtcPrice } from "../../hooks/useBtcPrice";
import { useMezoRiskParams } from "../../hooks/useKinVault";
import { type VaultMetaWithAddress } from "../../lib/vaultMeta";

const FAUCET_URL = "https://faucet.test.mezo.org/";
const GAS_FLOOR = parseEther("0.0001");
const ease = [0.22, 1, 0.36, 1] as const;

const fmtBtc = (wei: bigint | undefined) =>
  wei ? Number(formatEther(wei)).toFixed(6) : "0";
const fmtMusd = (wei: bigint | undefined) =>
  wei
    ? Number(formatEther(wei)).toLocaleString(undefined, {
        maximumFractionDigits: 2,
      })
    : "0";
const fmtUsd = (p: bigint | undefined) =>
  p
    ? `$${Number(formatEther(p)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : "$0";
const fmtTimer = (s: number) => {
  const safe = Math.max(0, s);
  return `${Math.floor(safe / 60)
    .toString()
    .padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`;
};
const fmt = (wei: bigint | undefined, digits = 2) => {
  if (wei === undefined) return "—";
  return Number(formatEther(wei)).toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
};

type Props = {
  vaultAddress: `0x${string}`;
  meta?: VaultMetaWithAddress;
  onBack: () => void;
};

export function VaultDetailPage({ vaultAddress, meta, onBack }: Props) {
  const { address } = useAccount();
  const { data: nativeBalance } = useBalance({
    address,
    query: { refetchInterval: 10000 },
  });
  const { price: btcPrice } = useBtcPrice();
  const risk = useMezoRiskParams();

  const balanceLoaded = nativeBalance !== undefined;
  const insufficientGas = balanceLoaded && nativeBalance.value < GAS_FLOOR;

  // Read vault state
  const vaultReads = useReadContracts({
    contracts: [
      { address: vaultAddress, abi: KINVAULT_ABI, functionName: "owner" },
      { address: vaultAddress, abi: KINVAULT_ABI, functionName: "released" },
      {
        address: vaultAddress,
        abi: KINVAULT_ABI,
        functionName: "lastHeartbeatAt",
      },
      {
        address: vaultAddress,
        abi: KINVAULT_ABI,
        functionName: "heartbeatInterval",
      },
      {
        address: vaultAddress,
        abi: KINVAULT_ABI,
        functionName: "vaultBalance",
      },
      { address: vaultAddress, abi: KINVAULT_ABI, functionName: "totalBps" },
      {
        address: vaultAddress,
        abi: KINVAULT_ABI,
        functionName: "beneficiaryCount",
      },
      { address: vaultAddress, abi: KINVAULT_ABI, functionName: "canRelease" },
      { address: vaultAddress, abi: KINVAULT_ABI, functionName: "releaseAt" },
    ],
    query: { refetchInterval: 5000 },
  });

  const d = vaultReads.data ?? [];
  const owner = d[0]?.result as `0x${string}` | undefined;
  const released = d[1]?.result as boolean | undefined;
  const heartbeatInterval = d[3]?.result as bigint | undefined;
  const vaultBalance = d[4]?.result as bigint | undefined;
  const totalBps = d[5]?.result as bigint | undefined;
  const beneficiaryCount = d[6]?.result ? Number(d[6].result) : 0;
  const canRelease = d[7]?.result as boolean | undefined;
  const releaseAt = d[8]?.result as bigint | undefined;

  const isOwner =
    address && owner && address.toLowerCase() === owner.toLowerCase();

  // Read beneficiaries
  const benContracts = Array.from({ length: beneficiaryCount }, (_, i) => ({
    address: vaultAddress,
    abi: KINVAULT_ABI,
    functionName: "getBeneficiary" as const,
    args: [BigInt(i)] as const,
  }));
  const benReads = useReadContracts({
    contracts: beneficiaryCount > 0 ? benContracts : [],
    query: { enabled: beneficiaryCount > 0, refetchInterval: 10000 },
  });
  const beneficiaries = (benReads.data ?? [])
    .map((r) => {
      const res = r.result as [string, number] | undefined;
      return res
        ? { addr: res[0] as `0x${string}`, bps: Number(res[1]) }
        : null;
    })
    .filter(Boolean) as { addr: `0x${string}`; bps: number }[];

  // Timer
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const releaseTimestamp = releaseAt ? Number(releaseAt) : 0;
  const secondsRemaining = useMemo(() => {
    if (!releaseTimestamp || released) return 0;
    return Math.max(0, releaseTimestamp - Math.floor(now / 1000));
  }, [releaseTimestamp, now, released]);

  const heartbeatSec = heartbeatInterval ? Number(heartbeatInterval) : 60;
  const progress = released
    ? 1
    : heartbeatSec > 0
      ? 1 - secondsRemaining / heartbeatSec
      : 0;

  const estimatedMusd = useMemo(() => {
    if (!vaultBalance || !btcPrice || vaultBalance === 0n) return 0n;
    const maxDebt = (vaultBalance * btcPrice) / (13n * 10n ** 17n);
    const gasComp = 200n * 10n ** 18n;
    if (maxDebt <= gasComp) return 0n;
    const rate = 10n ** 15n;
    return ((maxDebt - gasComp) * 10n ** 18n) / (10n ** 18n + rate);
  }, [vaultBalance, btcPrice]);

  const hasDeposit = vaultBalance !== undefined && vaultBalance > 0n;
  const scenario: "active" | "ready" | "released" = released
    ? "released"
    : secondsRemaining === 0 && hasDeposit
      ? "ready"
      : "active";

  // Simulate
  const heartbeatSim = useSimulateContract({
    address: vaultAddress,
    abi: KINVAULT_ABI,
    functionName: "heartbeat",
    query: { enabled: !insufficientGas && !!isOwner && !released },
  });
  const releaseSim = useSimulateContract({
    address: vaultAddress,
    abi: KINVAULT_ABI,
    functionName: "release",
    query: { enabled: !insufficientGas && !!address },
  });

  // Write
  const [depositAmount, setDepositAmount] = useState("");
  const [newBenAddress, setNewBenAddress] = useState("");
  const [newBenPct, setNewBenPct] = useState("");
  const [txStatus, setTxStatus] = useState("");

  const { writeContract, data: txHash } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (txConfirmed) {
      setTxStatus("Confirmed");
      vaultReads.refetch();
      benReads.refetch();
      heartbeatSim.refetch();
      releaseSim.refetch();
      setTimeout(() => setTxStatus(""), 3000);
    }
  }, [txConfirmed]);

  const doDeposit = () => {
    if (!depositAmount) return;
    setTxStatus("Depositing BTC...");
    writeContract({
      address: vaultAddress,
      abi: KINVAULT_ABI,
      functionName: "deposit",
      value: parseEther(depositAmount),
    });
  };
  const doHeartbeat = () => {
    if (!heartbeatSim.data?.request) return;
    setTxStatus("Recording check-in...");
    writeContract(heartbeatSim.data.request);
  };
  const doAddBeneficiary = () => {
    if (!newBenAddress || !newBenPct) return;
    const bps = Math.round(parseFloat(newBenPct) * 100);
    setTxStatus("Adding beneficiary...");
    writeContract({
      address: vaultAddress,
      abi: KINVAULT_ABI,
      functionName: "addBeneficiary",
      args: [newBenAddress as `0x${string}`, bps],
    });
    setNewBenAddress("");
    setNewBenPct("");
  };
  const doRemoveBen = (index: number) => {
    setTxStatus("Removing...");
    writeContract({
      address: vaultAddress,
      abi: KINVAULT_ABI,
      functionName: "removeBeneficiary",
      args: [BigInt(index)],
    });
  };
  const doRelease = () => {
    if (!releaseSim.data?.request) return;
    setTxStatus("Releasing — opening MUSD trove...");
    writeContract(releaseSim.data.request);
  };

  return (
    <div className="pageContainer">
      <div className="pageHeader">
        <button className="actionBtn" type="button" onClick={onBack}>
          <ArrowLeft size={15} />
        </button>
        <h1>{meta?.name || "Vault"}</h1>
        <span className={`statusBadge ${scenario}`}>
          {scenario === "active"
            ? "Active"
            : scenario === "ready"
              ? "Release available"
              : "Released"}
        </span>
      </div>

      {meta?.coverImage && (
        <div
          className="vaultDetailCover"
          style={{ backgroundImage: `url(${meta.coverImage})` }}
        />
      )}

      {insufficientGas && (
        <div className="faucetBanner">
          <Droplet size={16} />
          <span>You need testnet BTC for gas.</span>
          <a
            className="faucetBtn"
            href={FAUCET_URL}
            target="_blank"
            rel="noreferrer"
          >
            Get testnet BTC
          </a>
        </div>
      )}

      <div className="vaultDetailGrid">
        {/* Left: Vault stats + deposit */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          <h3 className="cardTitle">Vault Status</h3>
          <dl className="statGrid">
            <div>
              <dt>BTC Locked</dt>
              <dd className="statHighlight">{fmtBtc(vaultBalance)} BTC</dd>
            </div>
            <div>
              <dt>BTC Price</dt>
              <dd>{fmtUsd(btcPrice)}</dd>
            </div>
            <div>
              <dt>Est. MUSD</dt>
              <dd>{fmtMusd(estimatedMusd)}</dd>
            </div>
            <div>
              <dt>Splits</dt>
              <dd>{totalBps?.toString() ?? "0"} / 10000</dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd>{owner ? shortAddress(owner) : "—"}</dd>
            </div>
            <div>
              <dt>Contract</dt>
              <dd>
                <a
                  href={`https://explorer.test.mezo.org/address/${vaultAddress}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {shortAddress(vaultAddress)} <ExternalLink size={11} />
                </a>
              </dd>
            </div>
          </dl>

          {/* Borrow preview */}
          <div className="riskPreview" style={{ marginTop: 16 }}>
            <div className="riskHeader">
              <ShieldCheck size={14} />
              <span>Mezo borrow preview</span>
            </div>
            <dl className="statGrid">
              <div>
                <dt>Min net debt</dt>
                <dd>{fmt(risk.minNetDebt)} MUSD</dd>
              </div>
              <div>
                <dt>Borrow rate</dt>
                <dd>
                  {risk.borrowingRate !== undefined
                    ? `${(Number(risk.borrowingRate) / 1e16).toFixed(2)}%`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Min collateral</dt>
                <dd>
                  {risk.mcr !== undefined
                    ? `${(Number(risk.mcr) / 1e16).toFixed(0)}%`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Gas comp</dt>
                <dd>{fmt(risk.gasCompensation)} MUSD</dd>
              </div>
            </dl>
          </div>

          {isOwner && !released && (
            <div className="ownerControls" style={{ marginTop: 16 }}>
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
                <button
                  className="actionBtn"
                  type="button"
                  onClick={doDeposit}
                  disabled={insufficientGas}
                >
                  <Wallet size={15} /> Deposit BTC
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Center: Cockpit */}
        <motion.div
          className={`card cockpitCard ${scenario}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease }}
        >
          <div className="stateHeader">
            <span>
              {scenario === "active"
                ? "Check-in active"
                : scenario === "ready"
                  ? "Check-in missed"
                  : "Vault released"}
            </span>
            <strong>
              {scenario === "active"
                ? "Release blocked"
                : scenario === "ready"
                  ? "Release available"
                  : "MUSD distributed"}
            </strong>
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
                {scenario === "released" ? "done" : fmtTimer(secondsRemaining)}
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
            {isOwner && !released && (
              <button
                className="actionBtn"
                type="button"
                onClick={doHeartbeat}
                disabled={insufficientGas || !heartbeatSim.isSuccess}
              >
                <RotateCcw size={15} /> Check-in
              </button>
            )}
            <button
              className="actionBtn release"
              type="button"
              disabled={
                scenario !== "ready" || insufficientGas || !releaseSim.isSuccess
              }
              onClick={doRelease}
            >
              <Activity size={15} /> Release MUSD
            </button>
          </div>

          {txStatus && <div className="txStatus">{txStatus}</div>}
        </motion.div>

        {/* Right: Beneficiaries */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16, ease }}
        >
          <h3 className="cardTitle">
            <Users size={15} /> Beneficiaries
            <span className="benCountBadge">{beneficiaryCount}</span>
          </h3>

          {beneficiaries.length > 0 ? (
            <ol className="explorerBenList">
              {beneficiaries.map((b, i) => (
                <li key={b.addr}>
                  <span className="benAddr">{shortAddress(b.addr)}</span>
                  <span className="benPct">{(b.bps / 100).toFixed(1)}%</span>
                  {isOwner && !released && (
                    <button
                      className="benRemoveBtn"
                      type="button"
                      onClick={() => doRemoveBen(i)}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <div className="emptyBenPrompt">
              <Users size={20} />
              <strong>No beneficiaries yet</strong>
              <p>Add wallet addresses below.</p>
            </div>
          )}

          {isOwner && !released && (
            <div className="addBenForm" style={{ marginTop: 12 }}>
              <input
                type="text"
                placeholder="0x address"
                value={newBenAddress}
                onChange={(e) => setNewBenAddress(e.target.value)}
              />
              <div className="pctInputWrap" style={{ width: 72 }}>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="%"
                  value={newBenPct}
                  onChange={(e) =>
                    setNewBenPct(e.target.value.replace(/[^0-9.]/g, ""))
                  }
                  className="benPctInput"
                />
                <span className="pctSuffix">%</span>
              </div>
              <button
                className="actionBtn"
                type="button"
                onClick={doAddBeneficiary}
                disabled={insufficientGas}
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
