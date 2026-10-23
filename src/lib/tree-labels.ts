export abstract class TreeLabels {
  static readonly expandAll = 'Expand all'

  static readonly collapseAll = 'Collapse all'

  static expansion(expanded: boolean) {
    return expanded ? TreeLabels.collapseAll : TreeLabels.expandAll
  }
}
