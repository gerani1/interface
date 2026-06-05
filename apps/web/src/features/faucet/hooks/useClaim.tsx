import { useCallback, useState } from "react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { useWallet } from "@/features/wallet/hooks/useWallet"
import { sendAndPoll } from "@/lib/tx-builder"
import { explorerTxUrl } from "@/app/config/network"
import { createFaucetClient, TWBTC_CONTRACT_ID, TUSDC_CONTRACT_ID } from "../lib/clients"
import { parseSorobanError } from "@/lib/contracts"

function isClaimTooSoonError(error: unknown): boolean {
  const text = String(error).toLowerCase()
  return (
    text.includes("claimtoosoon") ||
    text.includes("claim_too_soon") ||
    // contract error code 6 may appear as '#6' or 'Error(Contract, #6)'
    /error\(contract,\s*#6\)/i.test(String(error))
  )
}

export function useClaim() {
  const { address, signTransaction, isConnected } = useWallet()
  const queryClient = useQueryClient()
  const [isPending, setIsPending] = useState(false)

  const claim = useCallback(async () => {
    if (!address || !isConnected) return

    setIsPending(true)
    const toastId = toast.loading("Claiming test tokens…")

    try {
      const faucet = createFaucetClient(address)
      const tx = await faucet.claim_many({
        account: address,
        tokens: [TWBTC_CONTRACT_ID, TUSDC_CONTRACT_ID],
      })

      const unsignedXdr = tx.toXDR()
      const signedXdr = await signTransaction(unsignedXdr)
      const { hash } = await sendAndPoll(signedXdr)

      // Refresh balances after a successful claim
      await queryClient.invalidateQueries({ queryKey: ["faucet", "data"] })

      toast.success("Test tokens claimed!", {
        id: toastId,
        description: (
          <a
            href={explorerTxUrl(hash)}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary hover:underline"
          >
            View transaction →
          </a>
        ),
      })
    } catch (error) {
      const message = isClaimTooSoonError(error)
        ? "Cooldown active — please wait before claiming again."
        : parseSorobanError(error)
      toast.error(message, { id: toastId })
    } finally {
      setIsPending(false)
    }
  }, [address, isConnected, signTransaction, queryClient])

  return { claim, isPending }
}
