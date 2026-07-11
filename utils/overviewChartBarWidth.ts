/**
 * Overview chart bar geometry — derives a Recharts `maxBarSize` from the
 * plot area and bucket count so a week reads thick while a full month
 * compresses into thin columns.
 *
 * Use `maxBarSize` (not fixed `barSize`) so Recharts fills each category
 * band up to the cap — sparse ranges naturally expand to the max width.
 */

/** Must stay in sync with `<OverviewChart>` axis + margin layout. */
export const OVERVIEW_CHART_AXIS = {
  leftYAxisWidth: 36,
  rightYAxisWidth: 36,
  marginRightWithOverlay: 8,
} as const

export interface OverviewBarWidthInput {
  /** Inner plot width available for the categorical axis (px). */
  plotWidth: number
  /** Number of buckets / bars in the active range. */
  barCount: number
  /** Never render bars narrower than this (dense month view). */
  minBarWidth?: number
  /** Cap for sparse ranges (week / few days). */
  maxBarWidth?: number
}

export interface OverviewBarWidthResult {
  /** Pass to Recharts `<Bar maxBarSize={...}>`. */
  maxBarSize: number
  /** Top corner radius — scales down when bars are thin. */
  topRadius: number
  /** Optional `barCategoryGap` for the chart — tighter when dense. */
  barCategoryGap: string | number
}

/**
 * Fraction of each category band the bar may occupy. Dense ranges
 * use more of the band so columns stay readable; sparse ranges leave
 * visible gaps between thick bars.
 */
function fillRatioForBarCount(barCount: number): number {
  if (barCount <= 7) return 0.55
  if (barCount <= 14) return 0.65
  if (barCount <= 21) return 0.72
  if (barCount <= 28) return 0.78
  return 0.85
}

function topRadiusForBarWidth(barWidth: number): number {
  if (barWidth <= 5) return 1
  if (barWidth <= 10) return 2
  if (barWidth <= 16) return 3
  return 4
}

function barCategoryGapForBarCount(barCount: number): string {
  if (barCount <= 7) return '18%'
  if (barCount <= 14) return '12%'
  if (barCount <= 21) return '8%'
  return '4%'
}

/**
 * Compute the max pixel width of each overview bar.
 *
 * Sparse ranges (≤7 buckets) always return `maxBarWidth` so a partial
 * week never renders as hairline columns when the plot estimate is off.
 */
export function computeOverviewBarWidth({
  plotWidth,
  barCount,
  minBarWidth = 4,
  maxBarWidth = 32,
}: OverviewBarWidthInput): OverviewBarWidthResult {
  const barCategoryGap = barCategoryGapForBarCount(barCount)

  if (barCount <= 0 || plotWidth <= 0) {
    return {
      maxBarSize: maxBarWidth,
      topRadius: topRadiusForBarWidth(maxBarWidth),
      barCategoryGap,
    }
  }

  // Partial week / few days — always use the design cap.
  if (barCount <= 7) {
    return {
      maxBarSize: maxBarWidth,
      topRadius: topRadiusForBarWidth(maxBarWidth),
      barCategoryGap,
    }
  }

  const bandWidth = plotWidth / barCount
  const fillRatio = fillRatioForBarCount(barCount)
  const ideal = bandWidth * fillRatio

  const maxBarSize = Math.round(
    Math.max(minBarWidth, Math.min(maxBarWidth, ideal)),
  )

  return {
    maxBarSize,
    topRadius: topRadiusForBarWidth(maxBarSize),
    barCategoryGap,
  }
}

/**
 * Estimate categorical plot width from the chart container.
 * X-axis edge padding is applied inside this area by Recharts — don't
 * subtract it again or the estimate shrinks and bars render too thin.
 */
export function estimateOverviewPlotWidth(
  containerWidth: number,
  hasRightAxis: boolean,
): number {
  const { leftYAxisWidth, rightYAxisWidth, marginRightWithOverlay } =
    OVERVIEW_CHART_AXIS

  const rightGutter = hasRightAxis ? rightYAxisWidth + marginRightWithOverlay : 0

  return Math.max(0, containerWidth - leftYAxisWidth - rightGutter)
}
