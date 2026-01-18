/**
 * Tests for constellation animation setup utility
 *
 * TDD: These tests define the expected behavior for the setup function
 * that wires AnimationSystem into the constellation visualization.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnimationSystem } from '../core/animation-system';
import {
  ConstellationAnimationSetup,
  type ConstellationAnimationConfig,
} from './constellation-animation-setup';
import type { ShaderUniforms } from '../types';

describe('ConstellationAnimationSetup', () => {
  let system: AnimationSystem;
  let setup: ConstellationAnimationSetup;

  beforeEach(() => {
    system = new AnimationSystem();
    setup = new ConstellationAnimationSetup(system);
  });

  describe('material registration', () => {
    it('should register ghost node uniforms', () => {
      const uniforms: ShaderUniforms = { uTime: { value: 0 } };

      setup.registerGhostNodes(uniforms);

      expect(system.hasShaderLoop('ghostNodes')).toBe(true);
    });

    it('should register biography node uniforms', () => {
      const uniforms: ShaderUniforms = { uTime: { value: 0 } };

      setup.registerBiographyNodes(uniforms);

      expect(system.hasShaderLoop('biographyNodes')).toBe(true);
    });

    it('should register edge uniforms', () => {
      const uniforms: ShaderUniforms = { uTime: { value: 0 } };

      setup.registerEdges(uniforms);

      expect(system.hasShaderLoop('edges')).toBe(true);
    });

    it('should register background particles uniforms', () => {
      const uniforms: ShaderUniforms = { uTime: { value: 0 } };

      setup.registerBackgroundParticles(uniforms);

      expect(system.hasShaderLoop('backgroundParticles')).toBe(true);
    });

    it('should register event fireflies uniforms', () => {
      const uniforms: ShaderUniforms = { uTime: { value: 0 } };

      setup.registerEventFireflies(uniforms);

      expect(system.hasShaderLoop('eventFireflies')).toBe(true);
    });
  });

  describe('bulk registration', () => {
    it('should register all materials from config', () => {
      const config: ConstellationAnimationConfig = {
        ghostNodes: { uTime: { value: 0 } },
        biographyNodes: { uTime: { value: 0 } },
        edges: { uTime: { value: 0 } },
        backgroundParticles: { uTime: { value: 0 } },
        eventFireflies: { uTime: { value: 0 } },
      };

      setup.registerAll(config);

      expect(system.hasShaderLoop('ghostNodes')).toBe(true);
      expect(system.hasShaderLoop('biographyNodes')).toBe(true);
      expect(system.hasShaderLoop('edges')).toBe(true);
      expect(system.hasShaderLoop('backgroundParticles')).toBe(true);
      expect(system.hasShaderLoop('eventFireflies')).toBe(true);
    });

    it('should handle partial config (optional materials)', () => {
      const config: ConstellationAnimationConfig = {
        ghostNodes: { uTime: { value: 0 } },
        biographyNodes: { uTime: { value: 0 } },
        // edges, backgroundParticles, eventFireflies not provided
      };

      setup.registerAll(config);

      expect(system.hasShaderLoop('ghostNodes')).toBe(true);
      expect(system.hasShaderLoop('biographyNodes')).toBe(true);
      expect(system.hasShaderLoop('edges')).toBe(false);
      expect(system.hasShaderLoop('backgroundParticles')).toBe(false);
      expect(system.hasShaderLoop('eventFireflies')).toBe(false);
    });
  });

  describe('unregistration', () => {
    it('should unregister ghost nodes', () => {
      const uniforms: ShaderUniforms = { uTime: { value: 0 } };
      setup.registerGhostNodes(uniforms);

      setup.unregisterGhostNodes();

      expect(system.hasShaderLoop('ghostNodes')).toBe(false);
    });

    it('should unregister all materials', () => {
      const config: ConstellationAnimationConfig = {
        ghostNodes: { uTime: { value: 0 } },
        biographyNodes: { uTime: { value: 0 } },
        edges: { uTime: { value: 0 } },
      };
      setup.registerAll(config);

      setup.unregisterAll();

      expect(system.hasShaderLoop('ghostNodes')).toBe(false);
      expect(system.hasShaderLoop('biographyNodes')).toBe(false);
      expect(system.hasShaderLoop('edges')).toBe(false);
    });
  });

  describe('time synchronization', () => {
    it('should update all registered materials when system updates', () => {
      const ghostUniforms: ShaderUniforms = { uTime: { value: 0 } };
      const biographyUniforms: ShaderUniforms = { uTime: { value: 0 } };

      setup.registerGhostNodes(ghostUniforms);
      setup.registerBiographyNodes(biographyUniforms);

      system.update(0.05);

      expect(ghostUniforms.uTime.value).toBeCloseTo(0.05);
      expect(biographyUniforms.uTime.value).toBeCloseTo(0.05);
    });
  });

  describe('registration status', () => {
    it('should report which materials are registered', () => {
      setup.registerGhostNodes({ uTime: { value: 0 } });
      setup.registerEdges({ uTime: { value: 0 } });

      const status = setup.getRegistrationStatus();

      expect(status.ghostNodes).toBe(true);
      expect(status.biographyNodes).toBe(false);
      expect(status.edges).toBe(true);
      expect(status.backgroundParticles).toBe(false);
      expect(status.eventFireflies).toBe(false);
    });

    it('should count registered materials', () => {
      setup.registerGhostNodes({ uTime: { value: 0 } });
      setup.registerBiographyNodes({ uTime: { value: 0 } });
      setup.registerEdges({ uTime: { value: 0 } });

      expect(setup.getRegisteredCount()).toBe(3);
    });
  });

  describe('re-registration', () => {
    it('should replace existing registration with new uniforms', () => {
      const oldUniforms: ShaderUniforms = { uTime: { value: 0 } };
      const newUniforms: ShaderUniforms = { uTime: { value: 0 } };

      setup.registerGhostNodes(oldUniforms);
      setup.registerGhostNodes(newUniforms);

      system.update(0.05);

      // New uniforms should be updated
      expect(newUniforms.uTime.value).toBeCloseTo(0.05);
      // Old uniforms should not be updated (no longer registered)
      expect(oldUniforms.uTime.value).toBe(0);
    });
  });
});

describe('ConstellationAnimationSetup Debug', () => {
  it('should expose animation system for debugging', () => {
    const system = new AnimationSystem();
    const setup = new ConstellationAnimationSetup(system);

    expect(setup.getAnimationSystem()).toBe(system);
  });

  it('should provide access to debug info', () => {
    const system = new AnimationSystem();
    const setup = new ConstellationAnimationSetup(system);

    setup.registerGhostNodes({ uTime: { value: 0 } });

    const info = setup.getDebugInfo();

    expect(info.shaderLoopCount).toBe(1);
    expect(info.shaderLoopNames).toContain('ghostNodes');
  });
});
