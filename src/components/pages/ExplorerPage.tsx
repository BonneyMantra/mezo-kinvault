import { motion } from "motion/react";
import {
  Compass,
  ExternalLink,
  HeartPulse,
  ShieldCheck,
  Users,
} from "lucide-react";
import { formatEther } from "viem";
import {
  shortAddress,
  PROOF,
  explorerAddress,
  explorerTx,
} from "../../lib/proof";
import {
  useKinVaultState,
  useBeneficiaries,
  useMezoRiskParams,
} from "../../hooks/useKinVault";
import { useBtcPrice } from "../../hooks/useBtcPrice";
import { useActivityFeed } from "../../hooks/useVaultData";
import { ActivityFeed } from "../dashboard/ActivityFeed";
import { CollateralHealth } from "../dashboard/CollateralHealth";
import { LifecycleTimeline } from "../dashboard/LifecycleTimeline";
import { MEZO_ADDRESSES } from "../../lib/contracts";

const ease = [0.22, 1, 0.36, 1] as const;

const fmt = (wei: bigint | undefined, digits = 2) => {
  if (wei === undefined) return "—";
  return Number(formatEther(wei)).toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
};
const fmtBtc = (wei: bigint | undefined) =>
  wei ? Number(formatEther(wei)).toFixed(6) : "0";
const fmtUsd = (p: bigint | undefined) =>
  p
    ? `$${Number(formatEther(p)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : "$0";

export function ExplorerPage() {
  const vault = useKinVaultState();
  const { price: btcPrice } = useBtcPrice();
  const risk = useMezoRiskParams();
  const feed = useActivityFeed();
  const benCount = vault.beneficiaryCount ? Number(vault.beneficiaryCount) : 0;
  const { beneficiaries } = useBeneficiaries(benCount);

  return (
    <div className="pageContainer">
      <div className="pageHeader">
        <Compass size={20} />
        <h1>Vault Explorer</h1>
        <span className="pageSubtitle">
          Live on-chain data from Mezo Testnet
        </span>
      </div>

      <div className="explorerGrid">
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          <h3 className="cardTitle">Vault Overview</h3>
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
              <dt>Beneficiaries</dt>
              <dd>{benCount}</dd>
            </div>
            <div>
              <dt>Splits</dt>
              <dd>{vault.totalBps?.toString() ?? "0"} / 10000</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span
                  className={`statusDot ${vault.released ? "released" : vault.canRelease ? "ready" : "active"}`}
                />
                {vault.released
                  ? "Released"
                  : vault.canRelease
                    ? "Release available"
                    : "Active"}
              </dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd>{vault.owner ? shortAddress(vault.owner) : "—"}</dd>
            </div>
          </dl>
        </motion.div>

        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease }}
        >
          <h3 className="cardTitle">Mezo Borrow Parameters</h3>
          <dl className="statGrid">
            <div>
              <dt>Min net debt</dt>
              <dd>{fmt(risk.minNetDebt)} MUSD</dd>
            </div>
            <div>
              <dt>Gas compensation</dt>
              <dd>{fmt(risk.gasCompensation)} MUSD</dd>
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
          </dl>

          <CollateralHealth price={btcPrice} />
        </motion.div>

        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16, ease }}
        >
          <h3 className="cardTitle">
            <Users size={15} /> Beneficiaries
          </h3>
          {beneficiaries.length > 0 ? (
            <ol className="explorerBenList">
              {beneficiaries.map((b) => (
                <li key={b.addr}>
                  <span className="benAddr">{shortAddress(b.addr)}</span>
                  <span className="benPct">{(b.bps / 100).toFixed(1)}%</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="emptyNote">No beneficiaries configured.</p>
          )}

          <LifecycleTimeline
            events={feed.events}
            released={vault.released}
            totalBps={vault.totalBps}
            vaultBalance={vault.vaultBalance}
          />
        </motion.div>
      </div>

      <ActivityFeed events={feed.events} isLoading={feed.isLoading} />

      <motion.section
        className="proofSection"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.24, ease }}
      >
        <div className="proofHead">
          <ShieldCheck size={15} />
          <span>Proof — live on Mezo Testnet</span>
        </div>
        <div className="proofGrid">
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
            <dt>Vault address</dt>
            <dd>
              <a
                href={explorerAddress(MEZO_ADDRESSES.kinVault)}
                target="_blank"
                rel="noreferrer"
              >
                {shortAddress(MEZO_ADDRESSES.kinVault)}{" "}
                <ExternalLink size={11} />
              </a>
            </dd>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
