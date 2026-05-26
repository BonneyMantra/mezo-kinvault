import { motion } from "motion/react";
import {
  Activity,
  CheckCircle2,
  Droplet,
  ExternalLink,
  HeartPulse,
  LockKeyhole,
  Plus,
  PlusCircle,
  RotateCcw,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useBalance,
  useReadContract,
  useSimulateContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import { shortAddress } from "../../lib/proof";
import { KINVAULT_ABI, FACTORY_ABI, MEZO_ADDRESSES } from "../../lib/contracts";
import { useKinVaultState, useBeneficiaries } from "../../hooks/useKinVault";
import { useBtcPrice } from "../../hooks/useBtcPrice";
import { CollateralHealth } from "../dashboard/CollateralHealth";
import { BeneficiaryCards } from "../dashboard/BeneficiaryCards";
import {
  saveVaultMeta,
  getVaultsByOwnerMeta,
  type VaultMetaWithAddress,
} from "../../lib/vaultMeta";
import { VaultDetailPage } from "./VaultDetailPage";

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
const fmtUsd = (p: bigint | undefined) =>
  p
    ? `$${Number(formatEther(p)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : "$0";
const fmtTimer = (s: number) => {
  const safe = Math.max(0, s);
  return `${Math.floor(safe / 60)
    .toString()
    .padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`;
};

const COVER_IMAGES = [
  "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&h=200&fit=crop",
  "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=600&h=200&fit=crop",
  "https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=600&h=200&fit=crop",
  "https://images.unsplash.com/photo-1642104704074-907c0698cbd9?w=600&h=200&fit=crop",
];

type BenEntry = {
  address: string;
  pct: string;
  name: string;
  email: string;
  privacy: boolean;
};
type CreateStep = "details" | "beneficiaries" | "deploying" | "done";

export function MyVaultsPage({
  passportEnabled,
}: {
  passportEnabled: boolean;
}) {
  const { address } = useAccount();
  const { data: nativeBalance } = useBalance({
    address,
    query: { refetchInterval: 10000 },
  });
  const { price: btcPrice } = useBtcPrice();

  const balanceLoaded = nativeBalance !== undefined;
  const insufficientGas = balanceLoaded && nativeBalance.value < GAS_FLOOR;

  // Factory vault list
  const { data: myVaultsRaw, refetch: refetchMyVaults } = useReadContract({
    address: MEZO_ADDRESSES.factory,
    abi: FACTORY_ABI,
    functionName: "getVaultsByOwner",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const userVaults = (myVaultsRaw as `0x${string}`[]) ?? [];

  // Off-chain metadata
  const [vaultMetas, setVaultMetas] = useState<VaultMetaWithAddress[]>([]);
  useEffect(() => {
    if (!address) return;
    getVaultsByOwnerMeta(address).then(setVaultMetas);
  }, [address, userVaults.length]);

  // Currently selected vault for management
  const [selectedVault, setSelectedVault] = useState<`0x${string}` | null>(
    null,
  );

  // Create vault flow state
  const [creating, setCreating] = useState(false);
  const [createStep, setCreateStep] = useState<CreateStep>("details");
  const [vaultName, setVaultName] = useState("");
  const [vaultDesc, setVaultDesc] = useState("");
  const [coverImg, setCoverImg] = useState(COVER_IMAGES[0]);
  const [heartbeatInput, setHeartbeatInput] = useState("60");
  const [pendingBens, setPendingBens] = useState<BenEntry[]>([
    { address: "", pct: "", name: "", email: "", privacy: false },
  ]);
  const [createStatus, setCreateStatus] = useState("");
  const [newVaultAddress, setNewVaultAddress] = useState<string | null>(null);

  const addBenRow = () =>
    setPendingBens((b) => [
      ...b,
      { address: "", pct: "", name: "", email: "", privacy: false },
    ]);
  const removeBenRow = (i: number) =>
    setPendingBens((b) => b.filter((_, idx) => idx !== i));
  const updateBen = (i: number, field: keyof BenEntry, val: string | boolean) =>
    setPendingBens((b) =>
      b.map((entry, idx) => (idx === i ? { ...entry, [field]: val } : entry)),
    );

  const totalPct = pendingBens.reduce(
    (sum, b) => sum + (parseFloat(b.pct) || 0),
    0,
  );
  const pctToBps = (pct: string) => Math.round((parseFloat(pct) || 0) * 100);
  const bensValid =
    pendingBens.length > 0 &&
    pendingBens.every(
      (b) =>
        b.address.startsWith("0x") &&
        b.address.length === 42 &&
        parseFloat(b.pct) > 0 &&
        (b.privacy || b.name.trim().length > 0),
    ) &&
    Math.abs(totalPct - 100) < 0.01;

  // Factory + beneficiary write
  const { writeContractAsync } = useWriteContract();

  const doCreateVault = async () => {
    const interval = parseInt(heartbeatInput);
    if (!interval || interval <= 0) return;

    setCreateStep("deploying");
    setCreateStatus("Step 1: Deploying vault contract...");

    try {
      const { waitForTransactionReceipt } = await import("wagmi/actions");
      const { getConfig } = await import("../../../src/lib/mezo");

      const factoryHash = await writeContractAsync({
        address: MEZO_ADDRESSES.factory,
        abi: FACTORY_ABI,
        functionName: "createVault",
        args: [BigInt(interval)],
        gas: 2_500_000n,
      });

      setCreateStatus("Waiting for vault deployment confirmation...");

      const config = (await import("wagmi")).useConfig ? undefined : undefined;

      // Poll for receipt via fetch since we can't use wagmi actions easily
      let createdAddr: string | null = null;
      let attempts = 0;
      while (!createdAddr && attempts < 30) {
        attempts++;
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const res = await fetch("https://rpc.test.mezo.org", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "eth_getTransactionReceipt",
              params: [factoryHash],
            }),
          });
          const json = (await res.json()) as {
            result?: {
              status: string;
              logs: { topics: string[]; data: string }[];
            };
          };
          if (json.result && json.result.status === "0x1") {
            const log = json.result.logs.find(
              (l) =>
                l.topics[0] ===
                "0x0b045af6aff86dd2cda5342fd0329a354dc66759ff1eda00d7ecf13a76c7fb3b",
            );
            if (log) {
              createdAddr = "0x" + log.data.slice(26, 66);
            }
          }
        } catch {
          // retry
        }
      }

      if (!createdAddr) {
        setCreateStatus("Error: could not find vault address in receipt");
        return;
      }

      setNewVaultAddress(createdAddr);
      const vaultAddr = createdAddr as `0x${string}`;

      // Save metadata to Cloudflare
      const benMeta = pendingBens
        .filter((b) => !b.privacy && b.name)
        .map((b) => ({ address: b.address, name: b.name, email: b.email }));

      await saveVaultMeta(createdAddr, {
        name: vaultName,
        description: vaultDesc,
        coverImage: coverImg,
        owner: address!,
        chainId: 31611,
      });

      // Add beneficiaries on-chain
      const validBens = pendingBens.filter(
        (b) =>
          b.address.startsWith("0x") &&
          b.address.length === 42 &&
          parseFloat(b.pct) > 0,
      );

      for (let i = 0; i < validBens.length; i++) {
        const b = validBens[i];
        const bps = Math.round(parseFloat(b.pct) * 100);
        setCreateStatus(
          `Step 2: Adding beneficiary ${i + 1}/${validBens.length}...`,
        );

        const benHash = await writeContractAsync({
          address: vaultAddr,
          abi: KINVAULT_ABI,
          functionName: "addBeneficiary",
          args: [b.address as `0x${string}`, bps],
          gas: 200_000n,
        });

        // Wait for confirmation
        let confirmed = false;
        let benAttempts = 0;
        while (!confirmed && benAttempts < 20) {
          benAttempts++;
          await new Promise((r) => setTimeout(r, 2000));
          try {
            const res = await fetch("https://rpc.test.mezo.org", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "eth_getTransactionReceipt",
                params: [benHash],
              }),
            });
            const json = (await res.json()) as {
              result?: { status: string };
            };
            if (json.result?.status === "0x1") confirmed = true;
          } catch {
            // retry
          }
        }
      }

      setCreateStep("done");
      setCreateStatus("Vault deployed with beneficiaries!");
      refetchMyVaults();
    } catch (err) {
      setCreateStep("beneficiaries");
      setCreateStatus(
        `Error: ${err instanceof Error ? err.message.slice(0, 120) : "Unknown error"}`,
      );
    }
  };

  // For managing a selected vault — read its state
  const vault = useKinVaultState();
  const benCount = vault.beneficiaryCount ? Number(vault.beneficiaryCount) : 0;
  const { beneficiaries, refetch: refetchBens } = useBeneficiaries(benCount);

  const resetCreate = () => {
    setCreating(false);
    setCreateStep("details");
    setVaultName("");
    setVaultDesc("");
    setCoverImg(COVER_IMAGES[0]);
    setHeartbeatInput("60");
    setPendingBens([
      { address: "", pct: "", name: "", email: "", privacy: false },
    ]);
    setCreateStatus("");
    setNewVaultAddress(null);
  };

  // ─── Render: Vault Detail ───
  if (selectedVault) {
    const selectedMeta = vaultMetas.find(
      (m) => m.address.toLowerCase() === selectedVault.toLowerCase(),
    );
    return (
      <VaultDetailPage
        vaultAddress={selectedVault}
        meta={selectedMeta}
        onBack={() => setSelectedVault(null)}
      />
    );
  }

  // ─── Render: Create Flow ───
  if (creating) {
    return (
      <div className="pageContainer">
        <div className="pageHeader">
          <LockKeyhole size={20} />
          <h1>Create Vault</h1>
          {createStep !== "deploying" && createStep !== "done" && (
            <button
              className="actionBtn"
              type="button"
              onClick={resetCreate}
              style={{ marginLeft: "auto" }}
            >
              Cancel
            </button>
          )}
        </div>

        {createStep === "details" && (
          <motion.div
            className="card createFormCard"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease }}
          >
            <h3 className="cardTitle">Vault Details</h3>

            <div className="formGroup">
              <label>Vault name</label>
              <input
                type="text"
                placeholder="e.g. Family Emergency Fund"
                value={vaultName}
                onChange={(e) => setVaultName(e.target.value)}
              />
            </div>

            <div className="formGroup">
              <label>Description</label>
              <textarea
                placeholder="What is this vault for?"
                value={vaultDesc}
                onChange={(e) => setVaultDesc(e.target.value)}
                rows={3}
              />
            </div>

            <div className="formGroup">
              <label>Cover image</label>
              <div className="coverPicker">
                {COVER_IMAGES.map((img) => (
                  <button
                    key={img}
                    type="button"
                    className={`coverOption ${coverImg === img ? "selected" : ""}`}
                    onClick={() => setCoverImg(img)}
                  >
                    <img src={img} alt="" />
                  </button>
                ))}
              </div>
            </div>

            <div className="formGroup">
              <label>Check-in interval (seconds)</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="60"
                value={heartbeatInput}
                onChange={(e) =>
                  setHeartbeatInput(e.target.value.replace(/[^0-9]/g, ""))
                }
              />
              <span className="formHint">
                Demo: 60s. Production: 2592000 (30 days).
              </span>
            </div>

            <button
              className="actionBtn createVaultBtn"
              type="button"
              disabled={!vaultName.trim() || !heartbeatInput}
              onClick={() => setCreateStep("beneficiaries")}
            >
              Next: Add Beneficiaries
            </button>
          </motion.div>
        )}

        {createStep === "beneficiaries" && (
          <motion.div
            className="card createFormCard"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease }}
          >
            <h3 className="cardTitle">
              <Users size={16} /> Beneficiaries
            </h3>
            <p className="formDesc">
              Add beneficiaries with their wallet address and share percentage.
              Total must equal exactly 100%.
            </p>

            <div className="benFormList">
              {pendingBens.map((b, i) => (
                <div key={i} className="benFormCard">
                  <div className="benFormCardHeader">
                    <span className="benFormNum">#{i + 1}</span>
                    {pendingBens.length > 1 && (
                      <button
                        className="benRemoveBtn"
                        type="button"
                        onClick={() => removeBenRow(i)}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="benPrivacyRow">
                    <label className="privacyToggle">
                      <input
                        type="checkbox"
                        checked={b.privacy}
                        onChange={(e) =>
                          updateBen(i, "privacy", e.target.checked)
                        }
                      />
                      <span className="toggleTrack" />
                    </label>
                    <span className="privacyLabel">
                      {b.privacy
                        ? "Address only (private)"
                        : "Include name & email"}
                    </span>
                  </div>

                  {!b.privacy && (
                    <div className="benNameRow">
                      <input
                        type="text"
                        placeholder="Name"
                        value={b.name}
                        onChange={(e) => updateBen(i, "name", e.target.value)}
                        className="benNameInput"
                      />
                      <input
                        type="email"
                        placeholder="Email (optional)"
                        value={b.email}
                        onChange={(e) => updateBen(i, "email", e.target.value)}
                        className="benEmailInput"
                      />
                    </div>
                  )}

                  <div className="benAddrPctRow">
                    <input
                      type="text"
                      placeholder="0x wallet address"
                      value={b.address}
                      onChange={(e) => updateBen(i, "address", e.target.value)}
                      className="benAddrInput"
                    />
                    <div className="pctInputWrap">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={b.pct}
                        onChange={(e) =>
                          updateBen(
                            i,
                            "pct",
                            e.target.value.replace(/[^0-9.]/g, ""),
                          )
                        }
                        className="benPctInput"
                      />
                      <span className="pctSuffix">%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="benFormActions">
              <button className="actionBtn" type="button" onClick={addBenRow}>
                <Plus size={14} /> Add beneficiary
              </button>
              <span
                className={`bpsTotalBadge ${Math.abs(totalPct - 100) < 0.01 ? "valid" : totalPct > 100 ? "over" : ""}`}
              >
                {totalPct.toFixed(1)}% / 100%
              </span>
            </div>

            <p className="formHint" style={{ textAlign: "center" }}>
              Deploying costs only gas (negligible). BTC deposit happens after
              creation.
            </p>

            <div className="createNavRow">
              <button
                className="actionBtn"
                type="button"
                onClick={() => setCreateStep("details")}
              >
                Back
              </button>
              <button
                className="actionBtn createVaultBtn"
                type="button"
                disabled={insufficientGas || !bensValid}
                onClick={doCreateVault}
              >
                <PlusCircle size={16} /> Deploy Vault
              </button>
            </div>

            {insufficientGas && (
              <div className="faucetBanner" style={{ marginTop: 12 }}>
                <Droplet size={14} />
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
          </motion.div>
        )}

        {createStep === "deploying" && (
          <motion.div
            className="card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "48px 24px",
              gap: 16,
            }}
          >
            <HeartPulse size={32} className="spinPulse" />
            <h3>{createStatus}</h3>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              Confirm the transaction in your wallet. This only costs gas
              (negligible on Mezo Testnet). No BTC deposit is needed now — you
              can deposit BTC after your vault is created.
            </p>
          </motion.div>
        )}

        {createStep === "done" && newVaultAddress && (
          <motion.div
            className="card"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "48px 24px",
              gap: 16,
              textAlign: "center",
            }}
          >
            <CheckCircle2 size={40} style={{ color: "var(--moss)" }} />
            <h2>Vault created!</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
              <strong>{vaultName}</strong> is live on Mezo Testnet.
            </p>
            <code className="emptyCode">{newVaultAddress}</code>
            <a
              href={`https://explorer.test.mezo.org/address/${newVaultAddress}`}
              target="_blank"
              rel="noreferrer"
              className="actionBtn"
              style={{ marginTop: 8 }}
            >
              <ExternalLink size={14} /> View on Explorer
            </a>
            <button
              className="actionBtn createVaultBtn"
              type="button"
              onClick={resetCreate}
              style={{ marginTop: 4 }}
            >
              Done
            </button>
          </motion.div>
        )}
      </div>
    );
  }

  // ─── Render: Vault List ───
  return (
    <div className="pageContainer">
      <div className="pageHeader">
        <LockKeyhole size={20} />
        <h1>My Vaults</h1>
        <button
          className="actionBtn createVaultBtn"
          type="button"
          onClick={() => setCreating(true)}
          style={{ marginLeft: "auto" }}
        >
          <PlusCircle size={15} /> New Vault
        </button>
      </div>

      {userVaults.length === 0 ? (
        <motion.div
          className="emptyPage"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          <div className="emptyIcon">
            <PlusCircle size={40} />
          </div>
          <h2>No vaults yet</h2>
          <p>
            Create your first vault to start protecting your Bitcoin
            inheritance.
          </p>
          <button
            className="actionBtn createVaultBtn"
            type="button"
            onClick={() => setCreating(true)}
          >
            <PlusCircle size={16} /> Create Vault
          </button>
        </motion.div>
      ) : (
        <div className="vaultGrid">
          {userVaults.map((vaultAddr, i) => {
            const meta = vaultMetas.find(
              (m) => m.address.toLowerCase() === vaultAddr.toLowerCase(),
            );
            return (
              <motion.div
                key={vaultAddr}
                className="vaultCard"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08, ease }}
                onClick={() => setSelectedVault(vaultAddr)}
              >
                <div
                  className="vaultCardCover"
                  style={{
                    backgroundImage: `url(${meta?.coverImage || COVER_IMAGES[i % COVER_IMAGES.length]})`,
                  }}
                />
                <div className="vaultCardBody">
                  <h3>{meta?.name || `Vault ${i + 1}`}</h3>
                  <p className="vaultCardDesc">
                    {meta?.description || "No description"}
                  </p>
                  <div className="vaultCardMeta">
                    <span>{shortAddress(vaultAddr)}</span>
                    <a
                      href={`https://explorer.test.mezo.org/address/${vaultAddr}`}
                      target="_blank"
                      rel="noreferrer"
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
