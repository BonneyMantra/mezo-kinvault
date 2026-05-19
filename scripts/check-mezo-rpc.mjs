const rpcUrl = process.env.MEZO_RPC_URL ?? "https://rpc.test.mezo.org";
const musdAddress = process.env.MEZO_MUSD ?? "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503";

async function rpc(method, params = []) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: method, method, params }),
  });

  if (!response.ok) {
    throw new Error(`${method} HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (payload.error) {
    throw new Error(`${method} RPC error: ${payload.error.message}`);
  }
  return payload.result;
}

function decodeString(hex) {
  const clean = hex.replace(/^0x/, "");
  const length = Number.parseInt(clean.slice(64, 128), 16);
  const data = clean.slice(128, 128 + length * 2);
  return Buffer.from(data, "hex").toString("utf8");
}

function decodeUint8(hex) {
  return Number.parseInt(hex, 16);
}

const chainIdHex = await rpc("eth_chainId");
const blockNumberHex = await rpc("eth_blockNumber");
const symbolHex = await rpc("eth_call", [{ to: musdAddress, data: "0x95d89b41" }, "latest"]);
const decimalsHex = await rpc("eth_call", [{ to: musdAddress, data: "0x313ce567" }, "latest"]);

const chainId = Number.parseInt(chainIdHex, 16);
const blockNumber = Number.parseInt(blockNumberHex, 16);
const symbol = decodeString(symbolHex);
const decimals = decodeUint8(decimalsHex);

if (chainId !== 31611) {
  throw new Error(`Expected Mezo Testnet chainId 31611, got ${chainId}`);
}
if (symbol !== "MUSD") {
  throw new Error(`Expected MUSD symbol, got ${symbol}`);
}
if (decimals !== 18) {
  throw new Error(`Expected 18 decimals, got ${decimals}`);
}

console.log(
  JSON.stringify(
    {
      rpcUrl,
      chainId,
      blockNumber,
      musdAddress,
      symbol,
      decimals,
      status: "mezo-read-only-rpc-proven",
    },
    null,
    2,
  ),
);
