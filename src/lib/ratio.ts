export abstract class Ratio {
  static percent(part: number, total: number) {
    return total === 0 ? 0 : (part / total) * 100
  }
}
