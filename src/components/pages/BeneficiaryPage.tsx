import { motion } from "motion/react";
import { Gift, ExternalLink, HeartPulse, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { formatEther } from "viem";
import { shortAddress } from "../../lib/proof";
import { useBtcPrice } from "../../hooks/useBtcPrice";
import {
  useBeneficiaryVaults,
  type BenVault,
} from "../../hooks/useBeneficiaryVaults";
import { getVaultMeta, type VaultMeta } from "../../lib/vaultMeta";
import { VaultDetailPage } from "./VaultDetailPage";

const ease = [0.22, 1, 0.36, 1] as const;

const fmtBtc = (wei: bigint) => Number(formatEther(wei)).toFixed(4);

function ManualVaultLookup({
  onFound,
}: {
  onFound: (addr: `0x${string}`) => void;
}) {
  const [input, setInput] = useState("");
  const isValid = input.startsWith("0x") && input.length === 42;
  return (
    <div className="manualLookup">
      <p
        style={{
          fontSize: "0.82rem",
          color: "var(--muted)",
          margin: "16px 0 8px",
        }}
      >
        Or enter a vault address directly:
      </p>
      <div className="depositRow" style={{ maxWidth: 420 }}>
        <input
          type="text"
          placeholder="0x vault address"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          className="actionBtn"
          type="button"
          disabled={!isValid}
          onClick={() => onFound(input as `0x${string}`)}
        >
          <Search size={15} /> Open vault
        </button>
      </div>
    </div>
  );
}

export function BeneficiaryPage() {
  const { vaults, isLoading } = useBeneficiaryVaults();
  const { price: btcPrice } = useBtcPrice();
  const [metas, setMetas] = useState<Record<string, VaultMeta>>({});
  const [selectedVault, setSelectedVault] = useState<`0x${string}` | null>(
    null,
  );

  useEffect(() => {
    vaults.forEach((v) => {
      if (!metas[v.vault]) {
        getVaultMeta(v.vault).then((m) => {
          if (m) setMetas((prev) => ({ ...prev, [v.vault]: m }));
        });
      }
    });
  }, [vaults]);

  if (selectedVault) {
    const meta = metas[selectedVault];
    return (
      <VaultDetailPage
        vaultAddress={selectedVault}
        meta={meta ? { ...meta, address: selectedVault } : undefined}
        onBack={() => setSelectedVault(null)}
      />
    );
  }

  return (
    <div className="pageContainer">
      <div className="pageHeader">
        <Gift size={20} />
        <h1>Beneficiary</h1>
        <span className="pageSubtitle">Vaults where you are a beneficiary</span>
      </div>

      {isLoading ? (
        <motion.div
          className="emptyPage"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <HeartPulse size={32} className="spinPulse" />
          <h2>Scanning vaults...</h2>
          <p>Checking all factory vaults for your address.</p>
        </motion.div>
      ) : vaults.length === 0 ? (
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
            Your connected wallet is not listed as a beneficiary in any vault.
            Make sure vault owners add your <strong>Passport address</strong>{" "}
            (shown in the sidebar) as the beneficiary.
          </p>
          <ManualVaultLookup onFound={(addr) => setSelectedVault(addr)} />
        </motion.div>
      ) : (
        <div className="vaultGrid">
          {vaults.map((v, i) => {
            const meta = metas[v.vault];
            return (
              <motion.div
                key={v.vault}
                className="vaultCard benVaultCard"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08, ease }}
                onClick={() => setSelectedVault(v.vault)}
              >
                <div className="benVaultHeader">
                  <span
                    className={`benVaultStatus ${v.released ? "released" : v.canRelease ? "claimable" : "active"}`}
                  >
                    {v.released
                      ? "Released"
                      : v.canRelease
                        ? "Claimable"
                        : "Active"}
                  </span>
                  <span className="benVaultPct">
                    {(v.bps / 100).toFixed(1)}%
                  </span>
                </div>
                <div className="vaultCardBody">
                  <h3>{meta?.name || shortAddress(v.vault)}</h3>
                  <p className="vaultCardDesc">
                    {meta?.description || "Vault"}
                  </p>
                  <div className="benVaultStats">
                    <span>{fmtBtc(v.balance)} BTC locked</span>
                    <a
                      href={`https://explorer.test.mezo.org/address/${v.vault}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
