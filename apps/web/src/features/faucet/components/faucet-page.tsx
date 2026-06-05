import { Skeleton } from "@workspace/ui/components/skeleton"
import { Button } from "@workspace/ui/components/button"
import { Navbar } from "@/ui/Navbar"
import { TokenIcon } from "@/shared/components/TokenIcon"
import { formatToken } from "@/shared/lib/format"
import { NETWORK } from "@/app/config/network"
import { useWallet } from "@/features/wallet/hooks/useWallet"
import { useNetwork } from "@/features/wallet/hooks/useNetwork"
import { NetworkMismatchBanner } from "@/features/wallet/components/NetworkMismatchBanner"
import { ConnectButton } from "@/features/wallet/components/ConnectButton"
import { useFaucetData } from "../hooks/useFaucetData"
import { useClaim } from "../hooks/useClaim"

// ── Token card ────────────────────────────────────────────────────────────────

type TokenCardProps = {
  symbol: string
  name: string
  balance: number | undefined
  claimAmount: number | undefined
  isLoading: boolean
}

function TokenCard({ symbol, name, balance, claimAmount, isLoading }: TokenCardProps) {
  return (
    <div className="flex flex-1 flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <TokenIcon symbol={symbol.replace(/^T/, "")} size={36} />
        <div>
          <p className="text-sm font-semibold text-foreground">{symbol}</p>
          <p className="text-xs text-muted-foreground">{name}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted/40 px-3 py-2.5">
          <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Your balance
          </p>
          {isLoading ? (
            <Skeleton className="mt-1 h-4 w-20" />
          ) : (
            <p className="font-mono text-sm text-foreground">
              {formatToken(balance, symbol, { decimals: 4 })}
            </p>
          )}
        </div>

        <div className="rounded-lg bg-muted/40 px-3 py-2.5">
          <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Claim amount
          </p>
          {isLoading ? (
            <Skeleton className="mt-1 h-4 w-16" />
          ) : (
            <p className="font-mono text-sm text-foreground">
              {formatToken(claimAmount, symbol, { decimals: 2 })}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function FaucetPage() {
  const { address, isConnected } = useWallet()
  const { mismatch } = useNetwork()
  const { data, isLoading } = useFaucetData(address)
  const { claim, isPending } = useClaim()

  const isTestnet = NETWORK.name === "testnet"
  const claimDisabled = !isConnected || isPending || mismatch

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <Navbar variant="app" />
      <NetworkMismatchBanner />

      <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-8 sm:px-6">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-semibold tracking-tight">Testnet Faucet</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-0.5 text-[11px] font-medium text-yellow-600 dark:text-yellow-400">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
              Stellar Testnet
            </span>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Claim test tokens to try trading on SO4. Tokens have no real value.
          </p>
        </header>

        {!isTestnet ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              The faucet is only available on the Stellar testnet.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Token cards */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <TokenCard
                symbol="TWBTC"
                name="Test Bitcoin"
                balance={data?.balances.twbtc}
                claimAmount={data?.claimAmounts.twbtc}
                isLoading={isLoading}
              />
              <TokenCard
                symbol="TUSDC"
                name="Test USDC"
                balance={data?.balances.tusdc}
                claimAmount={data?.claimAmounts.tusdc}
                isLoading={isLoading}
              />
            </div>

            {/* Claim panel */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Claim test tokens</p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    Receive TWBTC and TUSDC in a single transaction. A cooldown applies between
                    claims.
                  </p>
                </div>

                {mismatch && (
                  <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400">
                    Switch your wallet to Stellar Testnet to claim.
                  </div>
                )}

                {!isConnected ? (
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-[13px] text-muted-foreground">Connect your wallet to claim test tokens.</p>
                    <ConnectButton />
                  </div>
                ) : (
                  <Button
                    variant="default"
                    className="w-full"
                    disabled={claimDisabled}
                    onClick={claim}
                  >
                    {isPending ? (
                      <span className="flex items-center gap-2">
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Claiming…
                      </span>
                    ) : (
                      "Claim Test Tokens"
                    )}
                  </Button>
                )}

                {data?.cooldownLedgers != null && data.cooldownLedgers > 0 && (
                  <p className="text-center text-[12px] text-muted-foreground">
                    Cooldown: {data.cooldownLedgers.toLocaleString()} ledgers between claims
                  </p>
                )}
              </div>
            </div>

            {/* Info panel */}
            <div className="rounded-xl border border-border bg-muted/20 px-5 py-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Contract addresses
              </p>
              <dl className="space-y-1.5">
                {[
                  { label: "Faucet", id: "CDAARNES7HX5R4CPYUGQ7GE4YNDJLUMMIJ6W5VH6EGMQLDQBUAY6KDB4" },
                  { label: "TWBTC", id: "CCJRNW5YLINR5QSY6I37GIBHW5SCKWDGTQ64YYTYF5TYFQDFQRJQY54O" },
                  { label: "TUSDC", id: "CAURHHYKGSTPHFF6CIY6KMWASK26REMXZVEOR57UC7TMKUTTT4JYDV4J" },
                ].map(({ label, id }) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <dt className="w-12 shrink-0 text-[12px] text-muted-foreground">{label}</dt>
                    <dd className="min-w-0 truncate font-mono text-[11px] text-foreground/70">
                      {id}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
