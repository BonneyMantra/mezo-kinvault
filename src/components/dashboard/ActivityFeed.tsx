import { motion } from "motion/react";
import {
  Activity,
  Coins,
  HeartPulse,
  Layers,
  Send,
  ShieldCheck,
  Sparkles,
  UserMinus,
  UserPlus,
  Wallet,
} from "lucide-react";
import { formatEther } from "viem";
import { shortAddress, explorerTx } from "../../lib/proof";
import type { VaultEvent } from "../../hooks/useVaultData";

const fmt = (v: unknown, digits = 4) =>
  typeof v === "bigint"
    ? Number(formatEther(v)).toLocaleString(undefined, {
        maximumFractionDigits: digits,
      })
    : "0";

const relTime = (ts: number) => {
  if (!ts) return "";
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

type Row = { icon: typeof Activity; label: string; detail: string };

const describe = (e: VaultEvent): Row => {
  const a = e.args as Record<string, bigint | string | number>;
  switch (e.name) {
    case "Deposited":
      return {
        icon: Wallet,
        label: "BTC deposited",
        detail: `${fmt(a.amount)} BTC`,
      };
    case "Heartbeat":
      return {
        icon: HeartPulse,
        label: "Heartbeat recorded",
        detail: "owner liveness proof",
      };
    case "BeneficiaryAdded":
      return {
        icon: UserPlus,
        label: "Beneficiary added",
        detail: `${shortAddress(String(a.addr))} · ${Number(a.bps) / 100}%`,
      };
    case "BeneficiaryRemoved":
      return {
        icon: UserMinus,
        label: "Beneficiary removed",
        detail: shortAddress(String(a.addr)),
      };
    case "BeneficiaryRehearsed":
      return {
        icon: ShieldCheck,
        label: "Claim rehearsed",
        detail: `${shortAddress(String(a.beneficiary))} · ${Number(a.bps) / 100}%`,
      };
    case "TroveOpened":
      return {
        icon: Layers,
        label: "MUSD trove opened",
        detail: `${fmt(a.musdReceived, 2)} MUSD borrowed`,
      };
    case "InheritanceMUSDDistributed":
      return {
        icon: Send,
        label: "MUSD distributed",
        detail: `${fmt(a.amount, 2)} MUSD → ${shortAddress(String(a.beneficiary))}`,
      };
    case "VaultReleased":
      return {
        icon: Activity,
        label: "Vault released",
        detail: `${fmt(a.totalMUSD, 2)} MUSD to ${String(a.beneficiaryCount)} beneficiaries`,
      };
    case "MezoBondFunded":
      return {
        icon: Coins,
        label: "MEZO bond funded",
        detail: `${fmt(a.amount, 2)} MEZO`,
      };
    case "MezoKeeperRewardPaid":
      return {
        icon: Sparkles,
        label: "Keeper reward paid",
        detail: `${fmt(a.amount, 2)} MEZO`,
      };
    case "MezoBeneficiaryRewardPaid":
      return {
        icon: Coins,
        label: "MEZO reward",
        detail: `${fmt(a.amount, 2)} MEZO → ${shortAddress(String(a.beneficiary))}`,
      };
    default:
      return { icon: Activity, label: e.name, detail: "" };
  }
};

export function ActivityFeed({
  events,
  isLoading,
}: {
  events: VaultEvent[];
  isLoading: boolean;
}) {
  return (
    <motion.section
      className="dashPanel activityPanel"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="panelTitleRow">
        <h2 className="panelTitle">On-chain activity</h2>
        <span className="benCountBadge">{events.length}</span>
      </div>

      {isLoading ? (
        <p className="emptyNote">Reading event log from Mezo Testnet…</p>
      ) : events.length === 0 ? (
        <p className="emptyNote">No events yet.</p>
      ) : (
        <ol className="activityList">
          {events.map((e, i) => {
            const row = describe(e);
            const Icon = row.icon;
            return (
              <motion.li
                key={`${e.tx}-${e.logIndex}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.03, 0.4) }}
              >
                <span className="activityIcon">
                  <Icon size={14} strokeWidth={1.9} />
                </span>
                <span className="activityBody">
                  <strong>{row.label}</strong>
                  <em>{row.detail}</em>
                </span>
                <a
                  className="activityMeta"
                  href={explorerTx(e.tx)}
                  target="_blank"
                  rel="noreferrer"
                  title="View transaction"
                >
                  {relTime(e.ts)}
                </a>
              </motion.li>
            );
          })}
        </ol>
      )}
    </motion.section>
  );
}
