// Handle timer limits (2 weeks)

export class Timer {
  private timerString: string;
  private ms: number;

  constructor(input: string) {
    this.timerString = Timer.createTimer(input);
    this.ms = Timer.parseInputToISO(input);
  }

  public static createTimer(simpleInput: string): string {
    let now: Date = new Date();
    let ms: number = this.parseInputToISO(simpleInput);
    return `<t:${now.setMilliseconds(ms) * 10 ** -3}:R>`;
  }

  public static parseInputToISO(input: string): number {
    let wsRegEx: RegExp = /[\s]+/g;

    let joined: string = input.replace(wsRegEx, '');
    return this.parseSimpleDelimited(joined);
  }

  private static parseSimpleDelimited(simpleDelimited: string): number {
    let simpleRegEx: RegExp = /^([\d]+[dD]|[\d]+[hH]|[\d]+[mM]|[\d]+[sS]|[\d]+)+$/g;
    let delimiterRegEx: RegExp = /[dDhHmMsS]+/g;

    if (!simpleDelimited.match(simpleRegEx)) {
      throw new Error('Input cannot be parsed.');
    }

    let delimiters: string[] = simpleDelimited.match(delimiterRegEx)!;
    let splitInput: string[] = simpleDelimited.split(delimiterRegEx);

    // Remove empty string
    splitInput.pop();

    let accrued: number = 0;

    for (let i = 0; i < delimiters.length; i++) {
      switch (delimiters[i]) {
        case 'd': 
          accrued += this.parseDays(splitInput[i]);
          break;
        case 'D':
          accrued += this.parseDays(splitInput[i]);
          break;
        case 'h':
          accrued += this.parseHours(splitInput[i]);
          break;
        case 'H':
          accrued += this.parseHours(splitInput[i]);
          break;
        case 'm':
          accrued += this.parseMinutes(splitInput[i]);
          break;
        case 'M':
          accrued += this.parseMinutes(splitInput[i]);
          break;
        case 's':
          accrued += this.parseSeconds(splitInput[i]);
          break;
        case 'S':
          accrued += this.parseSeconds(splitInput[i]);
          break;
      }
    }
    return accrued;
  }

  public getTimerString(): string {
    return this.timerString;
  }

  public getTimerMs(): number {
    return this.ms;
  }

  public static parseDays(days: string): number {
    return Number.parseInt(days) * 24 * 60 * 60 * 1000;
  }

  public static parseHours(hours: string): number {
    return Number.parseInt(hours) * 60 * 60 * 1000;
  }

  public static parseMinutes(minutes: string): number {
    return Number.parseInt(minutes) * 60 * 1000;
  }

  public static parseSeconds(seconds: string): number {
    return Number.parseInt(seconds) * 1000;
  }

  /** @deprecated 
   * @remarks
   * Discord.js doesn't support millisecond precision
   *
   * public static parseMilliseconds(): number {
   *
   * } */

  private dissolveTimer() {
    // TODO: Remove stale timers
  }
}
