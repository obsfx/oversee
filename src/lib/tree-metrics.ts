const INSET = 0.375
const STEP = 0.75
const TWISTY_CENTER = 0.4375
const ROW_HEIGHT = 20
const MAX_INDENT = 12

export abstract class TreeMetrics {
  static indent(depth: number) {
    return Math.min(depth, MAX_INDENT)
  }

  static padding(depth: number) {
    return `${INSET + TreeMetrics.indent(depth) * STEP}rem`
  }

  static guide(level: number) {
    return `${INSET + level * STEP + TWISTY_CENTER}rem`
  }

  static elbowWidth() {
    return `${STEP - TWISTY_CENTER}rem`
  }

  static rowHeight(uiScale: number) {
    return Math.round(ROW_HEIGHT * uiScale)
  }
}
