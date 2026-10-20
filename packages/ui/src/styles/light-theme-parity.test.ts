import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const css = readFileSync(join(__dirname, "globals.css"), "utf8")

/** Returns custom property declarations of the first block opened by `selector`. */
function declarations(selector: string): Map<string, string> {
  const start = css.indexOf(`\n${selector} {`)
  if (start === -1) throw new Error(`No ${selector} block`)
  const end = css.indexOf("\n}", start)
  const body = css.slice(start, end)
  const out = new Map<string, string>()
  for (const m of body.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) {
    out.set(m[1], m[2].trim())
  }
  return out
}

const light = declarations(":root")
const dark = declarations(".dark")

/** oklch -> relative luminance (Björn Ottosson's OKLab -> linear sRGB). */
function luminance(value: string): number {
  const m = /oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)/.exec(value)
  if (!m) throw new Error(`Not a literal oklch(): ${value}`)
  const [L, C, h] = [Number(m[1]), Number(m[2]), (Number(m[3]) * Math.PI) / 180]
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const clamp = (x: number) => Math.min(1, Math.max(0, x))
  const r = clamp(4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s)
  const g = clamp(-1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s)
  const bl = clamp(-0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s)
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl
}

function contrast(fg: string, bg: string): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe("light theme parity (:root vs .dark)", () => {
  it("defines every surface, text and chart role in :root that .dark defines", () => {
    const roles = [...dark.keys()].filter((k) =>
      /^--(surface|text|chart)-/.test(k)
    )
    expect(roles.length).toBeGreaterThan(0)
    expect(roles.filter((k) => !light.has(k))).toEqual([])
  })

  it("defines --text-disabled in both themes (utility is exposed in @theme)", () => {
    expect(light.has("--text-disabled")).toBe(true)
    expect(dark.has("--text-disabled")).toBe(true)
  })

  it("keeps light subtle fills light and dark subtle fills dark", () => {
    const lightness = (v: string) => Number(/oklch\(([\d.]+)/.exec(v)![1])
    for (const role of ["long", "short", "success", "warning", "info", "danger", "neutral", "liquidation"]) {
      expect(lightness(light.get(`--${role}-subtle`)!), `${role} light`).toBeGreaterThan(0.9)
      expect(lightness(dark.get(`--${role}-subtle`)!), `${role} dark`).toBeLessThan(0.4)
    }
  })

  it("keeps light status colours at 4.5:1 on the white background", () => {
    for (const token of ["--success", "--warning", "--liquidation", "--destructive", "--info"]) {
      expect(contrast(light.get(token)!, "oklch(1 0 0)"), token).toBeGreaterThanOrEqual(4.5)
    }
  })

  it("restores the bright status colours and aliases under .dark", () => {
    for (const token of ["--success", "--warning", "--liquidation", "--long", "--chart-up", "--chart-liquidation"]) {
      expect(dark.has(token), token).toBe(true)
    }
  })
})
