const API_BASE = "https://kinvault-meta.gabrielaxy.workers.dev";

export interface VaultMeta {
  name: string;
  description: string;
  coverImage: string;
  owner: string;
  chainId: number;
  createdAt: string;
}

export interface VaultMetaWithAddress extends VaultMeta {
  address: string;
}

export async function getVaultMeta(
  vaultAddress: string,
): Promise<VaultMeta | null> {
  try {
    const res = await fetch(`${API_BASE}/vault/${vaultAddress.toLowerCase()}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function saveVaultMeta(
  vaultAddress: string,
  meta: Partial<VaultMeta>,
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/vault/${vaultAddress.toLowerCase()}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(meta),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getVaultsByOwnerMeta(
  ownerAddress: string,
): Promise<VaultMetaWithAddress[]> {
  try {
    const res = await fetch(`${API_BASE}/owner/${ownerAddress.toLowerCase()}`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function relayRelease(
  vaultAddress: string,
): Promise<{ txHash?: string; error?: string }> {
  try {
    const res = await fetch(
      `${API_BASE}/release/${vaultAddress.toLowerCase()}`,
      { method: "POST" },
    );
    const data = (await res.json()) as {
      ok?: boolean;
      txHash?: string;
      error?: string;
    };
    if (!res.ok || data.error) {
      return { error: data.error ?? "Release failed" };
    }
    return { txHash: data.txHash };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
