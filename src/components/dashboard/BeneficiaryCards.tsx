import { motion } from "motion/react";
import { CheckCircle2, Circle, Trash2 } from "lucide-react";
import { formatEther } from "viem";
import { shortAddress, explorerAddress } from "../../lib/proof";
import { useBeneficiaryDetails } from "../../hooks/useVaultData";

const musd = (v: bigint | undefined) =>
  v && v > 0n
    ? Number(formatEther(v)).toLocaleString(undefined, {
        maximumFractionDigits: 2,
      })
    : null;

type Props = {
  beneficiaries: { addr: `0x${string}`; bps: number }[];
  estimatedMusd: bigint;
  released: boolean | undefined;
  isOwner: boolean;
  connected: `0x${string}` | undefined;
  onRemove: (i: number) => void;
  disabled: boolean;
};

export function BeneficiaryCards({
  beneficiaries,
  estimatedMusd,
  released,
  isOwner,
  connected,
  onRemove,
  disabled,
}: Props) {
  const { details } = useBeneficiaryDetails(beneficiaries);

  return (
    <ul className="benCards">
      {details.map((b, i) => {
        const isMe =
          connected && b.addr.toLowerCase() === connected.toLowerCase();
        const received = musd(b.musdReceived);
        const projected =
          estimatedMusd > 0n
            ? Number(
                formatEther((estimatedMusd * BigInt(b.bps)) / 10000n),
              ).toLocaleString(undefined, { maximumFractionDigits: 2 })
            : null;
        return (
          <motion.li
            key={b.addr}
            className={`benCard ${isMe ? "isMe" : ""}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.06 * i }}
          >
            <div className="benCardTop">
              <a
                className="benCardAddr"
                href={explorerAddress(b.addr)}
                target="_blank"
                rel="noreferrer"
              >
                {shortAddress(b.addr)}
                {isMe && <span className="youTag">you</span>}
              </a>
              <span className="benCardPct">{(b.bps / 100).toFixed(1)}%</span>
              {isOwner && !released && (
                <button
                  className="benRemove"
                  type="button"
                  onClick={() => onRemove(i)}
                  disabled={disabled}
                  aria-label="Remove beneficiary"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            <div className="benCardMeta">
              <span className={`benRehearse ${b.hasRehearsed ? "done" : ""}`}>
                {b.hasRehearsed ? (
                  <CheckCircle2 size={12} />
                ) : (
                  <Circle size={12} />
                )}
                {b.hasRehearsed ? "Rehearsed" : "Not rehearsed"}
              </span>
              <span className="benAmount">
                {received ? (
                  <>
                    <em>received</em> {received} MUSD
                  </>
                ) : projected ? (
                  <>
                    <em>~</em>
                    {projected} MUSD
                  </>
                ) : (
                  <em>awaiting release</em>
                )}
              </span>
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}
