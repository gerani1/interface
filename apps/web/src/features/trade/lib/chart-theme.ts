import { ColorType, CrosshairMode, LineStyle } from "lightweight-charts"
import type { CandlestickSeriesOptions, ChartOptions, DeepPartial } from "lightweight-charts"

/**
 * Chart theming adapter.
 *
 * `lightweight-charts` paints to a canvas, so it cannot consume Tailwind
 * classes — it needs concrete colour strings. This module is the single bridge
 * between the CSS semantic tokens declared in `@workspace/ui/globals.css` and
 * the chart: every colour the chart draws is read from a `--chart-*` custom
 * property, which in turn aliases a semantic token (`--long`, `--short`,
 * `--warning`, `--border`, …). Change a token and the chart follows.
 */

export type ChartTheme = "light" | "dark"

/** Every colour role the trading chart can paint. */
export type ChartPalette = {
  /** Canvas background. */
  background: string
  /** Axis and legend text. */
  text: string
  /** Horizontal + vertical grid lines. */
  grid: string
  /** Crosshair rules. */
  crosshair: string
  /** Fill behind the crosshair's axis labels. */
  crosshairLabel: string
  /** Price/time scale borders. */
  border: string
  /** Rising candle body + wick. */
  up: string
  /** Falling candle body + wick. */
  down: string
  /** Long position entry line — matches "long" everywhere else in the app. */
  long: string
  /** Short position entry line. */
  short: string
  /** Liquidation price line. */
  liquidation: string
}

export type ChartPaletteRole = keyof ChartPalette

/** CSS custom property backing each palette role. */
export const CHART_TOKENS = {
  background: "--chart-surface",
  text: "--chart-text",
  grid: "--chart-grid",
  crosshair: "--chart-crosshair",
  crosshairLabel: "--chart-crosshair-label",
  border: "--chart-border",
  up: "--chart-up",
  down: "--chart-down",
  long: "--long",
  short: "--short",
  liquidation: "--chart-liquidation",
} as const satisfies Record<ChartPaletteRole, `--${string}`>

/**
 * sRGB mirrors of the token values in `globals.css`.
 *
 * Used when no computed style is available — server rendering, unit tests, or
 * the first paint before the stylesheet has applied. They are hex rather than
 * `oklch()` because `lightweight-charts` parses colours itself and only
 * understands hex / rgb / hsl / named colours.
 */
export const CHART_PALETTE_FALLBACKS: Record<ChartTheme, ChartPalette> = {
  light: {
    background: "#ffffff",
    text: "#737373",
    grid: "#e5e5e5",
    crosshair: "#a1a1a1",
    crosshairLabel: "#f7f7f7",
    border: "#e5e5e5",
    up: "#007f53",
    down: "#e7000b",
    long: "#007f53",
    short: "#e7000b",
    liquidation: "#a45f00",
  },
  dark: {
    background: "#0a0a0a",
    text: "#a1a1a1",
    grid: "#262626",
    crosshair: "#525252",
    crosshairLabel: "#262626",
    border: "#262626",
    up: "#00dd8e",
    down: "#ff6467",
    long: "#00dd8e",
    short: "#ff6467",
    liquidation: "#f9bb2e",
  },
}

/** Resolves a CSS custom property name to a chart-safe colour string. */
export type TokenResolver = (token: string) => string

/** Converts an arbitrary CSS colour into a chart-safe string, or "" on failure. */
export type ColorConverter = (value: string) => string

/** Reads the active theme off the `dark`/`light` class the ThemeProvider sets. */
export function resolveChartTheme(root: Element | null = getRoot()): ChartTheme {
  return root?.classList.contains("dark") ? "dark" : "light"
}

