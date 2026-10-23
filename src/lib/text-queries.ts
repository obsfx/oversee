export abstract class TextQueries {
  static isActive(query: string) {
    return query.trim() !== ''
  }

  static needle(query: string) {
    return query.trim().toLowerCase()
  }

  static matches(text: string, query: string) {
    return text.toLowerCase().includes(TextQueries.needle(query))
  }
}
