/**
 * InstanceAttributeManager - Manages reactive bindings for instance attributes
 *
 * Coordinates ReactiveBindings with Three.js InstancedBufferAttribute updates.
 */
import { ReactiveBinding } from './reactive-binding';
import type { ReactiveBindingConfig } from '../types';

interface InstancedAttribute {
  setX(index: number, value: number): void;
  needsUpdate: boolean;
}

interface BindingEntry {
  binding: ReactiveBinding<unknown>;
  attributeName: string;
  instanceIndex: number;
}

/**
 * InstanceAttributeManager - Manages instance attribute animations
 */
export class InstanceAttributeManager {
  private readonly _attributes: Map<string, InstancedAttribute> = new Map();
  private readonly _bindings: BindingEntry[] = [];

  /**
   * Register an instanced attribute for management
   */
  public registerAttribute(name: string, attribute: InstancedAttribute): void {
    this._attributes.set(name, attribute);
  }

  /**
   * Check if an attribute is registered
   */
  public hasAttribute(name: string): boolean {
    return this._attributes.has(name);
  }

  /**
   * Unregister an attribute
   */
  public unregisterAttribute(name: string): void {
    this._attributes.delete(name);
  }

  /**
   * Set a value directly (no animation)
   */
  public setInstanceValue(attributeName: string, instanceIndex: number, value: number): void {
    const attribute = this._attributes.get(attributeName);
    if (!attribute) {
      return;
    }

    attribute.setX(instanceIndex, value);
    attribute.needsUpdate = true;
  }

  /**
   * Create a reactive binding for an instance
   */
  public createBinding<T>(
    attributeName: string,
    instanceIndex: number,
    config: ReactiveBindingConfig<T>
  ): ReactiveBinding<T> {
    const binding = new ReactiveBinding(config);

    this._bindings.push({
      binding: binding as ReactiveBinding<unknown>,
      attributeName,
      instanceIndex,
    });

    return binding;
  }

  /**
   * Update all bindings and sync to attributes
   * @param deltaTime - Time elapsed in seconds
   */
  public updateBindings(deltaTime: number): void {
    for (const entry of this._bindings) {
      entry.binding.update(deltaTime);

      const attribute = this._attributes.get(entry.attributeName);
      if (attribute) {
        attribute.setX(entry.instanceIndex, entry.binding.getValue());
        attribute.needsUpdate = true;
      }
    }
  }

  /**
   * Remove a binding for a specific instance
   */
  public removeBinding(attributeName: string, instanceIndex: number): void {
    const index = this._bindings.findIndex(
      (e) => e.attributeName === attributeName && e.instanceIndex === instanceIndex
    );
    if (index >= 0) {
      this._bindings[index].binding.dispose();
      this._bindings.splice(index, 1);
    }
  }

  /**
   * Get binding count
   */
  public get bindingCount(): number {
    return this._bindings.length;
  }

  /**
   * Dispose all bindings and clear attributes
   */
  public dispose(): void {
    for (const entry of this._bindings) {
      entry.binding.dispose();
    }
    this._bindings.length = 0;
    this._attributes.clear();
  }
}
