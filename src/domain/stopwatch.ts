export class StopWatch {
  private duration = 0;
  private startTime?: number;

  start(): this {
    this.startTime = Date.now();
    return this;
  }

  stop(): number {
    if (this.startTime !== undefined) {
      this.duration += Date.now() - this.startTime;
      this.startTime = undefined;
    }
    return this.passedTime();
  }

  reset(): void {
    this.duration = 0;
    this.startTime = undefined;
  }

  passedTime(): number {
    const activeDuration = this.startTime === undefined
      ? this.duration
      : this.duration + Date.now() - this.startTime;
    return Math.round(activeDuration / 10) / 100;
  }
}
