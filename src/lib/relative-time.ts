import dayjs from 'dayjs'
import en from 'dayjs/locale/en'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const COMPACT_LOCALE = 'oversee-compact'
const JUST_NOW_SECONDS = 60

dayjs.locale(
  {
    ...en,
    name: COMPACT_LOCALE,
    relativeTime: {
      future: 'in %s',
      past: '%s ago',
      s: '%ds',
      m: '1m',
      mm: '%dm',
      h: '1h',
      hh: '%dh',
      d: '1d',
      dd: '%dd',
      M: '1mo',
      MM: '%dmo',
      y: '1y',
      yy: '%dy',
    },
  },
  undefined,
  true,
)

export abstract class RelativeTime {
  static format(at: number, now: number) {
    if (dayjs(now).diff(at, 'second') < JUST_NOW_SECONDS) {
      return 'just now'
    }
    return dayjs(at).locale(COMPACT_LOCALE).from(now)
  }
}
