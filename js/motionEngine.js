/**
 * Blue Current Motion Engine
 * Runs named timeline steps sequentially using each step's delay.
 */
class MotionEngine {
  constructor() {
    this.timeline = [];
    this.index = 0;
    this.timer = null;
    this.running = false;
  }

  load(timeline = []) {
    if (!Array.isArray(timeline)) {
      throw new TypeError("MotionEngine.load expects an array.");
    }
    this.stop();
    this.timeline = timeline;
    this.index = 0;
    return this;
  }

  start() {
    if (this.running || this.timeline.length === 0) return;
    this.running = true;
    this.#scheduleNext();
  }

  pause() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.running = false;
  }

  stop() {
    this.pause();
    this.index = 0;
  }

  restart() {
    this.stop();
    this.start();
  }

  #scheduleNext() {
    if (!this.running) return;
    const step = this.timeline[this.index];
    if (!step) {
      this.running = false;
      this.timer = null;
      return;
    }

    const delay = Number.isFinite(step.delay) ? Math.max(0, step.delay) : 0;
    this.timer = setTimeout(() => {
      try {
        step.action?.();
      } catch (error) {
        console.error(`Motion step failed: ${step.name || this.index}`, error);
      }
      this.index += 1;
      this.#scheduleNext();
    }, delay);
  }
}

window.BlueCurrentMotionEngine = MotionEngine;
