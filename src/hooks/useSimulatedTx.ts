import {
  useSimulateContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { type Abi } from "viem";

type SimTxConfig = {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
  enabled?: boolean;
};

export function useSimulatedTx(config: SimTxConfig) {
  const enabled = config.enabled !== false;

  const simulation = useSimulateContract({
    address: config.address,
    abi: config.abi,
    functionName: config.functionName,
    args: config.args,
    value: config.value,
    query: { enabled },
  });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: txHash });

  const canExecute = enabled && simulation.isSuccess && !simulation.isError;
  const simulationError = simulation.error?.message ?? null;

  const execute = () => {
    if (!simulation.data?.request) return;
    writeContract(simulation.data.request);
  };

  return {
    canExecute,
    simulationError,
    isSimulating: simulation.isLoading,
    execute,
    isPending,
    isConfirmed: receipt.isSuccess,
    txHash,
    refetchSim: simulation.refetch,
  };
}
