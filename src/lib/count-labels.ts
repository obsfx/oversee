import plur from 'plur'

export abstract class CountLabels {
  static of(count: number, noun: string) {
    return `${count} ${plur(noun, count)}`
  }
}
