export abstract class ListLabels {
  private static readonly conjunction = new Intl.ListFormat('en', {
    style: 'long',
    type: 'conjunction',
  })

  static and(items: readonly string[]) {
    return ListLabels.conjunction.format(items)
  }
}
