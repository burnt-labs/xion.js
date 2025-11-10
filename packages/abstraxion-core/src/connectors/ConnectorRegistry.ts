/**
 * Connector registry
 * Manages available connectors and provides lookup/filtering
 */

import type { Connector, ConnectorType } from "./types";

export class ConnectorRegistry {
  private connectors: Map<string, Connector> = new Map();

  /**
   * Register a connector
   */
  register(connector: Connector): void {
    if (this.connectors.has(connector.metadata.id)) {
      console.warn(
        `Connector with ID "${connector.metadata.id}" already registered, overwriting`,
      );
    }
    this.connectors.set(connector.metadata.id, connector);
  }

  /**
   * Register multiple connectors
   */
  registerAll(connectors: Connector[]): void {
    for (const connector of connectors) {
      this.register(connector);
    }
  }

  /**
   * Get a connector by ID
   */
  get(id: string): Connector | undefined {
    return this.connectors.get(id);
  }

  /**
   * Get all registered connectors
   */
  getAll(): Connector[] {
    return Array.from(this.connectors.values());
  }

  /**
   * Get connectors by type
   */
  getByType(type: ConnectorType): Connector[] {
    return this.getAll().filter((c) => c.metadata.type === type);
  }

  /**
   * Check which connectors are available
   * @returns Promise resolving to array of available connector IDs
   */
  async getAvailableIds(): Promise<string[]> {
    const available: string[] = [];
    const connectors = Array.from(this.connectors.values());

    for (const connector of connectors) {
      if (await connector.isAvailable()) {
        available.push(connector.metadata.id);
      }
    }

    return available;
  }

  /**
   * Get available connectors
   * @returns Promise resolving to array of available connectors
   */
  async getAvailable(): Promise<Connector[]> {
    const availableIds = await this.getAvailableIds();
    return availableIds.map((id) => this.connectors.get(id)!);
  }

  /**
   * Clear all registered connectors
   */
  clear(): void {
    this.connectors.clear();
  }
}
