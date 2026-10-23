export const useFocusHighlight = (
  requestedAt: number | null,
  clearFocus: (requestedAt: number) => void,
) => {
  return {
    highlightKey: requestedAt,
    endHighlight: () => {
      if (requestedAt !== null) {
        clearFocus(requestedAt)
      }
    },
  }
}
