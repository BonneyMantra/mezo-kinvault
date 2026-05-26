interface Env {
  VAULT_META: KVNamespace;
  DEPLOYER_KEY: string;
}

interface VaultMeta {
  name: string;
  description: string;
  coverImage: string;
  owner: string;
  chainId: number;
  createdAt: string;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const RPC = "https://rpc.test.mezo.org";
const RELEASE_SELECTOR = "0x86d1a69f"; // release()

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function rpcCall(method: string, params: unknown[]) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return (await res.json()) as { result?: string; error?: { message: string } };
}

async function signAndSend(
  key: string,
  to: string,
  data: string,
  gasLimit: bigint,
): Promise<{ hash?: string; error?: string }> {
  const { createWalletClient, http, defineChain } = await import("viem");
  const { privateKeyToAccount } = await import("viem/accounts");

  const mezoTestnet = defineChain({
    id: 31611,
    name: "Mezo Testnet",
    nativeCurrency: { name: "BTC", symbol: "BTC", decimals: 18 },
    rpcUrls: { default: { http: [RPC] } },
  });

  const account = privateKeyToAccount(
    (key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`,
  );
  const client = createWalletClient({
    account,
    chain: mezoTestnet,
    transport: http(RPC),
  });

  try {
    const hash = await client.sendTransaction({
      to: to as `0x${string}`,
      data: data as `0x${string}`,
      gas: gasLimit,
    });
    return { hash };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Transaction failed",
    };
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // POST /release/:vaultAddress — relay release tx via deployer key
    const releaseMatch = path.match(/^\/release\/(0x[a-fA-F0-9]{40})$/);
    if (releaseMatch && request.method === "POST") {
      const vaultAddr = releaseMatch[1];

      if (!env.DEPLOYER_KEY) {
        return json({ error: "Deployer key not configured" }, 500);
      }

      // Verify the vault can be released by calling canRelease()
      const canReleaseRes = await rpcCall("eth_call", [
        { to: vaultAddr, data: "0x3705f69e" },
        "latest",
      ]);
      const canRelease =
        canReleaseRes.result && parseInt(canReleaseRes.result, 16) === 1;

      if (!canRelease) {
        return json({ error: "Vault cannot be released yet" }, 400);
      }

      const result = await signAndSend(
        env.DEPLOYER_KEY,
        vaultAddr,
        RELEASE_SELECTOR,
        5_000_000n,
      );

      if (result.error) {
        return json({ error: result.error }, 500);
      }

      // Log the release tx
      await env.VAULT_META.put(
        `release:${vaultAddr.toLowerCase()}`,
        JSON.stringify({
          txHash: result.hash,
          releasedAt: new Date().toISOString(),
          relayedBy: "kinvault-meta-worker",
        }),
      );

      return json({ ok: true, txHash: result.hash });
    }

    // GET /vault/:address — read vault metadata
    const getMatch = path.match(/^\/vault\/(0x[a-fA-F0-9]{40})$/);
    if (getMatch && request.method === "GET") {
      const addr = getMatch[1].toLowerCase();
      const data = await env.VAULT_META.get(`vault:${addr}`, "json");
      if (!data) {
        return json({ error: "not found" }, 404);
      }
      return json(data);
    }

    // PUT /vault/:address — save vault metadata
    if (getMatch && request.method === "PUT") {
      const addr = getMatch[1].toLowerCase();
      const body = (await request.json()) as Partial<VaultMeta>;
      if (!body.name) {
        return json({ error: "name required" }, 400);
      }
      const meta: VaultMeta = {
        name: body.name,
        description: body.description ?? "",
        coverImage: body.coverImage ?? "",
        owner: body.owner ?? "",
        chainId: body.chainId ?? 31611,
        createdAt: body.createdAt ?? new Date().toISOString(),
      };
      await env.VAULT_META.put(`vault:${addr}`, JSON.stringify(meta));

      if (meta.owner) {
        const ownerKey = `owner:${meta.owner.toLowerCase()}`;
        const existing = ((await env.VAULT_META.get(ownerKey, "json")) ??
          []) as string[];
        if (!existing.includes(addr)) {
          existing.push(addr);
          await env.VAULT_META.put(ownerKey, JSON.stringify(existing));
        }
      }

      return json({ ok: true });
    }

    // GET /owner/:address — list vaults by owner
    const ownerMatch = path.match(/^\/owner\/(0x[a-fA-F0-9]{40})$/);
    if (ownerMatch && request.method === "GET") {
      const owner = ownerMatch[1].toLowerCase();
      const vaults = ((await env.VAULT_META.get(`owner:${owner}`, "json")) ??
        []) as string[];
      const metas = await Promise.all(
        vaults.map(async (v) => {
          const meta = (await env.VAULT_META.get(
            `vault:${v}`,
            "json",
          )) as VaultMeta | null;
          return meta ? { address: v, ...meta } : null;
        }),
      );
      return json(metas.filter(Boolean));
    }

    return json({ error: "not found" }, 404);
  },
};
