import { motion } from "motion/react";
import { Gauge, TriangleAlert } from "lucide-react";
import { formatEther } from "viem";
import { useTroveHealth } from "../../hooks/useVaultData";

const pct = (icr: bigint | undefined) =>
  icr !== undefined ? Number(icr) / 1e16 : undefined; // 1e18 → %

const usd = (v: bigint | undefined) =>
  v !== undefined
    ? `$${Number(formatEther(v)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : "—";

export function CollateralHealth({
  price,
  vaultAddress,
}: {
  price: bigint | undefined;
  vaultAddress?: `0x${string}`;
}) {
  const trove = useTroveHealth(price, vaultAddress);
  const icrPct = pct(trove.icr);

  // Bar maps 100%–200% ICR onto 0–100% width; markers at 110 (MCR) and 130 (safety).
  const clampToBar = (p: number) =>
    Math.max(0, Math.min(100, ((p - 100) / 100) * 100));
  const fill = icrPct !== undefined ? clampToBar(icrPct) : 0;
  const tone =
    icrPct === undefined
      ? ""
      : icrPct < 115
        ? "danger"
        : icrPct < 135
          ? "warn"
          : "safe";

  if (!trove.isActive && !trove.isLoading) {
    return (
      <div className="healthPanel idle">
        <div className="healthHead">
          <Gauge size={14} />
          <span>Collateral health</span>
        </div>
        <p className="emptyNote">No active trove yet — opens on release.</p>
      </div>
    );
  }

  return (
    <motion.div
      className="healthPanel"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="healthHead">
        <Gauge size={14} />
        <span>Collateral health</span>
        <strong className={`healthIcr ${tone}`}>
          {icrPct !== undefined ? `${icrPct.toFixed(1)}%` : "—"}
        </strong>
      </div>

      <div className="healthBar">
        <div className="healthTrack" />
        <span
          className="healthMarker mcr"
          style={{ left: `${clampToBar(110)}%` }}
        >
          <i />
          <small>MCR 110%</small>
        </span>
        <span
          className="healthMarker safe"
          style={{ left: `${clampToBar(130)}%` }}
        >
          <i />
          <small>safe 130%</small>
        </span>
        <motion.div
          className={`healthFill ${tone}`}
          initial={{ width: 0 }}
          animate={{ width: `${fill}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <dl className="healthStats">
        <div>
          <dt>Trove debt</dt>
          <dd>
            {trove.debt !== undefined
              ? `${Number(formatEther(trove.debt)).toLocaleString(undefined, { maximumFractionDigits: 0 })} MUSD`
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Collateral</dt>
          <dd>
            {trove.coll !== undefined
              ? `${Number(formatEther(trove.coll)).toFixed(4)} BTC`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="liqLabel">
            <TriangleAlert size={11} /> Liquidation at
          </dt>
          <dd>{usd(trove.liquidationPrice)}</dd>
        </div>
      </dl>
    </motion.div>
  );
}
