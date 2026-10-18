const NAMES: Record<number, string> = {
  100: 'Thin',
  200: 'ExtraLight',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'SemiBold',
  700: 'Bold',
  800: 'ExtraBold',
  900: 'Black',
}

export abstract class FontWeightNames {
  static of(weight: number) {
    return NAMES[weight] ?? String(weight)
  }

  static label(weight: number) {
    return `${weight} ${FontWeightNames.of(weight)}`
  }
}
