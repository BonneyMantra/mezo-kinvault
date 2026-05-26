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
  useDisconnect,
} from "wagmi";
import { parseEther, formatEther } from "viem";

const FAUCET_URL = "https://faucet.test.mezo.org/";
// Flat gas floor — Mezo gas is cheap, this covers any contract call.
const GAS_FLOOR = parseEther("0.000001");
import { shortAddress, PROOF, explorerAddress, explorerTx } from "../lib/proof";
import { KINVAULT_ABI, MEZO_ADDRESSES } from "../lib/contracts";
import {
  useKinVaultState,
  useBeneficiaries,
  useMezoRiskParams,
  useBeneficiaryStatus,
} from "../hooks/useKinVault";
import { useActivityFeed } from "../hooks/useVaultData";
import { useBtcPrice } from "../hooks/useBtcPrice";
import { WalletEntry } from "./WalletEntry";
import { ActivityFeed } from "./dashboard/ActivityFeed";
import { LifecycleTimeline } from "./dashboard/LifecycleTimeline";
import { CollateralHealth } from "./dashboard/CollateralHealth";
import { BeneficiaryCards } from "./dashboard/BeneficiaryCards";

const formatTokenAmount = (wei: bigint | undefined, digits = 2) => {
  if (wei === undefined) return "—";
  return Number(formatEther(wei)).toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
};

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
  const { data: nativeBalance } = useBalance({
    address,
    query: { refetchInterval: 10000 },
  });
  const vault = useKinVaultState();
  const risk = useMezoRiskParams();
  const benStatus = useBeneficiaryStatus(address);
  const feed = useActivityFeed();
  const { price: btcPrice } = useBtcPrice();

  // Gas pre-check: block all transactions if the wallet can't cover gas.
  const balanceLoaded = nativeBalance !== undefined;
  const insufficientGas = balanceLoaded && nativeBalance.value < GAS_FLOOR;

  // Simulate key transactions to catch contract reverts before sending.
  const heartbeatSim = useSimulateContract({
    address: MEZO_ADDRESSES.kinVault,
    abi: KINVAULT_ABI,
    functionName: "heartbeat",
    query: { enabled: !insufficientGas && !!address },
  });
  const releaseSim = useSimulateContract({
    address: MEZO_ADDRESSES.kinVault,
    abi: KINVAULT_ABI,
    functionName: "release",
    query: { enabled: !insufficientGas && !!address },
  });

  const heartbeatBlocked = !heartbeatSim.isSuccess;
  const releaseBlocked = !releaseSim.isSuccess;

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

  const hasDeposit =
    vault.vaultBalance !== undefined && vault.vaultBalance > 0n;
  const hasBeneficiaries = benCount > 0;
  const isSetupComplete =
    hasDeposit && hasBeneficiaries && vault.totalBps === 10000n;
  type LifecycleStage =
    | "empty"
    | "needsBeneficiaries"
    | "needsDeposit"
    | "active"
    | "ready"
    | "released";
  const stage: LifecycleStage = vault.released
    ? "released"
    : !hasDeposit && !hasBeneficiaries
      ? "empty"
      : hasDeposit && !hasBeneficiaries
        ? "needsBeneficiaries"
        : !hasDeposit && hasBeneficiaries
          ? "needsDeposit"
          : scenario === "ready"
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
      benStatus.refetch();
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
    setTxStatus("Recording heartbeat...");
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
    setTxStatus("Releasing vault — opening MUSD trove...");
    writeContract(releaseSim.data.request);
  };

  const doRehearse = () => {
    setTxStatus("Rehearsing claim on-chain...");
    writeContract({
      address: MEZO_ADDRESSES.kinVault,
      abi: KINVAULT_ABI,
      functionName: "rehearseClaim",
    });
  };

  const secondsUntilRelease = vault.releaseAt
    ? Math.max(0, Number(vault.releaseAt) - Math.floor(now / 1000))
    : undefined;

  const statusCopy = {
    active: { eyebrow: "Owner check-in active", title: "Release blocked" },
    ready: { eyebrow: "Check-in missed", title: "Release available" },
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

      {insufficientGas && (
        <motion.div
          className="faucetBanner"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
        >
          <Droplet size={16} />
          <span>
            You need testnet BTC for gas before you can transact. Claim from the
            Mezo faucet, then refresh.
          </span>
          <a
            className="faucetBtn"
            href={FAUCET_URL}
            target="_blank"
            rel="noreferrer"
          >
            Get testnet BTC
          </a>
        </motion.div>
      )}

      <div className="dashGrid">
        <motion.div
          className="dashPanel vaultPanel"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          <h2 className="panelTitle">Vault Status</h2>

          {stage === "empty" && isOwner && (
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
          )}

          {stage === "needsBeneficiaries" && isOwner && (
            <div className="setupPrompt">
              <div className="setupStep done">
                <CheckCircle2 size={18} />
                <div>
                  <strong>{formatBtc(vault.vaultBalance)} BTC deposited</strong>
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
          )}

          {(stage !== "empty" || !isOwner) && (
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
          )}

          <div className="riskPreview">
            <div className="riskHeader">
              <ShieldCheck size={14} />
              <span>Live Mezo borrow preview</span>
            </div>
            {risk.isError ? (
              <p className="riskError">
                Unable to read BorrowerOperations. Check RPC connection.
              </p>
            ) : (
              <dl className="riskStats">
                <div>
                  <dt>Min net debt</dt>
                  <dd>{formatTokenAmount(risk.minNetDebt)} MUSD</dd>
                </div>
                <div>
                  <dt>Gas comp</dt>
                  <dd>{formatTokenAmount(risk.gasCompensation)} MUSD</dd>
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
                  <dt>Min collateral (MCR)</dt>
                  <dd>
                    {risk.mcr !== undefined
                      ? `${(Number(risk.mcr) / 1e16).toFixed(0)}%`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Release ready</dt>
                  <dd>{vault.canRelease ? "Yes" : "No"}</dd>
                </div>
                <div>
                  <dt>Time to release</dt>
                  <dd>
                    {secondsUntilRelease !== undefined
                      ? formatTimer(secondsUntilRelease)
                      : "—"}
                  </dd>
                </div>
              </dl>
            )}
          </div>

          <div className="mezoBondRow">
            <Coins size={14} />
            <span>MEZO keeper bond</span>
            <strong>{formatTokenAmount(vault.mezoBond)} MEZO</strong>
            {vault.keeperRewardBps !== undefined && (
              <em>{(vault.keeperRewardBps / 100).toFixed(0)}% keeper</em>
            )}
          </div>

          <CollateralHealth price={btcPrice} />

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
          className={`dashPanel cockpitPanel ${scenario}`}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.65, delay: 0.08, ease }}
        >
          <div className="stateHeader">
            <span>
              {stage === "empty" ||
              stage === "needsBeneficiaries" ||
              stage === "needsDeposit"
                ? "Setting up"
                : copy.eyebrow}
            </span>
            <strong>
              {stage === "empty"
                ? "Deposit BTC to begin"
                : stage === "needsBeneficiaries"
                  ? "Add beneficiaries"
                  : stage === "needsDeposit"
                    ? "Deposit BTC"
                    : copy.title}
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

          <div className="checkinNote">
            <strong>Demo check-in: 60 seconds</strong>
            <span>
              Production vaults should use monthly or quarterly check-ins with
              reminders and a grace period.
            </span>
          </div>

          <div className="controlRail">
            {isOwner && !vault.released && (
              <button
                className="actionBtn"
                type="button"
                onClick={doHeartbeat}
                disabled={insufficientGas || heartbeatBlocked}
              >
                <RotateCcw size={15} /> Refresh check-in
              </button>
            )}
            <button
              className="actionBtn release"
              type="button"
              disabled={
                scenario !== "ready" ||
                !vault.canRelease ||
                insufficientGas ||
                releaseBlocked
              }
              onClick={doRelease}
            >
              <Activity size={15} /> Release MUSD
            </button>
          </div>

          {insufficientGas && (
            <div className="gasNote">
              <Droplet size={13} /> Insufficient BTC for gas
            </div>
          )}
          {txStatus && <div className="txStatus">{txStatus}</div>}

          <LifecycleTimeline
            events={feed.events}
            released={vault.released}
            totalBps={vault.totalBps}
            vaultBalance={vault.vaultBalance}
          />
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
            <BeneficiaryCards
              beneficiaries={beneficiaries}
              estimatedMusd={estimatedMusd}
              released={vault.released}
              isOwner={Boolean(isOwner)}
              connected={address}
              onRemove={doRemoveBeneficiary}
              disabled={insufficientGas}
            />
          ) : benCount > 0 ? (
            <p className="emptyNote">Loading beneficiaries…</p>
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

          {isBeneficiary && (
            <div className="rehearsalBox">
              <div className="rehearsalHead">
                <strong>Claim rehearsal</strong>
                {benStatus.hasRehearsed ? (
                  <span className="rehearsalDone">
                    <CheckCircle2 size={13} /> Rehearsed
                  </span>
                ) : (
                  <span className="rehearsalPending">Not rehearsed</span>
                )}
              </div>
              <p className="rehearsalCopy">
                Practice your inheritance claim on-chain. Proves you can sign as
                a configured beneficiary — no funds move.
              </p>
              {!vault.released && (
                <button
                  className="actionBtn"
                  type="button"
                  onClick={doRehearse}
                  disabled={insufficientGas}
                >
                  <ShieldCheck size={15} />{" "}
                  {benStatus.hasRehearsed ? "Rehearse again" : "Rehearse claim"}
                </button>
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
                disabled={insufficientGas}
              >
                <Plus size={15} />
              </button>
            </div>
          )}
        </motion.div>
      </div>

      <ActivityFeed events={feed.events} isLoading={feed.isLoading} />

      <motion.section
        className="judgeProof"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease }}
        aria-label="Judge proof"
      >
        <div className="judgeProofHead">
          <ShieldCheck size={15} />
          <span>Judge proof — live on Mezo Testnet</span>
        </div>
        <div className="judgeProofGrid">
          <div>
            <dt>Network</dt>
            <dd>
              {PROOF.network} ({PROOF.chainId})
            </dd>
          </div>
          <div>
            <dt>Contract</dt>
            <dd>
              <a
                href={explorerAddress(PROOF.contract)}
                target="_blank"
                rel="noreferrer"
              >
                {shortAddress(PROOF.contract)} <ExternalLink size={11} />
              </a>
            </dd>
          </div>
          <div>
            <dt>Deploy tx</dt>
            <dd>
              <a
                href={explorerTx(PROOF.deployTx)}
                target="_blank"
                rel="noreferrer"
              >
                {shortAddress(PROOF.deployTx)} <ExternalLink size={11} />
              </a>
            </dd>
          </div>
          <div>
            <dt>Release tx</dt>
            <dd>
              {vault.released ? (
                <a
                  href={explorerTx(PROOF.releaseTx)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {shortAddress(PROOF.releaseTx)} <ExternalLink size={11} />
                </a>
              ) : (
                <span className="proofPending">awaiting release</span>
              )}
            </dd>
          </div>
          <div>
            <dt>Proof JSON</dt>
            <dd>
              <a href={PROOF.proofJson} target="_blank" rel="noreferrer">
                latest.json <ExternalLink size={11} />
              </a>
            </dd>
          </div>
          <div>
            <dt>Live app</dt>
            <dd>
              <a href={PROOF.liveUrl} target="_blank" rel="noreferrer">
                mezo-kinvault.vercel.app <ExternalLink size={11} />
              </a>
            </dd>
          </div>
        </div>
        <p className="judgeDisclaimer">
          KinVault is custody-planning infrastructure on Mezo. Not a legal will,
          not probate, not financial advice, and not a seed-phrase custody
          substitute.
        </p>
      </motion.section>
    </div>
  );
}
