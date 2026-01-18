import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InstanceAttributeManager } from './instance-attributes';

describe('InstanceAttributeManager', () => {
  let manager: InstanceAttributeManager;

  beforeEach(() => {
    manager = new InstanceAttributeManager();
  });

  describe('registerAttribute', () => {
    it('should register an attribute', () => {
      const mockAttribute = { setX: vi.fn(), needsUpdate: false };
      manager.registerAttribute('selection', mockAttribute);

      expect(manager.hasAttribute('selection')).toBe(true);
    });

    it('should allow multiple attributes', () => {
      const mockAttr1 = { setX: vi.fn(), needsUpdate: false };
      const mockAttr2 = { setX: vi.fn(), needsUpdate: false };
      manager.registerAttribute('selection', mockAttr1);
      manager.registerAttribute('pulse', mockAttr2);

      expect(manager.hasAttribute('selection')).toBe(true);
      expect(manager.hasAttribute('pulse')).toBe(true);
    });
  });

  describe('unregisterAttribute', () => {
    it('should unregister an attribute', () => {
      const mockAttribute = { setX: vi.fn(), needsUpdate: false };
      manager.registerAttribute('selection', mockAttribute);

      manager.unregisterAttribute('selection');

      expect(manager.hasAttribute('selection')).toBe(false);
    });
  });

  describe('setInstanceValue', () => {
    it('should update attribute value', () => {
      const mockAttribute = { setX: vi.fn(), needsUpdate: false };
      manager.registerAttribute('selection', mockAttribute);

      manager.setInstanceValue('selection', 0, 0.5);

      expect(mockAttribute.setX).toHaveBeenCalledWith(0, 0.5);
      expect(mockAttribute.needsUpdate).toBe(true);
    });

    it('should not throw for unregistered attribute', () => {
      expect(() => manager.setInstanceValue('unknown', 0, 0.5)).not.toThrow();
    });
  });

  describe('createBinding', () => {
    it('should create a reactive binding for an instance', () => {
      const mockAttribute = { setX: vi.fn(), needsUpdate: false };
      manager.registerAttribute('selection', mockAttribute);

      const binding = manager.createBinding('selection', 0, {
        initialState: false,
        transform: (s: boolean) => (s ? 1 : 0),
      });

      expect(binding).toBeDefined();
    });

    it('should track bindings', () => {
      const mockAttribute = { setX: vi.fn(), needsUpdate: false };
      manager.registerAttribute('selection', mockAttribute);

      manager.createBinding('selection', 0, {
        initialState: false,
        transform: (s: boolean) => (s ? 1 : 0),
      });
      manager.createBinding('selection', 1, {
        initialState: false,
        transform: (s: boolean) => (s ? 1 : 0),
      });

      expect(manager.bindingCount).toBe(2);
    });

    it('should update attribute when binding value changes', () => {
      const mockAttribute = { setX: vi.fn(), needsUpdate: false };
      manager.registerAttribute('selection', mockAttribute);

      const binding = manager.createBinding('selection', 0, {
        initialState: false,
        transform: (s: boolean) => (s ? 1 : 0),
      });

      binding.setState(true);
      manager.updateBindings(0.016);

      expect(mockAttribute.setX).toHaveBeenCalledWith(0, 1);
    });
  });

  describe('updateBindings', () => {
    it('should update all active bindings', () => {
      const mockAttribute = { setX: vi.fn(), needsUpdate: false };
      manager.registerAttribute('selection', mockAttribute);

      const binding1 = manager.createBinding('selection', 0, {
        initialState: false,
        transform: (s: boolean) => (s ? 1 : 0),
        transitionDuration: 500,
      });

      const binding2 = manager.createBinding('selection', 1, {
        initialState: false,
        transform: (s: boolean) => (s ? 1 : 0),
        transitionDuration: 500,
      });

      binding1.setState(true);
      binding2.setState(true);
      manager.updateBindings(0.25);

      // Both should have been updated
      expect(mockAttribute.setX).toHaveBeenCalled();
      expect(mockAttribute.setX).toHaveBeenCalledWith(0, expect.any(Number));
      expect(mockAttribute.setX).toHaveBeenCalledWith(1, expect.any(Number));
    });

    it('should handle bindings with missing attributes', () => {
      const mockAttribute = { setX: vi.fn(), needsUpdate: false };
      manager.registerAttribute('selection', mockAttribute);

      manager.createBinding('nonexistent', 0, {
        initialState: false,
        transform: (s: boolean) => (s ? 1 : 0),
      });

      // Should not throw
      expect(() => manager.updateBindings(0.016)).not.toThrow();
    });
  });

  describe('removeBinding', () => {
    it('should remove a specific binding', () => {
      const mockAttribute = { setX: vi.fn(), needsUpdate: false };
      manager.registerAttribute('selection', mockAttribute);

      manager.createBinding('selection', 0, {
        initialState: false,
        transform: (s: boolean) => (s ? 1 : 0),
      });
      manager.createBinding('selection', 1, {
        initialState: false,
        transform: (s: boolean) => (s ? 1 : 0),
      });

      manager.removeBinding('selection', 0);

      expect(manager.bindingCount).toBe(1);
    });

    it('should not throw for nonexistent binding', () => {
      expect(() => manager.removeBinding('selection', 99)).not.toThrow();
    });
  });

  describe('dispose', () => {
    it('should clear all bindings and attributes', () => {
      const mockAttribute = { setX: vi.fn(), needsUpdate: false };
      manager.registerAttribute('selection', mockAttribute);
      manager.createBinding('selection', 0, {
        initialState: false,
        transform: (s: boolean) => (s ? 1 : 0),
      });

      manager.dispose();

      expect(manager.hasAttribute('selection')).toBe(false);
      expect(manager.bindingCount).toBe(0);
    });
  });
});
