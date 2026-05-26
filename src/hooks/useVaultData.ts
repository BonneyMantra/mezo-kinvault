import { useEffect, useState } from "react";
import { usePublicClient, useReadContracts } from "wagmi";
import {
  KINVAULT_ABI,
  TROVE_MANAGER_ABI,
  ERC20_ABI,
  MEZO_ADDRESSES,
} from "../lib/contracts";
import { PROOF } from "../lib/proof";

const vaultAddress = MEZO_ADDRESSES.kinVault;
const MCR = 11n * 10n ** 17n; // 110%

export type VaultEvent = {
  name: string;
  args: Record<string, unknown>;
  block: bigint;
  tx: `0x${string}`;
  ts: number;
  logIndex: number;
};

/** Decoded on-chain event history for the vault (deploy block → latest). */
export function useActivityFeed() {
  const client = usePublicClient();
  const [events, setEvents] = useState<VaultEvent[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!client) return;
      try {
        const logs = await client.getContractEvents({
          address: vaultAddress,
          abi: KINVAULT_ABI,
          fromBlock: PROOF.deployBlock,
          toBlock: "latest",
        });
        const uniqueBlocks = [...new Set(logs.map((l) => l.blockNumber))];
        const tsByBlock = new Map<string, number>();
        await Promise.all(
          uniqueBlocks.map(async (b) => {
            if (b === null) return;
            const blk = await client.getBlock({ blockNumber: b });
            tsByBlock.set(String(b), Number(blk.timestamp));
          }),
        );
        const items: VaultEvent[] = logs
          .map((l) => ({
            name: (l as { eventName?: string }).eventName ?? "Event",
            args: ((l as { args?: Record<string, unknown> }).args ??
              {}) as Record<string, unknown>,
            block: l.blockNumber ?? 0n,
            tx: l.transactionHash ?? ("0x" as `0x${string}`),
            ts: tsByBlock.get(String(l.blockNumber)) ?? 0,
            logIndex: l.logIndex ?? 0,
          }))
          .sort((a, b) =>
            a.block === b.block
              ? b.logIndex - a.logIndex
              : Number(b.block - a.block),
          );
        if (active) setEvents(items);
      } catch {
        if (active) setEvents([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [client]);

  return { events, isLoading };
}

/** Live Mezo trove health for the vault: collateral ratio + liquidation price. */
export function useTroveHealth(
  price: bigint | undefined,
  vault?: `0x${string}`,
) {
  const target = vault ?? vaultAddress;
  const result = useReadContracts({
    contracts: [
      {
        address: MEZO_ADDRESSES.troveManager as `0x${string}`,
        abi: TROVE_MANAGER_ABI,
        functionName: "getEntireDebtAndColl",
        args: [target],
      },
      {
        address: MEZO_ADDRESSES.troveManager as `0x${string}`,
        abi: TROVE_MANAGER_ABI,
        functionName: "getTroveStatus",
        args: [target],
      },
    ],
    query: { refetchInterval: 15000 },
  });

  const [dc, status] = result.data ?? [];
  const r = dc?.result as readonly bigint[] | undefined;
  const coll = r?.[0];
  const debt = r ? r[1] + r[2] : undefined; // principal + interest
  const troveStatus = status?.result as bigint | undefined;
  const isActive = troveStatus === 1n;

  const icr =
    coll !== undefined && debt && price && debt > 0n
      ? (coll * price) / debt
      : undefined;
  const liquidationPrice =
    coll && debt && coll > 0n ? (debt * MCR) / coll : undefined;

  return {
    coll,
    debt,
    icr,
    liquidationPrice,
    troveStatus,
    isActive,
    isError: result.isError,
    isLoading: result.isLoading,
  };
}

/** Per-beneficiary rehearsal status + MUSD actually received. */
export function useBeneficiaryDetails(
  beneficiaries: { addr: `0x${string}`; bps: number }[],
  vault?: `0x${string}`,
) {
  const target = vault ?? vaultAddress;
  const contracts = beneficiaries.flatMap((b) => [
    {
      address: target,
      abi: KINVAULT_ABI,
      functionName: "hasRehearsed" as const,
      args: [b.addr] as const,
    },
    {
      address: MEZO_ADDRESSES.musd as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf" as const,
      args: [b.addr] as const,
    },
  ]);

  const result = useReadContracts({
    contracts,
    query: { enabled: beneficiaries.length > 0, refetchInterval: 15000 },
  });

  const data = result.data ?? [];
  const details = beneficiaries.map((b, i) => ({
    ...b,
    hasRehearsed: data[i * 2]?.result as boolean | undefined,
    musdReceived: data[i * 2 + 1]?.result as bigint | undefined,
  }));

  return { details, isLoading: result.isLoading };
}
