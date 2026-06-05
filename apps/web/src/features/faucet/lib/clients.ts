import { FaucetContractClient as FaucetClient } from "@workspace/contracts"
import { TestTokenContractClient as TokenClient } from "@workspace/contracts"
import { NETWORK } from "@/app/config/network"

export const FAUCET_CONTRACT_ID = "CDAARNES7HX5R4CPYUGQ7GE4YNDJLUMMIJ6W5VH6EGMQLDQBUAY6KDB4"
export const TWBTC_CONTRACT_ID = "CCJRNW5YLINR5QSY6I37GIBHW5SCKWDGTQ64YYTYF5TYFQDFQRJQY54O"
export const TUSDC_CONTRACT_ID = "CAURHHYKGSTPHFF6CIY6KMWASK26REMXZVEOR57UC7TMKUTTT4JYDV4J"

// Used as the source account for read-only simulations when no wallet is connected.
const READ_SOURCE = "GAUHMCMUP5FZO5675W3ISZ6E6CNYJGXBUW5WANE2JR4TGAARYCTSCBKI"

const base = () => ({
  rpcUrl: NETWORK.rpcUrl,
  networkPassphrase: NETWORK.networkPassphrase,
})

export function createFaucetClient(publicKey = READ_SOURCE) {
  return new FaucetClient({ ...base(), contractId: FAUCET_CONTRACT_ID, publicKey })
}

export function createTwbtcClient(publicKey = READ_SOURCE) {
  return new TokenClient({ ...base(), contractId: TWBTC_CONTRACT_ID, publicKey })
}

export function createTusdcClient(publicKey = READ_SOURCE) {
  return new TokenClient({ ...base(), contractId: TUSDC_CONTRACT_ID, publicKey })
}

/** Convert raw i128 (7-decimal fixed-point) to a human-readable number. */
export function fromContractAmount(raw: bigint): number {
  return Number(raw) / 1e7
}
