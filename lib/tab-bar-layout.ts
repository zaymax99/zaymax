export const TAB_BAR_METRICS = {
  iconHeight: 21,
  labelLineHeight: 12,
  contentGap: 2,
  rowPadding: 4,
  buttonPadding: 4,
  maxFontScale: 1.5,
} as const;

/** Keep the whole icon/label group inside a reachable, safe-area-aware pill. */
export function getTabBarLayout({
  screenWidth,
  bottomInset,
  fontScale = 1,
}: {
  screenWidth: number;
  bottomInset: number;
  fontScale?: number;
}) {
  const width = Number.isFinite(screenWidth) ? Math.max(0, screenWidth) : 0;
  const inset = Number.isFinite(bottomInset) ? Math.max(0, bottomInset) : 0;
  const scale = Number.isFinite(fontScale)
    ? Math.min(Math.max(fontScale, 1), TAB_BAR_METRICS.maxFontScale)
    : 1;
  const horizontalMargin = width < 360 ? 20 : 26;
  const barWidth = Math.min(Math.max(width - horizontalMargin * 2, 0), 500);
  const contentHeight =
    TAB_BAR_METRICS.iconHeight +
    TAB_BAR_METRICS.contentGap +
    TAB_BAR_METRICS.labelLineHeight * scale;

  return {
    width: barWidth,
    left: (width - barWidth) / 2,
    bottom: Math.max(inset, 8),
    height: Math.max(
      56,
      Math.ceil(
        contentHeight +
          (TAB_BAR_METRICS.rowPadding + TAB_BAR_METRICS.buttonPadding) * 2 +
          2,
      ),
    ),
  };
}
