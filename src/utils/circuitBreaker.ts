/**
 * Circuit Breaker States
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF-OPEN';

/**
 * Configuration options for the Circuit Breaker
 */
export interface CircuitBreakerOptions {
  failureThreshold?: number;     // Number of failures before tripping the circuit (Default: 5)
  timeoutMs?: number;            // Timeout for the async dependency call (Default: 5000ms)
  cooldownMs?: number;           // Cooldown period before transitioning to HALF-OPEN (Default: 10000ms)
  maxHalfOpenSuccesses?: number; // Consecutive successful trials in HALF-OPEN before closing the circuit (Default: 2)
  maxConcurrency?: number;       // Maximum concurrent executions allowed to this dependency (Default: 10)
}

/**
 * A highly resilient, type-safe Circuit Breaker implementation with State Management,
 * Timeouts, Fallbacks, Concurrency Limiting, and Auto-Recovery.
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private activeCount = 0; // Tracking active concurrent executions
  private lastStateChange: number = Date.now();
  private name: string;

  private failureThreshold: number;
  private timeoutMs: number;
  private cooldownMs: number;
  private maxHalfOpenSuccesses: number;
  private maxConcurrency: number;

  constructor(name: string, options: CircuitBreakerOptions = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.cooldownMs = options.cooldownMs ?? 10000;
    this.maxHalfOpenSuccesses = options.maxHalfOpenSuccesses ?? 2;
    this.maxConcurrency = options.maxConcurrency ?? 10;
  }

  /**
   * Get the current state of the circuit breaker
   */
  public getState(): CircuitState {
    this.checkCooldown();
    return this.state;
  }

  /**
   * Transition the circuit to a new state
   */
  private transitionTo(newState: CircuitState) {
    if (this.state !== newState) {
      console.warn(`[CircuitBreaker: ${this.name}] State transitioning from ${this.state} to ${newState}`);
      this.state = newState;
      this.lastStateChange = Date.now();
      
      // Reset state-specific counts
      if (newState === 'CLOSED') {
        this.failureCount = 0;
        this.successCount = 0;
      } else if (newState === 'OPEN') {
        this.successCount = 0;
      } else if (newState === 'HALF-OPEN') {
        this.successCount = 0;
        this.failureCount = 0;
      }
    }
  }

  /**
   * Check if the cooldown period has expired to move from OPEN to HALF-OPEN
   */
  private checkCooldown() {
    if (this.state === 'OPEN' && (Date.now() - this.lastStateChange) >= this.cooldownMs) {
      this.transitionTo('HALF-OPEN');
    }
  }

  /**
   * Execute an asynchronous task protected by the circuit breaker
   */
  public async execute<T>(
    task: () => Promise<T>,
    fallback?: () => T | Promise<T>
  ): Promise<T> {
    this.checkCooldown();

    // 1. FAST-FAIL if the circuit is OPEN
    if (this.state === 'OPEN') {
      if (fallback) {
        console.warn(`[CircuitBreaker: ${this.name}] Circuit is OPEN. Fast-failing and executing fallback.`);
        return await fallback();
      }
      throw new Error(`[CircuitBreaker: ${this.name}] Circuit is OPEN. Request fast-failed.`);
    }

    // 2. CONCURRENCY LIMIT check
    if (this.activeCount >= this.maxConcurrency) {
      if (fallback) {
        console.warn(`[CircuitBreaker: ${this.name}] Concurrency limit (${this.maxConcurrency}) reached. Fast-failing and executing fallback.`);
        return await fallback();
      }
      throw new Error(`[CircuitBreaker: ${this.name}] Concurrency limit reached. Request rejected.`);
    }

    this.activeCount++;

    try {
      // 3. TIMEOUT execution wrapper
      const response = await this.runWithTimeout(task);
      this.onSuccess();
      return response;
    } catch (error) {
      this.onFailure(error);
      if (fallback) {
        console.warn(`[CircuitBreaker: ${this.name}] Execution failed/timed out. Serving fallback.`);
        return await fallback();
      }
      throw error;
    } finally {
      this.activeCount = Math.max(0, this.activeCount - 1);
    }
  }

  /**
   * Run the task with a timeout promise races
   */
  private runWithTimeout<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let completed = false;
      const timer = setTimeout(() => {
        if (!completed) {
          completed = true;
          reject(new Error(`[CircuitBreaker: ${this.name}] Operation timed out after ${this.timeoutMs}ms`));
        }
      }, this.timeoutMs);

      task()
        .then((res) => {
          if (!completed) {
            completed = true;
            clearTimeout(timer);
            resolve(res);
          }
        })
        .catch((err) => {
          if (!completed) {
            completed = true;
            clearTimeout(timer);
            reject(err);
          }
        });
    });
  }

  /**
   * Handle successful executions to support recovery
   */
  private onSuccess() {
    if (this.state === 'HALF-OPEN') {
      this.successCount++;
      if (this.successCount >= this.maxHalfOpenSuccesses) {
        this.transitionTo('CLOSED');
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0; // Reset consecutive failures on success
    }
  }

  /**
   * Handle execution failures to trip the circuit
   */
  private onFailure(error: any) {
    console.error(`[CircuitBreaker: ${this.name}] Execution failure:`, error);
    this.failureCount++;

    if (this.state === 'CLOSED') {
      if (this.failureCount >= this.failureThreshold) {
        this.transitionTo('OPEN');
      }
    } else if (this.state === 'HALF-OPEN') {
      // Any failure during HALF-OPEN immediately trips it back to OPEN
      this.transitionTo('OPEN');
    }
  }
}

/**
 * Instantiate a default circuit breaker for Firebase/Firestore database services
 */
export const dbCircuitBreaker = new CircuitBreaker('FirestoreDatabase', {
  failureThreshold: 3,      // Tripping after 3 consecutive failures
  timeoutMs: 8000,          // 8 seconds timeout
  cooldownMs: 15000,        // 15 seconds cooldown before retry
  maxHalfOpenSuccesses: 2,  // 2 consecutive trial successes to close
  maxConcurrency: 15        // Limit concurrency to 15 parallel db queries
});
