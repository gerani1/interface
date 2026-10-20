import { afterEach, describe, expect, it, vi } from "vitest"
import { act, render, screen } from "@testing-library/react"

import {
  ToastProvider,
  toast,
  useToast,
} from "@workspace/ui/components/toast"

/**
 * The app has exactly one toast implementation: the `@workspace/ui` singleton
 * plus the `ToastProvider` mounted once in `routes/__root.tsx`. The former
 * `@/shared/components/toast` shim, Modal and skeleton wrappers were removed
 * so app code imports the `@workspace/ui` primitives directly.
 */
describe("sole toast implementation", () => {
  afterEach(() => {
    document.body.innerHTML = ""
    vi.useRealTimers()
  })

  it("delivers toast calls to the single provider without duplicates", () => {
    vi.useFakeTimers()

    function Probe() {
      const { toasts } = useToast()
      return <span data-testid="toast-count">{toasts.length}</span>
    }

    render(
      <ToastProvider>
        <Probe />
      </ToastProvider>,
    )

    act(() => {
      toast.success("Call reaches the provider")
    })

    expect(screen.getAllByText("Call reaches the provider")).toHaveLength(1)
    expect(screen.getByTestId("toast-count")).toHaveTextContent("1")
    // Single stack container — no duplicate rendering.
    expect(
      document.querySelectorAll("[aria-live='polite'][aria-atomic='false']"),
    ).toHaveLength(1)
  })
})
