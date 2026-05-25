import { motion } from "motion/react";
import {
  Activity,
  CheckCircle2,
  Droplet,
  Gift,
  HeartPulse,
  ShieldCheck,
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
  useBeneficiaryStatus,
} from "../../hooks/useKinVault";
import { useBtcPrice } from "../../hooks/useBtcPrice";

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
const fmtTimer = (s: number) => {
  const safe = Math.max(0, s);
  return `${Math.floor(safe / 60)
    .toString()
    .padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`;
};

export function BeneficiaryPage() {
  const { address } = useAccount();
  const { data: nativeBalance } = useBalance({
    address,
    query: { refetchInterval: 10000 },
  });
  const vault = useKinVaultState();
  const { price: btcPrice } = useBtcPrice();
  const benCount = vault.beneficiaryCount ? Number(vault.beneficiaryCount) : 0;
  const { beneficiaries, refetch: refetchBens } = useBeneficiaries(benCount);
  const benStatus = useBeneficiaryStatus(address);

  const [now, setNow] = useState(() => Date.now());
  const [txStatus, setTxStatus] = useState("");

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const myBeneficiary = beneficiaries.find(
    (b) => address && b.addr.toLowerCase() === address.toLowerCase(),
  );
  const isBeneficiary = Boolean(myBeneficiary);

  const balanceLoaded = nativeBalance !== undefined;
  const insufficientGas = balanceLoaded && nativeBalance.value < GAS_FLOOR;

  const releaseSim = useSimulateContract({
    address: MEZO_ADDRESSES.kinVault,
    abi: KINVAULT_ABI,
    functionName: "release",
    query: { enabled: !insufficientGas && !!address && isBeneficiary },
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

  const myEstMusd =
    myBeneficiary && estimatedMusd > 0n
      ? (estimatedMusd * BigInt(myBeneficiary.bps)) / 10000n
      : 0n;

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
      benStatus.refetch();
      releaseSim.refetch();
      setTimeout(() => setTxStatus(""), 3000);
    }
  }, [txConfirmed]);

  const doRelease = () => {
    if (!releaseSim.data?.request) return;
    setTxStatus("Releasing — opening MUSD trove...");
    writeContract(releaseSim.data.request);
  };

  const doRehearse = () => {
    setTxStatus("Rehearsing claim...");
    writeContract({
      address: MEZO_ADDRESSES.kinVault,
      abi: KINVAULT_ABI,
      functionName: "rehearseClaim",
    });
  };

  if (!isBeneficiary) {
    return (
      <div className="pageContainer">
        <div className="pageHeader">
          <Gift size={20} />
          <h1>Beneficiary</h1>
        </div>
        <motion.div
          className="emptyPage"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          <div className="emptyIcon">
            <Gift size={40} />
          </div>
          <h2>Not a beneficiary</h2>
          <p>
            Your connected wallet is not listed as a beneficiary in any known
            vault. If a vault owner has added you, make sure you&rsquo;re using
            the correct wallet address.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pageContainer">
      <div className="pageHeader">
        <Gift size={20} />
        <h1>Beneficiary</h1>
        <span className={`statusBadge ${scenario}`}>
          {scenario === "active"
            ? "Vault active"
            : scenario === "ready"
              ? "Claim available"
              : "Claimed"}
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

      <div className="beneficiaryGrid">
        <motion.div
          className="card allocationCard"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          <h3 className="cardTitle">Your Allocation</h3>
          <div className="allocBig">
            <span className="allocPctBig">
              {(myBeneficiary!.bps / 100).toFixed(1)}%
            </span>
            <span className="allocLabel">of vault MUSD</span>
          </div>
          <dl className="statGrid">
            <div>
              <dt>Vault collateral</dt>
              <dd>{fmtBtc(vault.vaultBalance)} BTC</dd>
            </div>
            <div>
              <dt>Total est. MUSD</dt>
              <dd>{fmtMusd(estimatedMusd)}</dd>
            </div>
            <div>
              <dt>Your est. MUSD</dt>
              <dd className="statHighlight">{fmtMusd(myEstMusd)}</dd>
            </div>
            <div>
              <dt>Vault owner</dt>
              <dd>{vault.owner ? shortAddress(vault.owner) : "—"}</dd>
            </div>
          </dl>
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
                ? "Owner check-in active"
                : scenario === "ready"
                  ? "Check-in missed"
                  : "Vault released"}
            </span>
            <strong>
              {scenario === "active"
                ? "Release blocked"
                : scenario === "ready"
                  ? "You can claim"
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
                  ? "until claim"
                  : scenario === "ready"
                    ? "claim ready"
                    : "claimed"}
              </span>
            </div>
          </div>

          <div className="controlRail">
            <button
              className="actionBtn release"
              type="button"
              disabled={
                scenario !== "ready" || insufficientGas || !releaseSim.isSuccess
              }
              onClick={doRelease}
            >
              <Activity size={15} /> Claim MUSD
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
          <h3 className="cardTitle">Claim Rehearsal</h3>
          <div className="rehearsalStatus">
            {benStatus.hasRehearsed ? (
              <span className="rehearsalDone">
                <CheckCircle2 size={16} /> Rehearsed
              </span>
            ) : (
              <span className="rehearsalPending">Not rehearsed</span>
            )}
          </div>
          <p className="rehearsalCopy">
            Practice your inheritance claim on-chain before an emergency. Proves
            you can sign as a configured beneficiary — no funds move.
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
        </motion.div>
      </div>
    </div>
  );
}
