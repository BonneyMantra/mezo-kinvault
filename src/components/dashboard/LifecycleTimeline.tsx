import { motion } from "motion/react";
import { Check } from "lucide-react";
import type { VaultEvent } from "../../hooks/useVaultData";

type Props = {
  events: VaultEvent[];
  released: boolean | undefined;
  totalBps: bigint | undefined;
  vaultBalance: bigint | undefined;
};

const firstTs = (events: VaultEvent[], name: string) =>
  events
    .filter((e) => e.name === name)
    .sort((a, b) => Number(a.block - b.block))[0]?.ts;

const day = (ts: number | undefined) =>
  ts
    ? new Date(ts * 1000).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "";

export function LifecycleTimeline({
  events,
  released,
  totalBps,
  vaultBalance,
}: Props) {
  const isReleased =
    released === true || events.some((e) => e.name === "VaultReleased");
  // A released vault was definitionally funded with a complete BPS set, so these
  // read true instantly from state even after the BTC has moved into the trove.
  const funded =
    isReleased ||
    (vaultBalance ?? 0n) > 0n ||
    events.some((e) => e.name === "Deposited");
  const beneficiariesSet =
    isReleased ||
    totalBps === 10000n ||
    events.some((e) => e.name === "BeneficiaryAdded");
  const rehearsed = events.some((e) => e.name === "BeneficiaryRehearsed");

  const steps = [
    { label: "Vault created", done: true, ts: firstTs(events, "Heartbeat") },
    { label: "BTC funded", done: funded, ts: firstTs(events, "Deposited") },
    {
      label: "Beneficiaries set",
      done: beneficiariesSet,
      ts: firstTs(events, "BeneficiaryAdded"),
    },
    {
      label: "Claim rehearsed",
      done: rehearsed,
      ts: firstTs(events, "BeneficiaryRehearsed"),
    },
    {
      label: "MUSD released",
      done: isReleased,
      ts: firstTs(events, "VaultReleased"),
    },
  ];

  return (
    <div className="lifecycle">
      <div className="lifecycleHead">Vault lifecycle</div>
      <ol className="lifecycleSteps">
        {steps.map((s, i) => (
          <motion.li
            key={s.label}
            className={s.done ? "done" : "pending"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 * i }}
          >
            <span className="lifeDot">
              {s.done && <Check size={11} strokeWidth={3} />}
            </span>
            <span className="lifeLabel">{s.label}</span>
            {s.ts ? <span className="lifeTs">{day(s.ts)}</span> : null}
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
