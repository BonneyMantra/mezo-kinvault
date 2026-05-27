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

    // POST /create-vault — relay vault creation + beneficiary setup via deployer key
    if (path === "/create-vault" && request.method === "POST") {
      if (!env.DEPLOYER_KEY) {
        return json({ error: "Deployer key not configured" }, 500);
      }

      const body = (await request.json()) as {
        heartbeatInterval: number;
        beneficiaries: { address: string; bps: number }[];
        owner: string;
        name?: string;
        description?: string;
        coverImage?: string;
      };

      if (!body.heartbeatInterval || !body.beneficiaries?.length) {
        return json(
          { error: "heartbeatInterval and beneficiaries required" },
          400,
        );
      }

      const { createWalletClient, http, defineChain, encodeFunctionData } =
        await import("viem");
      const { privateKeyToAccount } = await import("viem/accounts");

      const mezoTestnet = defineChain({
        id: 31611,
        name: "Mezo Testnet",
        nativeCurrency: { name: "BTC", symbol: "BTC", decimals: 18 },
        rpcUrls: { default: { http: [RPC] } },
      });

      const key = env.DEPLOYER_KEY;
      const account = privateKeyToAccount(
        (key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`,
      );
      const client = createWalletClient({
        account,
        chain: mezoTestnet,
        transport: http(RPC),
      });

      try {
        // Step 1: Create vault via factory with user as owner
        const FACTORY = "0x8a2936AF2e8f17F64f1c63a278cB2cF1D4FD7e7C";
        const createData = encodeFunctionData({
          abi: [
            {
              type: "function",
              name: "createVaultFor",
              inputs: [
                { type: "address", name: "owner_" },
                { type: "uint256", name: "heartbeatInterval" },
              ],
              outputs: [{ type: "address" }],
              stateMutability: "nonpayable",
            },
          ],
          functionName: "createVaultFor",
          args: [body.owner as `0x${string}`, BigInt(body.heartbeatInterval)],
        });

        const createHash = await client.sendTransaction({
          to: FACTORY as `0x${string}`,
          data: createData,
          gas: 3_000_000n,
        });

        // Wait for receipt
        let vaultAddr: string | null = null;
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const res = await rpcCall("eth_getTransactionReceipt", [createHash]);
          if (res.result) {
            const receipt = res.result as unknown as {
              status: string;
              logs: { topics: string[]; data: string }[];
            };
            if (receipt.status !== "0x1") {
              return json({ error: "Vault creation reverted" }, 500);
            }
            const log = receipt.logs.find(
              (l: { topics: string[] }) =>
                l.topics[0] ===
                "0x0b045af6aff86dd2cda5342fd0329a354dc66759ff1eda00d7ecf13a76c7fb3b",
            );
            if (log) {
              vaultAddr = "0x" + log.data.slice(26, 66);
            }
            break;
          }
        }

        if (!vaultAddr) {
          return json(
            { error: "Could not find vault address", txHash: createHash },
            500,
          );
        }

        // Step 2: Add beneficiaries via factory (factory is the creator)
        const addBenViaFactoryAbi = [
          {
            type: "function" as const,
            name: "addBeneficiaryTo" as const,
            inputs: [
              { type: "address" as const, name: "vault_" },
              { type: "address" as const, name: "addr_" },
              { type: "uint16" as const, name: "bps_" },
            ],
            outputs: [],
            stateMutability: "nonpayable" as const,
          },
        ];

        const benHashes: string[] = [];
        for (const ben of body.beneficiaries) {
          const benData = encodeFunctionData({
            abi: addBenViaFactoryAbi,
            functionName: "addBeneficiaryTo",
            args: [
              vaultAddr as `0x${string}`,
              ben.address as `0x${string}`,
              ben.bps,
            ],
          });
          const benHash = await client.sendTransaction({
            to: FACTORY as `0x${string}`,
            data: benData,
            gas: 200_000n,
          });
          benHashes.push(benHash);
          await new Promise((r) => setTimeout(r, 3000));
        }

        // Step 3: Transfer ownership to the user
        // The vault owner is currently the deployer. We need to note this.
        // For hackathon: deployer stays as owner (they have the key)

        // Step 4: Save metadata
        if (body.name) {
          await env.VAULT_META.put(
            `vault:${vaultAddr.toLowerCase()}`,
            JSON.stringify({
              name: body.name,
              description: body.description ?? "",
              coverImage: body.coverImage ?? "",
              owner: body.owner ?? account.address,
              chainId: 31611,
              createdAt: new Date().toISOString(),
            }),
          );

          const ownerKey = `owner:${(body.owner ?? account.address).toLowerCase()}`;
          const existing = ((await env.VAULT_META.get(ownerKey, "json")) ??
            []) as string[];
          if (!existing.includes(vaultAddr.toLowerCase())) {
            existing.push(vaultAddr.toLowerCase());
            await env.VAULT_META.put(ownerKey, JSON.stringify(existing));
          }
        }

        return json({
          ok: true,
          vaultAddress: vaultAddr,
          createTxHash: createHash,
          beneficiaryTxHashes: benHashes,
        });
      } catch (err) {
        return json(
          { error: err instanceof Error ? err.message : "Creation failed" },
          500,
        );
      }
    }

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
