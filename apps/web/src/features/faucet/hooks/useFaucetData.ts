import { useQuery } from "@tanstack/react-query"
import {
  createFaucetClient,
  createTwbtcClient,
  createTusdcClient,
  TWBTC_CONTRACT_ID,
  TUSDC_CONTRACT_ID,
  fromContractAmount,
} from "../lib/clients"

export type FaucetData = {
  balances: { twbtc: number; tusdc: number }
  claimAmounts: { twbtc: number; tusdc: number }
  cooldownLedgers: number
}

async function fetchFaucetData(address: string | null): Promise<FaucetData> {
  const sourceKey = address ?? undefined
  const faucet = createFaucetClient(sourceKey)
  const twbtc = createTwbtcClient(sourceKey)
  const tusdc = createTusdcClient(sourceKey)

  const [twbtcClaimTx, tusdcClaimTx, cooldownTx] = await Promise.all([
    faucet.claim_amount({ token: TWBTC_CONTRACT_ID }),
    faucet.claim_amount({ token: TUSDC_CONTRACT_ID }),
    faucet.cooldown_ledgers(),
  ])

  let twbtcBalance = 0n
  let tusdcBalance = 0n

  if (address) {
    const [twbtcBalTx, tusdcBalTx] = await Promise.all([
      twbtc.balance({ id: address }),
      tusdc.balance({ id: address }),
    ])
    twbtcBalance = twbtcBalTx.result as bigint
    tusdcBalance = tusdcBalTx.result as bigint
  }

  return {
    balances: {
      twbtc: fromContractAmount(twbtcBalance),
      tusdc: fromContractAmount(tusdcBalance),
    },
    claimAmounts: {
      twbtc: fromContractAmount(twbtcClaimTx.result as bigint),
      tusdc: fromContractAmount(tusdcClaimTx.result as bigint),
    },
    cooldownLedgers: Number(cooldownTx.result),
  }
}

export function useFaucetData(address: string | null) {
  return useQuery<FaucetData>({
    queryKey: ["faucet", "data", address],
    queryFn: () => fetchFaucetData(address),
    staleTime: 20_000,
    refetchInterval: 30_000,
  })
}
