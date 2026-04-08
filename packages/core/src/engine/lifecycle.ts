export type LifecycleStage
  = | 'BOOTSTRAP'
    | 'SERVER_START'
    | 'WAITING'
    | 'CONNECTION'
    | 'RUNTIME'
    | 'DISCONNECT'
    | 'STOPPING'
    | 'SHUTDOWN';

export class LifecycleController {
  private stage: LifecycleStage = 'BOOTSTRAP';
  private readonly listeners = new Set<(next: LifecycleStage) => void>();

  current(): LifecycleStage {
    return this.stage;
  }

  transition(next: LifecycleStage): void {
    this.stage = next;
    for (const listener of this.listeners) {
      listener(next);
    }
  }

  toServerStart(): void {
    this.transition('SERVER_START');
  }

  toWaiting(): void {
    this.transition('WAITING');
  }

  toConnection(): void {
    this.transition('CONNECTION');
  }

  toRuntime(): void {
    this.transition('RUNTIME');
  }

  toDisconnect(): void {
    this.transition('DISCONNECT');
  }

  toStopping(): void {
    this.transition('STOPPING');
  }

  toShutdown(): void {
    this.transition('SHUTDOWN');
  }

  subscribe(listener: (next: LifecycleStage) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export function createLifecycleController(): LifecycleController {
  return new LifecycleController();
}
