import type { ComponentType, ConnectionScope } from './types';

export function createComponentId(scope: ConnectionScope, type: ComponentType): string {
  const next = (scope.counters.get(type) ?? 0) + 1;
  scope.counters.set(type, next);
  return `${type}-${next}`;
}

export function resetComponentCounters(scope: ConnectionScope): void {
  scope.counters.clear();
}
