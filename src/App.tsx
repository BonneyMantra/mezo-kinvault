import { motion } from "motion/react";
import {
  Activity,
  ArrowUpRight,
  Clock3,
  FileWarning,
  HeartPulse,
  LockKeyhole,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import { WalletEntry } from "./components/WalletEntry";
import { shortAddress } from "./lib/proof";
import { mezoLinks } from "./lib/mezo";
import { KINVAULT_ABI, MEZO_ADDRESSES } from "./lib/contracts";
import { useKinVaultState, useBeneficiaries } from "./hooks/useKinVault";
import { useBtcPrice } from "./hooks/useBtcPrice";

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

type AppProps = { passportEnabled: boolean };

export function App({ passportEnabled }: AppProps) {
  const { address, isConnected } = useAccount();
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
    isConnected &&
    address &&
    vault.owner &&
    address.toLowerCase() === vault.owner.toLowerCase();
  const isBeneficiary =
    isConnected &&
    address &&
    beneficiaries.some((b) => b.addr.toLowerCase() === address.toLowerCase());
  const myBeneficiary = beneficiaries.find(
    (b) => address && b.addr.toLowerCase() === address.toLowerCase(),
  );

  const vaultDeployed =
    MEZO_ADDRESSES.kinVault !== "0x0000000000000000000000000000000000000000";

  const releaseTimestamp = vault.releaseAt ? Number(vault.releaseAt) : 0;
  const secondsRemaining = useMemo(() => {
    if (!releaseTimestamp || vault.released) return 0;
    const remaining = releaseTimestamp - Math.floor(now / 1000);
    return Math.max(0, remaining);
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
    setTxStatus("Removing beneficiary...");
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
    active: {
      eyebrow: "Heartbeat active",
      title: "Beneficiary release is blocked",
      body: "The owner heartbeat is still active. Release attempts revert until the heartbeat window expires.",
    },
    ready: {
      eyebrow: "Heartbeat missed",
      title: "Beneficiary release is now allowed",
      body: "The heartbeat window has expired. Anyone can trigger the release — BTC will be converted to MUSD via Mezo's borrowing system and distributed to beneficiaries.",
    },
    released: {
      eyebrow: "Reserve released",
      title: "MUSD distributed to beneficiaries",
      body: "A MUSD trove was opened against the BTC collateral and the borrowed MUSD was distributed proportionally to all beneficiaries.",
    },
  };
  const copy = statusCopy[scenario];

  return (
    <main className="appShell">
      <video
        className="ambientVideo"
        autoPlay
        muted
        loop
        playsInline
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_063509_7d167302-4fd4-480b-8260-18ab572333d4.mp4"
      />
      <div className="videoScrim" />
      <div className="noiseLayer" />

      <div className="workspace">
        <header className="topbar" aria-label="KinVault workspace">
          <a className="brandLockup" href="/" aria-label="KinVault home">
            <span className="brandMark">
              <LockKeyhole size={18} strokeWidth={1.8} />
            </span>
            <span>
              <strong>KinVault</strong>
              <small>Mezo beneficiary release</small>
            </span>
          </a>

          <nav className="navLinks" aria-label="Project links">
            <a href={mezoLinks.docs} target="_blank" rel="noreferrer">
              Mezo docs
            </a>
            <a href={mezoLinks.explorer} target="_blank" rel="noreferrer">
              Testnet explorer
            </a>
            <a
              href="https://github.com/BonneyMantra/mezo-kinvault"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </nav>

          <div className="walletSlot">
            <WalletEntry passportEnabled={passportEnabled} />
          </div>
        </header>

        <section className="heroGrid" aria-label="KinVault release cockpit">
          <motion.div
            className="narrativePanel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div className="proofPill">
              <ShieldCheck size={16} />
              {vaultDeployed ? "Mezo Testnet" : "Not deployed"}
            </div>
            <h1>Inherit Bitcoin without selling it.</h1>
            <p>
              KinVault auto-borrows MUSD against BTC collateral at Mezo&rsquo;s
              fixed rate and distributes the borrowed MUSD to Passport-verified
              beneficiaries when the owner&rsquo;s heartbeat expires.
            </p>

            {!vaultDeployed && (
              <div className="legalNote" role="note">
                <FileWarning size={18} />
                <span>
                  Contract not yet deployed. Set the vault address in
                  contracts.ts after deployment.
                </span>
              </div>
            )}

            {vaultDeployed && (
              <>
                <dl className="vaultStats">
                  <div>
                    <dt>BTC Collateral</dt>
                    <dd>{formatBtc(vault.vaultBalance)} BTC</dd>
                  </div>
                  <div>
                    <dt>BTC Price</dt>
                    <dd>{formatUsd(btcPrice)}</dd>
                  </div>
                  <div>
                    <dt>Est. MUSD</dt>
                    <dd>{formatMusd(estimatedMusd)} MUSD</dd>
                  </div>
                  <div>
                    <dt>Splits</dt>
                    <dd>{vault.totalBps?.toString() ?? "0"} / 10000 BPS</dd>
                  </div>
                </dl>

                {isOwner && !vault.released && (
                  <div className="ownerControls">
                    <div className="depositRow">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="BTC amount (e.g. 0.01)"
                        value={depositAmount}
                        onChange={(e) =>
                          setDepositAmount(
                            e.target.value.replace(/[^0-9.]/g, ""),
                          )
                        }
                      />
                      <button
                        className="controlButton"
                        type="button"
                        onClick={doDeposit}
                      >
                        <Wallet size={16} /> Deposit BTC
                      </button>
                    </div>

                    <div className="beneficiaryForm">
                      <input
                        type="text"
                        placeholder="Beneficiary address (0x...)"
                        value={newBenAddress}
                        onChange={(e) => setNewBenAddress(e.target.value)}
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="BPS (e.g. 5000)"
                        value={newBenBps}
                        onChange={(e) =>
                          setNewBenBps(e.target.value.replace(/[^0-9]/g, ""))
                        }
                      />
                      <button
                        className="controlButton"
                        type="button"
                        onClick={doAddBeneficiary}
                      >
                        <Plus size={16} /> Add
                      </button>
                    </div>
                  </div>
                )}

                {txStatus && <div className="txStatus">{txStatus}</div>}

                <div className="legalNote" role="note">
                  <FileWarning size={18} />
                  <span>
                    Not a probate product, not financial advice, and not a
                    seed-phrase custody substitute.
                  </span>
                </div>
              </>
            )}
          </motion.div>

          <motion.div
            className={`cockpitPanel ${scenario}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.1, ease: "easeOut" }}
          >
            <div className="stateHeader">
              <span>{copy.eyebrow}</span>
              <strong>{copy.title}</strong>
            </div>

            <div className="timerModule" aria-label="Heartbeat countdown">
              <svg
                className="timerRing"
                viewBox="0 0 240 240"
                role="img"
                aria-label="Heartbeat release timer"
              >
                <circle className="ringTrack" cx="120" cy="120" r="94" />
                <circle
                  className="ringProgress"
                  cx="120"
                  cy="120"
                  r="94"
                  pathLength="1"
                  style={{ strokeDashoffset: 1 - progress }}
                />
              </svg>
              <div className="timerCore">
                <HeartPulse size={28} />
                <strong>
                  {scenario === "released"
                    ? "released"
                    : formatTimer(secondsRemaining)}
                </strong>
                <span>
                  {scenario === "active"
                    ? "until release gate opens"
                    : "gate condition met"}
                </span>
              </div>
            </div>

            <p className="stateBody">{copy.body}</p>

            <div className="controlRail">
              {isOwner && !vault.released && (
                <button
                  className="controlButton"
                  type="button"
                  onClick={doHeartbeat}
                >
                  <RotateCcw size={18} /> Record heartbeat
                </button>
              )}
              <button
                className="controlButton release"
                type="button"
                disabled={scenario !== "ready" || !vault.canRelease}
                onClick={doRelease}
              >
                <Activity size={18} />
                Release &amp; distribute MUSD
              </button>
            </div>
          </motion.div>

          <motion.aside
            className="proofRail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.18, ease: "easeOut" }}
          >
            <div className="proofHeader">
              <span>Vault info</span>
              <strong>{formatBtc(vault.vaultBalance)} BTC</strong>
            </div>

            <dl className="addressList">
              <div>
                <dt>Owner</dt>
                <dd>{vault.owner ? shortAddress(vault.owner) : "—"}</dd>
              </div>
              <div>
                <dt>Vault</dt>
                <dd>{shortAddress(MEZO_ADDRESSES.kinVault)}</dd>
              </div>
              <div>
                <dt>Chain</dt>
                <dd>Mezo Testnet 31611</dd>
              </div>
              <div>
                <dt>Interval</dt>
                <dd>{heartbeatSec}s</dd>
              </div>
            </dl>

            <div className="beneficiarySection">
              <strong>Beneficiaries ({benCount})</strong>
              {beneficiaries.length > 0 ? (
                <ol className="beneficiaryList">
                  {beneficiaries.map((b, i) => (
                    <li key={b.addr}>
                      <span className="benAddress">{shortAddress(b.addr)}</span>
                      <span className="benBps">
                        {(b.bps / 100).toFixed(1)}%
                      </span>
                      {isOwner && !vault.released && (
                        <button
                          className="benRemove"
                          type="button"
                          onClick={() => doRemoveBeneficiary(i)}
                          aria-label="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="emptyNote">No beneficiaries added yet.</p>
              )}
            </div>

            {isBeneficiary && myBeneficiary && (
              <div className="myAllocation">
                <strong>Your allocation</strong>
                <span>{(myBeneficiary.bps / 100).toFixed(1)}%</span>
                {estimatedMusd > 0n && (
                  <span>
                    ~
                    {formatMusd(
                      (estimatedMusd * BigInt(myBeneficiary.bps)) / 10000n,
                    )}{" "}
                    MUSD
                  </span>
                )}
              </div>
            )}
          </motion.aside>
        </section>

        <section className="systemsStrip" aria-label="Integration status">
          <div>
            <Clock3 size={18} />
            <span>{heartbeatSec}s heartbeat interval</span>
          </div>
          <div>
            <ShieldCheck size={18} />
            <span>MUSD via Mezo BorrowerOperations</span>
          </div>
          <div>
            <ArrowUpRight size={18} />
            <span>Passport-verified beneficiaries</span>
          </div>
        </section>
      </div>
    </main>
  );
}
