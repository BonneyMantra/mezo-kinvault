import { useReadContract, useReadContracts } from "wagmi";
import { KINVAULT_ABI, MEZO_ADDRESSES } from "../lib/contracts";

const vaultAddress = MEZO_ADDRESSES.kinVault;

export function useKinVaultState() {
  const result = useReadContracts({
    contracts: [
      {
        address: vaultAddress,
        abi: KINVAULT_ABI,
        functionName: "owner",
      },
      {
        address: vaultAddress,
        abi: KINVAULT_ABI,
        functionName: "released",
      },
      {
        address: vaultAddress,
        abi: KINVAULT_ABI,
        functionName: "lastHeartbeatAt",
      },
      {
        address: vaultAddress,
        abi: KINVAULT_ABI,
        functionName: "heartbeatInterval",
      },
      {
        address: vaultAddress,
        abi: KINVAULT_ABI,
        functionName: "vaultBalance",
      },
      {
        address: vaultAddress,
        abi: KINVAULT_ABI,
        functionName: "totalBps",
      },
      {
        address: vaultAddress,
        abi: KINVAULT_ABI,
        functionName: "beneficiaryCount",
      },
      {
        address: vaultAddress,
        abi: KINVAULT_ABI,
        functionName: "canRelease",
      },
      {
        address: vaultAddress,
        abi: KINVAULT_ABI,
        functionName: "releaseAt",
      },
    ],
    query: { refetchInterval: 5000 },
  });

  const [
    ownerRes,
    releasedRes,
    lastHeartbeatRes,
    intervalRes,
    balanceRes,
    totalBpsRes,
    countRes,
    canReleaseRes,
    releaseAtRes,
  ] = result.data ?? [];

  return {
    owner: ownerRes?.result as `0x${string}` | undefined,
    released: releasedRes?.result as boolean | undefined,
    lastHeartbeatAt: lastHeartbeatRes?.result as bigint | undefined,
    heartbeatInterval: intervalRes?.result as bigint | undefined,
    vaultBalance: balanceRes?.result as bigint | undefined,
    totalBps: totalBpsRes?.result as bigint | undefined,
    beneficiaryCount: countRes?.result as bigint | undefined,
    canRelease: canReleaseRes?.result as boolean | undefined,
    releaseAt: releaseAtRes?.result as bigint | undefined,
    isLoading: result.isLoading,
    refetch: result.refetch,
  };
}

export function useBeneficiaries(count: number) {
  const contracts = Array.from({ length: count }, (_, i) => ({
    address: vaultAddress,
    abi: KINVAULT_ABI,
    functionName: "getBeneficiary" as const,
    args: [BigInt(i)] as const,
  }));

  const result = useReadContracts({
    contracts: count > 0 ? contracts : [],
    query: { enabled: count > 0, refetchInterval: 10000 },
  });

  const beneficiaries = (result.data ?? [])
    .map((r) => {
      const res = r.result as [string, number] | undefined;
      return res
        ? { addr: res[0] as `0x${string}`, bps: Number(res[1]) }
        : null;
    })
    .filter(Boolean) as { addr: `0x${string}`; bps: number }[];

  return {
    beneficiaries,
    isLoading: result.isLoading,
    refetch: result.refetch,
  };
}

export function useEstimateMUSD(price: bigint | undefined) {
  return useReadContract({
    address: vaultAddress,
    abi: KINVAULT_ABI,
    functionName: "estimateMUSD",
    args: price ? [price] : undefined,
    query: { enabled: !!price },
  });
}
