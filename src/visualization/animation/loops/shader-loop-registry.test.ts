import { describe, it, expect, beforeEach } from 'vitest';
import { ShaderLoopRegistry } from './shader-loop-registry';
import type { ShaderUniforms } from '../types';

describe('ShaderLoopRegistry', () => {
  let registry: ShaderLoopRegistry;
  let uniforms1: ShaderUniforms;
  let uniforms2: ShaderUniforms;

  beforeEach(() => {
    registry = new ShaderLoopRegistry();
    uniforms1 = { uTime: { value: 0 } };
    uniforms2 = { uTime: { value: 0 } };
  });

  describe('register', () => {
    it('should register a shader loop', () => {
      const loop = registry.register('ghost', uniforms1);
      expect(loop).toBeDefined();
    });

    it('should return the same loop for the same name', () => {
      const loop1 = registry.register('ghost', uniforms1);
      const loop2 = registry.register('ghost', uniforms1);
      expect(loop1).toBe(loop2);
    });

    it('should register multiple loops', () => {
      registry.register('ghost', uniforms1);
      registry.register('cloud', uniforms2);
      expect(registry.count).toBe(2);
    });
  });

  describe('update', () => {
    it('should update all registered loops', () => {
      registry.register('ghost', uniforms1);
      registry.register('cloud', uniforms2);

      registry.update(1.5);

      expect(uniforms1.uTime.value).toBe(1.5);
      expect(uniforms2.uTime.value).toBe(1.5);
    });

    it('should do nothing when no loops registered', () => {
      expect(() => registry.update(1.0)).not.toThrow();
    });
  });

  describe('unregister', () => {
    it('should unregister a loop by name', () => {
      registry.register('ghost', uniforms1);
      registry.unregister('ghost');

      expect(registry.count).toBe(0);
    });

    it('should not throw for unknown name', () => {
      expect(() => registry.unregister('unknown')).not.toThrow();
    });

    it('should not update unregistered loops', () => {
      registry.register('ghost', uniforms1);
      registry.unregister('ghost');

      uniforms1.uTime.value = 0;
      registry.update(1.0);

      expect(uniforms1.uTime.value).toBe(0);
    });
  });

  describe('get', () => {
    it('should get a registered loop by name', () => {
      const registered = registry.register('ghost', uniforms1);
      const retrieved = registry.get('ghost');
      expect(retrieved).toBe(registered);
    });

    it('should return undefined for unknown name', () => {
      expect(registry.get('unknown')).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should clear all registered loops', () => {
      registry.register('ghost', uniforms1);
      registry.register('cloud', uniforms2);

      registry.clear();

      expect(registry.count).toBe(0);
    });
  });

  describe('count', () => {
    it('should return the number of registered loops', () => {
      expect(registry.count).toBe(0);

      registry.register('ghost', uniforms1);
      expect(registry.count).toBe(1);

      registry.register('cloud', uniforms2);
      expect(registry.count).toBe(2);
    });
  });

  describe('names', () => {
    it('should return all registered loop names', () => {
      registry.register('ghost', uniforms1);
      registry.register('cloud', uniforms2);

      const names = registry.names;
      expect(names).toContain('ghost');
      expect(names).toContain('cloud');
      expect(names).toHaveLength(2);
    });

    it('should return empty array when no loops registered', () => {
      expect(registry.names).toEqual([]);
    });
  });
});
