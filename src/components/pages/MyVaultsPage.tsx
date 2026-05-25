import { motion } from "motion/react";
import {
  Activity,
  CheckCircle2,
  Coins,
  Droplet,
  HeartPulse,
  LockKeyhole,
  Plus,
  PlusCircle,
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
  useSimulateContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import { shortAddress } from "../../lib/proof";
import { KINVAULT_ABI, MEZO_ADDRESSES } from "../../lib/contracts";
import {
  useKinVaultState,
  useBeneficiaries,
  useMezoRiskParams,
} from "../../hooks/useKinVault";
import { useBtcPrice } from "../../hooks/useBtcPrice";
import { CollateralHealth } from "../dashboard/CollateralHealth";
import { BeneficiaryCards } from "../dashboard/BeneficiaryCards";

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

export function MyVaultsPage({
  passportEnabled,
}: {
  passportEnabled: boolean;
}) {
  const { address } = useAccount();
  const { data: nativeBalance } = useBalance({
    address,
    query: { refetchInterval: 10000 },
  });
  const vault = useKinVaultState();
  const { price: btcPrice } = useBtcPrice();
  const risk = useMezoRiskParams();
  const benCount = vault.beneficiaryCount ? Number(vault.beneficiaryCount) : 0;
  const { beneficiaries, refetch: refetchBens } = useBeneficiaries(benCount);

  const [now, setNow] = useState(() => Date.now());
  const [depositAmount, setDepositAmount] = useState("");
  const [newBenAddress, setNewBenAddress] = useState("");
  const [newBenBps, setNewBenBps] = useState("");
  const [txStatus, setTxStatus] = useState("");

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const isOwner =
    address &&
    vault.owner &&
    address.toLowerCase() === vault.owner.toLowerCase();
  const balanceLoaded = nativeBalance !== undefined;
  const insufficientGas = balanceLoaded && nativeBalance.value < GAS_FLOOR;

  const heartbeatSim = useSimulateContract({
    address: MEZO_ADDRESSES.kinVault,
    abi: KINVAULT_ABI,
    functionName: "heartbeat",
    query: { enabled: !insufficientGas && !!address && !!isOwner },
  });
  const releaseSim = useSimulateContract({
    address: MEZO_ADDRESSES.kinVault,
    abi: KINVAULT_ABI,
    functionName: "release",
    query: { enabled: !insufficientGas && !!address },
  });

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

  const hasDeposit =
    vault.vaultBalance !== undefined && vault.vaultBalance > 0n;
  const hasBeneficiaries = benCount > 0;
  const scenario: "active" | "ready" | "released" = vault.released
    ? "released"
    : secondsRemaining === 0 && hasDeposit
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
      heartbeatSim.refetch();
      releaseSim.refetch();
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
    if (!heartbeatSim.data?.request) return;
    setTxStatus("Recording check-in...");
    writeContract(heartbeatSim.data.request);
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
    if (!releaseSim.data?.request) return;
    setTxStatus("Releasing — opening MUSD trove...");
    writeContract(releaseSim.data.request);
  };

  if (!isOwner) {
    return (
      <div className="pageContainer">
        <div className="pageHeader">
          <LockKeyhole size={20} />
          <h1>My Vaults</h1>
        </div>
        <motion.div
          className="emptyPage"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          <div className="emptyIcon">
            <PlusCircle size={40} />
          </div>
          <h2>No vaults yet</h2>
          <p>
            You haven&rsquo;t created a vault. Deploy a KinVault contract to get
            started.
          </p>
          <p className="emptyHint">
            Vault creation requires deploying a smart contract. On testnet, use
            the CLI:
          </p>
          <code className="emptyCode">
            forge script script/DeployMezo.s.sol --rpc-url
            https://rpc.test.mezo.org --broadcast --legacy
          </code>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pageContainer">
      <div className="pageHeader">
        <LockKeyhole size={20} />
        <h1>My Vault</h1>
        <span className={`statusBadge ${scenario}`}>
          {scenario === "active"
            ? "Active"
            : scenario === "ready"
              ? "Release available"
              : "Released"}
        </span>
      </div>

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

      <div className="vaultManageGrid">
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          {!hasDeposit && !hasBeneficiaries ? (
            <div className="setupPrompt">
              <div className="setupStep active">
                <span className="setupStepNum">1</span>
                <div>
                  <strong>Deposit BTC collateral</strong>
                  <p>
                    Lock Bitcoin into your vault. This becomes the collateral
                    backing MUSD for your beneficiaries.
                  </p>
                </div>
              </div>
              <div className="setupStep">
                <span className="setupStepNum">2</span>
                <div>
                  <strong>Add beneficiaries</strong>
                  <p>Set wallet addresses and percentage splits.</p>
                </div>
              </div>
              <div className="setupStep">
                <span className="setupStepNum">3</span>
                <div>
                  <strong>Vault goes live</strong>
                  <p>
                    Your check-in timer starts. Miss it, and beneficiaries can
                    claim MUSD.
                  </p>
                </div>
              </div>
            </div>
          ) : hasDeposit && !hasBeneficiaries ? (
            <div className="setupPrompt">
              <div className="setupStep done">
                <CheckCircle2 size={18} />
                <div>
                  <strong>{fmtBtc(vault.vaultBalance)} BTC deposited</strong>
                </div>
              </div>
              <div className="setupStep active">
                <span className="setupStepNum">2</span>
                <div>
                  <strong>Add beneficiaries</strong>
                  <p>
                    Add at least one beneficiary with percentage splits totaling
                    100%.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <dl className="statGrid">
            <div>
              <dt>BTC Locked</dt>
              <dd className="statHighlight">
                {fmtBtc(vault.vaultBalance)} BTC
              </dd>
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
              <dd>{vault.totalBps?.toString() ?? "0"} / 10000</dd>
            </div>
          </dl>

          <CollateralHealth price={btcPrice} />

          {!vault.released && (
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
                <button
                  className="actionBtn"
                  type="button"
                  onClick={doDeposit}
                  disabled={insufficientGas}
                >
                  <Wallet size={15} /> Deposit
                </button>
              </div>
            </div>
          )}
        </motion.div>

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
            {!vault.released && (
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

        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16, ease }}
        >
          <h3 className="cardTitle">
            Beneficiaries <span className="benCountBadge">{benCount}</span>
          </h3>

          {beneficiaries.length > 0 ? (
            <BeneficiaryCards
              beneficiaries={beneficiaries}
              estimatedMusd={estimatedMusd}
              released={vault.released}
              isOwner={true}
              connected={address}
              onRemove={doRemoveBeneficiary}
              disabled={insufficientGas}
            />
          ) : (
            <div className="emptyBenPrompt">
              <Users size={20} />
              <strong>No beneficiaries yet</strong>
              <p>
                Add wallet addresses below with percentage splits (BPS). Splits
                must total 10000 (100%).
              </p>
            </div>
          )}

          {!vault.released && (
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
