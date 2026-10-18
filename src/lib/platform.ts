const APPLE_PLATFORM = /mac|iphone|ipad|ipod/i

interface NavigatorWithUserAgentData extends Navigator {
  userAgentData?: { platform?: string }
}

export abstract class Platform {
  private static detect() {
    if (typeof navigator === 'undefined') {
      return ''
    }
    const { userAgentData, userAgent } = navigator as NavigatorWithUserAgentData
    return userAgentData?.platform || userAgent
  }

  static readonly isApple = APPLE_PLATFORM.test(Platform.detect())
}
