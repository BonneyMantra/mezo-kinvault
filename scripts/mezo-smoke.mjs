// Mezo Testnet read-only smoke test.
// Verifies the live MUSD/Liquity stack, the MEZO token, and that the
// deployed KinVault contract has code. No private key, no writes.
//
// Usage: node scripts/mezo-smoke.mjs
// Override KINVAULT to point at a freshly deployed address.

const rpcUrl = process.env.MEZO_RPC_URL ?? "https://rpc.test.mezo.org";
const ADDR = {
  musd: process.env.MEZO_MUSD ?? "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503",
  mezo: process.env.MEZO_TOKEN ?? "0x7B7c000000000000000000000000000000000001",
  borrowerOps:
    process.env.MEZO_BORROWER_OPS ?? "0xCdF7028ceAB81fA0C6971208e83fa7872994beE5",
  priceFeed:
    process.env.MEZO_PRICE_FEED ?? "0x86bCF0841622a5dAC14A313a15f96A95421b9366",
  kinVault:
    process.env.KINVAULT ?? "0x15ad9d57A5A6Fea6b7efdA228ef117a4A7ed9ef9",
};

// 4-byte selectors
const SEL = {
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
  fetchPrice: "0x0fdb11cf", // fetchPrice()
  minNetDebt: "0x969c2452", // minNetDebt()
  gasComp: "0x7af110ba", // MUSD_GAS_COMPENSATION()
  mcr: "0x794e5724", // MCR()
  borrowingRate: "0xb5b8453e", // borrowingRate()
  totalSupply: "0x18160ddd",
};

let id = 0;
async function rpc(method, params = []) {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
  });
  if (!res.ok) throw new Error(`${method} HTTP ${res.status}`);
  const payload = await res.json();
  if (payload.error) throw new Error(`${method}: ${payload.error.message}`);
  return payload.result;
}

const call = (to, data) => rpc("eth_call", [{ to, data }, "latest"]);
const decString = (hex) => {
  const c = hex.replace(/^0x/, "");
  const len = parseInt(c.slice(64, 128), 16);
  return Buffer.from(c.slice(128, 128 + len * 2), "hex").toString("utf8");
};
const decUint = (hex) => BigInt(hex);

const checks = [];
function assert(name, cond, detail) {
  checks.push({ name, ok: Boolean(cond), detail });
  if (!cond) console.error(`✗ ${name}: ${detail}`);
  else console.log(`✓ ${name}: ${detail}`);
}

const chainId = parseInt(await rpc("eth_chainId"), 16);
assert("chainId is 31611", chainId === 31611, String(chainId));

const blockNumber = parseInt(await rpc("eth_blockNumber"), 16);
assert("RPC reachable (block height)", blockNumber > 0, String(blockNumber));

const musdSymbol = decString(await call(ADDR.musd, SEL.symbol));
const musdDecimals = Number(decUint(await call(ADDR.musd, SEL.decimals)));
assert("MUSD symbol is MUSD", musdSymbol === "MUSD", musdSymbol);
assert("MUSD decimals is 18", musdDecimals === 18, String(musdDecimals));

const mezoSymbol = decString(await call(ADDR.mezo, SEL.symbol));
const mezoSupply = decUint(await call(ADDR.mezo, SEL.totalSupply));
assert("MEZO symbol is MEZO", mezoSymbol === "MEZO", mezoSymbol);
assert("MEZO totalSupply > 0", mezoSupply > 0n, mezoSupply.toString());

const price = decUint(await call(ADDR.priceFeed, SEL.fetchPrice));
assert("PriceFeed returns nonzero BTC price", price > 0n, `${price} (${Number(price) / 1e18} USD)`);

const minNetDebt = decUint(await call(ADDR.borrowerOps, SEL.minNetDebt));
const gasComp = decUint(await call(ADDR.borrowerOps, SEL.gasComp));
const mcr = decUint(await call(ADDR.borrowerOps, SEL.mcr));
const borrowingRate = decUint(await call(ADDR.borrowerOps, SEL.borrowingRate));
assert("BorrowerOperations.minNetDebt > 0", minNetDebt > 0n, `${Number(minNetDebt) / 1e18} MUSD`);
assert("BorrowerOperations.MUSD_GAS_COMPENSATION > 0", gasComp > 0n, `${Number(gasComp) / 1e18} MUSD`);
assert("BorrowerOperations.MCR is 110%", mcr === 1100000000000000000n, mcr.toString());
assert("BorrowerOperations.borrowingRate readable", borrowingRate >= 0n, `${Number(borrowingRate) / 1e16}%`);

const code = await rpc("eth_getCode", [ADDR.kinVault, "latest"]);
assert("Deployed KinVault has code", code && code !== "0x" && code.length > 2, `${(code.length - 2) / 2} bytes @ ${ADDR.kinVault}`);

const failed = checks.filter((c) => !c.ok);
console.log(
  "\n" +
    JSON.stringify(
      {
        rpcUrl,
        chainId,
        blockNumber,
        kinVault: ADDR.kinVault,
        passed: checks.length - failed.length,
        total: checks.length,
        status: failed.length === 0 ? "mezo-smoke-pass" : "mezo-smoke-FAIL",
      },
      null,
      2,
    ),
);
if (failed.length > 0) process.exit(1);
