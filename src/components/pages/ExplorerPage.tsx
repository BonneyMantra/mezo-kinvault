import { motion } from "motion/react";
import { Compass, ExternalLink, LockKeyhole, TrendingUp } from "lucide-react";
import { formatEther } from "viem";
import { useReadContract } from "wagmi";
import {
  shortAddress,
  PROOF,
  explorerAddress,
  explorerTx,
} from "../../lib/proof";
import { useBtcPrice } from "../../hooks/useBtcPrice";
import { useMezoRiskParams } from "../../hooks/useKinVault";
import { FACTORY_ABI, MEZO_ADDRESSES } from "../../lib/contracts";

const ease = [0.22, 1, 0.36, 1] as const;

const fmt = (wei: bigint | undefined, digits = 2) => {
  if (wei === undefined) return "—";
  return Number(formatEther(wei)).toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
};
const fmtUsd = (p: bigint | undefined) =>
  p
    ? `$${Number(formatEther(p)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : "—";

export function ExplorerPage() {
  const { price: btcPrice } = useBtcPrice();
  const risk = useMezoRiskParams();

  const { data: vaultCount } = useReadContract({
    address: MEZO_ADDRESSES.factory,
    abi: FACTORY_ABI,
    functionName: "vaultCount",
    query: { refetchInterval: 15000 },
  });

  const totalVaults = vaultCount ? Number(vaultCount) : 0;

  return (
    <div className="pageContainer">
      <div className="pageHeader">
        <Compass size={20} />
        <h1>Protocol Explorer</h1>
        <span className="pageSubtitle">KinVault on Mezo Testnet (31611)</span>
      </div>

      <div className="explorerStatsRow">
        <motion.div
          className="explorerStat"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
        >
          <LockKeyhole size={20} />
          <span className="explorerStatValue">{totalVaults}</span>
          <span className="explorerStatLabel">Vaults created</span>
        </motion.div>

        <motion.div
          className="explorerStat"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06, ease }}
        >
          <TrendingUp size={20} />
          <span className="explorerStatValue">{fmtUsd(btcPrice)}</span>
          <span className="explorerStatLabel">BTC price (oracle)</span>
        </motion.div>

        <motion.div
          className="explorerStat"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12, ease }}
        >
          <span className="explorerStatValue">
            {risk.borrowingRate !== undefined
              ? `${(Number(risk.borrowingRate) / 1e16).toFixed(2)}%`
              : "—"}
          </span>
          <span className="explorerStatLabel">Borrow rate</span>
        </motion.div>

        <motion.div
          className="explorerStat"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.18, ease }}
        >
          <span className="explorerStatValue">
            {risk.mcr !== undefined
              ? `${(Number(risk.mcr) / 1e16).toFixed(0)}%`
              : "—"}
          </span>
          <span className="explorerStatLabel">Min collateral</span>
        </motion.div>
      </div>

      <motion.div
        className="card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease }}
      >
        <h3 className="cardTitle">Mezo MUSD Parameters</h3>
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
            <dt>Min collateral ratio</dt>
            <dd>
              {risk.mcr !== undefined
                ? `${(Number(risk.mcr) / 1e16).toFixed(0)}%`
                : "—"}
            </dd>
          </div>
        </dl>
      </motion.div>

      <motion.div
        className="card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.28, ease }}
        style={{ marginTop: 16 }}
      >
        <h3 className="cardTitle">Contracts</h3>
        <dl className="statGrid">
          <div>
            <dt>Factory</dt>
            <dd>
              <a
                href={explorerAddress(MEZO_ADDRESSES.factory)}
                target="_blank"
                rel="noreferrer"
              >
                {shortAddress(MEZO_ADDRESSES.factory)}{" "}
                <ExternalLink size={11} />
              </a>
            </dd>
          </div>
          <div>
            <dt>BorrowerOperations</dt>
            <dd>
              <a
                href={explorerAddress(MEZO_ADDRESSES.borrowerOperations)}
                target="_blank"
                rel="noreferrer"
              >
                {shortAddress(MEZO_ADDRESSES.borrowerOperations)}{" "}
                <ExternalLink size={11} />
              </a>
            </dd>
          </div>
          <div>
            <dt>PriceFeed</dt>
            <dd>
              <a
                href={explorerAddress(MEZO_ADDRESSES.priceFeed)}
                target="_blank"
                rel="noreferrer"
              >
                {shortAddress(MEZO_ADDRESSES.priceFeed)}{" "}
                <ExternalLink size={11} />
              </a>
            </dd>
          </div>
          <div>
            <dt>MUSD Token</dt>
            <dd>
              <a
                href={explorerAddress(MEZO_ADDRESSES.musd)}
                target="_blank"
                rel="noreferrer"
              >
                {shortAddress(MEZO_ADDRESSES.musd)} <ExternalLink size={11} />
              </a>
            </dd>
          </div>
        </dl>
      </motion.div>
    </div>
  );
}
