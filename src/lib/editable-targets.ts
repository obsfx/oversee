export abstract class EditableTargets {
  static is(target: EventTarget | null) {
    return (
      target instanceof HTMLElement &&
      (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
    )
  }
}