/** Colour notations `lightweight-charts` can parse without conversion. */
const CHART_SAFE_COLOR = /^(#|rgba?\(|hsla?\(|transparent$|[a-z]+$)/i

let sharedConverter: ColorConverter | null = null

/**
 * Tokens are authored in `oklch()`, which the chart library cannot parse.
 * Painting the colour onto a 1×1 canvas and reading the pixel back converts any
 * CSS colour the browser understands into plain `rgb()` / `rgba()`.
 */
export function canvasColorConverter(): ColorConverter {
  if (sharedConverter) return sharedConverter
  if (typeof document === "undefined") return () => ""

  const canvas = document.createElement("canvas")
  canvas.width = 1
  canvas.height = 1
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return () => ""

  sharedConverter = (value) => {
    try {
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillStyle = "#000000"
      ctx.fillStyle = value
      // An unparseable colour leaves fillStyle untouched.
      if (ctx.fillStyle === "#000000" && !/^#0{3,8}$/i.test(value)) return ""
      ctx.fillRect(0, 0, 1, 1)
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
      return a === 255
        ? `rgb(${r}, ${g}, ${b})`
        : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`
    } catch {
      return ""
    }
  }

  return sharedConverter
}

/** Normalises `value` only when the chart could not parse it as-is. */
export function toChartColor(value: string, convert: ColorConverter): string {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (CHART_SAFE_COLOR.test(trimmed)) return trimmed
  return convert(trimmed)
}

/**
 * Builds a resolver backed by the element's computed style, converting each
 * token value into something the chart can paint.
 */
export function cssTokenResolver(
  root: Element | null = getRoot(),
  convert: ColorConverter = canvasColorConverter(),
): TokenResolver {
  if (!root || typeof window === "undefined") return () => ""
  const computed = window.getComputedStyle(root)
  return (token) => toChartColor(computed.getPropertyValue(token), convert)
}

/**
 * Builds the palette for `theme`, taking each role from its CSS token and
 * falling back to the literal value when the token is unset or unreadable.
 */
export function buildChartPalette(
  theme: ChartTheme,
  resolve: TokenResolver = () => "",
): ChartPalette {
  const fallback = CHART_PALETTE_FALLBACKS[theme]
  const roles = Object.keys(CHART_TOKENS) as Array<ChartPaletteRole>

  return roles.reduce((palette, role) => {
    let value = ""
    try {
      value = resolve(CHART_TOKENS[role])
    } catch {
      // A resolver backed by a detached node can throw — fall back silently.
      value = ""
    }
    palette[role] = value || fallback[role]
    return palette
  }, {} as ChartPalette)
}

/** Reads the palette for whichever theme is currently applied to the document. */
export function getChartPalette(root: Element | null = getRoot()): ChartPalette {
  return buildChartPalette(resolveChartTheme(root), cssTokenResolver(root))
}

/** Chart-level options (layout, grid, crosshair, scales) for a palette. */
export function buildChartOptions(
  palette: ChartPalette,
): DeepPartial<ChartOptions> {
  return {
    layout: {
      background: { type: ColorType.Solid, color: palette.background },
      textColor: palette.text,
      fontSize: 11,
    },
    grid: {
      vertLines: { color: palette.grid, style: LineStyle.Solid },
      horzLines: { color: palette.grid, style: LineStyle.Solid },
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: {
        color: palette.crosshair,
        labelBackgroundColor: palette.crosshairLabel,
      },
      horzLine: {
        color: palette.crosshair,
        labelBackgroundColor: palette.crosshairLabel,
      },
    },
    rightPriceScale: {
      borderColor: palette.border,
      scaleMargins: { top: 0.1, bottom: 0.1 },
    },
    timeScale: {
      borderColor: palette.border,
      timeVisible: true,
      secondsVisible: false,
      rightOffset: 5,
    },
  }
}

/** Candlestick series colours for a palette. */
export function buildCandleOptions(
  palette: ChartPalette,
): DeepPartial<CandlestickSeriesOptions> {
  return {
    upColor: palette.up,
    downColor: palette.down,
    borderVisible: false,
    wickUpColor: palette.up,
    wickDownColor: palette.down,
  }
}

/** Colour for a position line, keyed by side. */
export function positionLineColor(
  palette: ChartPalette,
  isLong: boolean,
): string {
  return isLong ? palette.long : palette.short
}

function getRoot(): Element | null {
  return typeof document === "undefined" ? null : document.documentElement
}
