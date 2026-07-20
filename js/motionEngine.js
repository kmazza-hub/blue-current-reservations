/**
 * Blue Current Motion Engine
 *
 * Provides a small shared timeline system for coordinated demo events.
 * This file does not change the page by itself until app.js initializes it.
 */

class MotionEngine {
  constructor() {
    this.steps = [];
    this.currentStepIndex = -1;
    this.isRunning = false;
    this.isPaused = false;
    this.timerId = null;
  }

  /**
   * Replace the current timeline.
   *
   * Each step should have:
   * - name: human-readable label
   * - delay: milliseconds before running
   * - action: function to execute
   */
  load(steps = []) {
    if (!Array.isArray(steps)) {
      throw new TypeError("MotionEngine.load expects an array.");
    }

    this.reset();
    this.steps = steps;
  }

  start() {
    if (this.isRunning || this.steps.length === 0) {
      return;
    }

    this.isRunning = true;
    this.isPaused = false;
    this.runNextStep();
  }

  pause() {
    if (!this.isRunning) {
      return;
    }

    this.isPaused = true;

    if (this.timerId) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  resume() {
    if (!this.isRunning || !this.isPaused) {
      return;
    }

    this.isPaused = false;
    this.runNextStep();
  }

  reset() {
    if (this.timerId) {
      window.clearTimeout(this.timerId);
    }

    this.timerId = null;
    this.currentStepIndex = -1;
    this.isRunning = false;
    this.isPaused = false;
  }

  runNextStep() {
    if (!this.isRunning || this.isPaused) {
      return;
    }

    this.currentStepIndex += 1;

    if (this.currentStepIndex >= this.steps.length) {
      this.isRunning = false;
      this.timerId = null;
      return;
    }

    const step = this.steps[this.currentStepIndex];
    const delay = Number.isFinite(step.delay) ? step.delay : 0;

    this.timerId = window.setTimeout(() => {
      try {
        if (typeof step.action === "function") {
          step.action();
        }
      } catch (error) {
        console.error(
          `Motion Engine step failed: ${step.name || this.currentStepIndex}`,
          error
        );
      }

      this.runNextStep();
    }, delay);
  }
}

window.BlueCurrentMotionEngine = MotionEngine;