export class Timer {
  constructor() {}

  public static createTimer(ms: number): string {
    let now: Date = new Date();
    return `<t:${now.setMilliseconds(ms) * 10 ** -3}:R>`;
  }

  public static parseInputToISO(input: string) {
    let simpleRegEx: RegExp = /^[\d]+m$/g;
    if (input.match(simpleRegEx)) {
      let exTime: number = Number.parseInt(input.replaceAll(/\D/g, ""));
      return exTime * 60 * 1000;
    }
  }

  private dissolveTimer() {
    // TODO: Remove stale timers
  }
}
