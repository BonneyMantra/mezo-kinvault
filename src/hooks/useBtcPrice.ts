import { useReadContract } from "wagmi";
import { PRICE_FEED_ABI, MEZO_ADDRESSES } from "../lib/contracts";

export function useBtcPrice() {
  const result = useReadContract({
    address: MEZO_ADDRESSES.priceFeed as `0x${string}`,
    abi: PRICE_FEED_ABI,
    functionName: "fetchPrice",
    query: { refetchInterval: 30000 },
  });

  return {
    price: result.data as bigint | undefined,
    isLoading: result.isLoading,
  };
}
