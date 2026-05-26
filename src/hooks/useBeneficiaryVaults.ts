import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { FACTORY_ABI, KINVAULT_ABI, MEZO_ADDRESSES } from "../lib/contracts";

const RPC = "https://rpc.test.mezo.org";

async function ethCall(to: string, data: string): Promise<string> {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });
  const json = (await res.json()) as { result?: string };
  return json.result ?? "0x";
}

export type BenVault = {
  vault: `0x${string}`;
  bps: number;
  balance: bigint;
  released: boolean;
  canRelease: boolean;
};

export function useBeneficiaryVaults() {
  const { address } = useAccount();
  const [vaults, setVaults] = useState<BenVault[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { data: vaultCount } = useReadContract({
    address: MEZO_ADDRESSES.factory,
    abi: FACTORY_ABI,
    functionName: "vaultCount",
    query: { refetchInterval: 15000 },
  });

  useEffect(() => {
    if (!address || vaultCount === undefined) return;

    const count = Number(vaultCount);
    if (count === 0) {
      setVaults([]);
      setIsLoading(false);
      return;
    }

    (async () => {
      setIsLoading(true);
      const found: BenVault[] = [];
      const addrLower = address.toLowerCase().slice(2).padStart(64, "0");

      for (let i = 0; i < count; i++) {
        const idxHex = i.toString(16).padStart(64, "0");

        // getVault(i) selector: 0x9403b634
        const vaultResult = await ethCall(
          MEZO_ADDRESSES.factory,
          `0x9403b634${idxHex}`,
        );
        const vaultAddr = ("0x" + vaultResult.slice(26, 66)) as `0x${string}`;

        // beneficiaryCount() => 0x734b2a7c
        const benCountResult = await ethCall(vaultAddr, "0x734b2a7c");
        const benCount = parseInt(benCountResult, 16);

        let myBps = 0;
        for (let j = 0; j < benCount; j++) {
          const jHex = j.toString(16).padStart(64, "0");
          // getBeneficiary(uint256) => 0x302df083
          const benResult = await ethCall(vaultAddr, `0x302df083${jHex}`);
          const benAddr = benResult.slice(26, 66).toLowerCase();
          if (benAddr === addrLower) {
            const bpsHex = benResult.slice(66, 130);
            myBps = parseInt(bpsHex, 16);
            break;
          }
        }

        if (myBps > 0) {
          // vaultBalance() => 0x0bf6cc08
          const balResult = await ethCall(vaultAddr, "0x0bf6cc08");
          const balance = BigInt(balResult || "0x0");

          // released() => 0x96132521
          const relResult = await ethCall(vaultAddr, "0x96132521");
          const released = parseInt(relResult, 16) === 1;

          // canRelease() => 0x3705f69e
          const canResult = await ethCall(vaultAddr, "0x3705f69e");
          const canRelease = parseInt(canResult, 16) === 1;

          found.push({
            vault: vaultAddr,
            bps: myBps,
            balance,
            released,
            canRelease,
          });
        }
      }

      setVaults(found);
      setIsLoading(false);
    })();
  }, [address, vaultCount]);

  return { vaults, isLoading, refetch: () => {} };
}
