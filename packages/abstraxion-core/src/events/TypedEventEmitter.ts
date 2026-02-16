/**
 * Event handler function type
 */
export type EventHandler<T> = (data: T) => void;

/**
 * Simple typed event emitter for SDK events
 * Provides type-safe event subscription and emission
 */
export class TypedEventEmitter<Events extends Record<string, unknown>> {
  private listeners: Map<keyof Events, Set<EventHandler<unknown>>> = new Map();

  /**
   * Register an event listener
   * @param event - The event name to listen for
   * @param handler - The handler function to call when the event fires
   */
  on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as EventHandler<unknown>);
  }

  /**
   * Unregister an event listener
   * @param event - The event name to stop listening for
   * @param handler - The handler function to remove
   */
  off<K extends keyof Events>(
    event: K,
    handler: EventHandler<Events[K]>,
  ): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler as EventHandler<unknown>);
    }
  }

  /**
   * Register a one-time event listener
   * The handler will be automatically removed after being called once
   * @param event - The event name to listen for
   * @param handler - The handler function to call when the event fires
   */
  once<K extends keyof Events>(
    event: K,
    handler: EventHandler<Events[K]>,
  ): void {
    const onceHandler = ((data: Events[K]) => {
      handler(data);
      this.off(event, onceHandler);
    }) as EventHandler<Events[K]>;
    this.on(event, onceHandler);
  }

  /**
   * Emit an event to all registered listeners
   * @param event - The event name to emit
   * @param data - The data to pass to listeners
   */
  public emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${String(event)}:`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for a specific event or all events
   * @param event - Optional event name. If omitted, removes all listeners for all events.
   */
  removeAllListeners(event?: keyof Events): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}
