interface Env {
  VAULT_META: KVNamespace;
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
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // GET /vault/:address — read vault metadata
    const getMatch = path.match(/^\/vault\/(0x[a-fA-F0-9]{40})$/);
    if (getMatch && request.method === "GET") {
      const addr = getMatch[1].toLowerCase();
      const data = await env.VAULT_META.get(`vault:${addr}`, "json");
      if (!data) {
        return new Response(JSON.stringify({ error: "not found" }), {
          status: 404,
          headers: { ...CORS, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(data), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // PUT /vault/:address — save vault metadata
    if (getMatch && request.method === "PUT") {
      const addr = getMatch[1].toLowerCase();
      const body = (await request.json()) as Partial<VaultMeta>;
      if (!body.name) {
        return new Response(JSON.stringify({ error: "name required" }), {
          status: 400,
          headers: { ...CORS, "Content-Type": "application/json" },
        });
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

      // Also index by owner for listing
      if (meta.owner) {
        const ownerKey = `owner:${meta.owner.toLowerCase()}`;
        const existing = ((await env.VAULT_META.get(ownerKey, "json")) ??
          []) as string[];
        if (!existing.includes(addr)) {
          existing.push(addr);
          await env.VAULT_META.put(ownerKey, JSON.stringify(existing));
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify(metas.filter(Boolean)), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "not found" }), {
      status: 404,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  },
};
