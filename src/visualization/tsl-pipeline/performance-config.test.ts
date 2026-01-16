/**
 * Performance Configuration Unit Tests
 *
 * Phase 5: Performance Optimization
 *
 * Tests for performance presets and configuration options
 * that control bloom quality, resolution scaling, and effect enables.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';

describe('performance-config module', () => {
  // ============================================================
  // Module Export Tests
  // ============================================================

  describe('module exports', () => {
    it('should export PerformancePreset enum', async () => {
      const module = await import('./performance-config');
      expect(module.PerformancePreset).toBeDefined();
      expect(module.PerformancePreset.LOW).toBe('LOW');
      expect(module.PerformancePreset.MEDIUM).toBe('MEDIUM');
      expect(module.PerformancePreset.HIGH).toBe('HIGH');
      expect(module.PerformancePreset.ULTRA).toBe('ULTRA');
    });

    it('should export getPerformanceConfig function', async () => {
      const module = await import('./performance-config');
      expect(module.getPerformanceConfig).toBeDefined();
      expect(typeof module.getPerformanceConfig).toBe('function');
    });

    it('should export DEFAULT_PERFORMANCE_CONFIG', async () => {
      const module = await import('./performance-config');
      expect(module.DEFAULT_PERFORMANCE_CONFIG).toBeDefined();
    });
  });

  // ============================================================
  // Mip Levels Tests
  // ============================================================

  describe('bloom mip levels', () => {
    it('should return bloomMipLevels=3 for LOW preset', async () => {
      const { getPerformanceConfig, PerformancePreset } = await import('./performance-config');
      const config = getPerformanceConfig(PerformancePreset.LOW);
      expect(config.bloomMipLevels).toBe(3);
    });

    it('should return bloomMipLevels=4 for MEDIUM preset', async () => {
      const { getPerformanceConfig, PerformancePreset } = await import('./performance-config');
      const config = getPerformanceConfig(PerformancePreset.MEDIUM);
      expect(config.bloomMipLevels).toBe(4);
    });

    it('should return bloomMipLevels=5 for HIGH preset', async () => {
      const { getPerformanceConfig, PerformancePreset } = await import('./performance-config');
      const config = getPerformanceConfig(PerformancePreset.HIGH);
      expect(config.bloomMipLevels).toBe(5);
    });

    it('should return bloomMipLevels=6 for ULTRA preset', async () => {
      const { getPerformanceConfig, PerformancePreset } = await import('./performance-config');
      const config = getPerformanceConfig(PerformancePreset.ULTRA);
      expect(config.bloomMipLevels).toBe(6);
    });
  });

  // ============================================================
  // Resolution Scale Tests
  // ============================================================

  describe('resolution scaling', () => {
    it('should return resolutionScale=0.5 for LOW preset', async () => {
      const { getPerformanceConfig, PerformancePreset } = await import('./performance-config');
      const config = getPerformanceConfig(PerformancePreset.LOW);
      expect(config.resolutionScale).toBe(0.5);
    });

    it('should return resolutionScale=0.75 for MEDIUM preset', async () => {
      const { getPerformanceConfig, PerformancePreset } = await import('./performance-config');
      const config = getPerformanceConfig(PerformancePreset.MEDIUM);
      expect(config.resolutionScale).toBe(0.75);
    });

    it('should return resolutionScale=1.0 for HIGH preset', async () => {
      const { getPerformanceConfig, PerformancePreset } = await import('./performance-config');
      const config = getPerformanceConfig(PerformancePreset.HIGH);
      expect(config.resolutionScale).toBe(1.0);
    });

    it('should return resolutionScale=1.0 for ULTRA preset', async () => {
      const { getPerformanceConfig, PerformancePreset } = await import('./performance-config');
      const config = getPerformanceConfig(PerformancePreset.ULTRA);
      expect(config.resolutionScale).toBe(1.0);
    });
  });

  // ============================================================
  // Effect Enable Tests
  // ============================================================

  describe('effect enables', () => {
    it('should disable all optional effects for LOW preset', async () => {
      const { getPerformanceConfig, PerformancePreset } = await import('./performance-config');
      const config = getPerformanceConfig(PerformancePreset.LOW);
      expect(config.enableDof).toBe(false);
      expect(config.enableChromaticAberration).toBe(false);
      expect(config.enableFilmGrain).toBe(false);
    });

    it('should enable only chromatic aberration for MEDIUM preset', async () => {
      const { getPerformanceConfig, PerformancePreset } = await import('./performance-config');
      const config = getPerformanceConfig(PerformancePreset.MEDIUM);
      expect(config.enableDof).toBe(false);
      expect(config.enableChromaticAberration).toBe(true);
      expect(config.enableFilmGrain).toBe(false);
    });

    it('should enable DOF and chromatic aberration for HIGH preset', async () => {
      const { getPerformanceConfig, PerformancePreset } = await import('./performance-config');
      const config = getPerformanceConfig(PerformancePreset.HIGH);
      expect(config.enableDof).toBe(true);
      expect(config.enableChromaticAberration).toBe(true);
      expect(config.enableFilmGrain).toBe(false);
    });

    it('should enable all effects for ULTRA preset', async () => {
      const { getPerformanceConfig, PerformancePreset } = await import('./performance-config');
      const config = getPerformanceConfig(PerformancePreset.ULTRA);
      expect(config.enableDof).toBe(true);
      expect(config.enableChromaticAberration).toBe(true);
      expect(config.enableFilmGrain).toBe(true);
    });
  });

  // ============================================================
  // Custom Config Tests
  // ============================================================

  describe('custom configuration', () => {
    it('should allow overriding preset values', async () => {
      const { getPerformanceConfig, PerformancePreset } = await import('./performance-config');
      const config = getPerformanceConfig(PerformancePreset.LOW, {
        bloomMipLevels: 5,
        enableDof: true,
      });

      // Overridden values
      expect(config.bloomMipLevels).toBe(5);
      expect(config.enableDof).toBe(true);

      // Non-overridden values remain from preset
      expect(config.resolutionScale).toBe(0.5);
      expect(config.enableFilmGrain).toBe(false);
    });

    it('should work with undefined preset (uses DEFAULT)', async () => {
      const { getPerformanceConfig, DEFAULT_PERFORMANCE_CONFIG } = await import('./performance-config');
      const config = getPerformanceConfig();

      expect(config.bloomMipLevels).toBe(DEFAULT_PERFORMANCE_CONFIG.bloomMipLevels);
      expect(config.resolutionScale).toBe(DEFAULT_PERFORMANCE_CONFIG.resolutionScale);
    });
  });

  // ============================================================
  // Integration Helper Tests
  // ============================================================

  describe('applyPerformanceConfig helper', () => {
    it('should export applyPerformanceConfig function', async () => {
      const module = await import('./performance-config');
      expect(module.applyPerformanceConfig).toBeDefined();
      expect(typeof module.applyPerformanceConfig).toBe('function');
    });

    it('should return post-processing config based on performance config', async () => {
      const { applyPerformanceConfig, PerformancePreset } = await import('./performance-config');

      const postProcessingConfig = applyPerformanceConfig(PerformancePreset.ULTRA, {
        bloom: { enabled: true, strength: 1.5, radius: 0.6, threshold: 0.2 },
        vignette: { enabled: true, darkness: 0.4, offset: 0.3 },
        dof: { enabled: true, focusDistance: 10, focalLength: 5, bokehScale: 2 },
        chromaticAberration: { enabled: true, strength: 0.02, center: { x: 0.5, y: 0.5 }, scale: 1 },
        filmGrain: { enabled: true, intensity: 0.5 },
      });

      // All effects enabled for ULTRA
      expect(postProcessingConfig.dof?.enabled).toBe(true);
      expect(postProcessingConfig.chromaticAberration?.enabled).toBe(true);
      expect(postProcessingConfig.filmGrain?.enabled).toBe(true);
    });

    it('should disable effects based on LOW preset', async () => {
      const { applyPerformanceConfig, PerformancePreset } = await import('./performance-config');

      const postProcessingConfig = applyPerformanceConfig(PerformancePreset.LOW, {
        bloom: { enabled: true, strength: 1.5, radius: 0.6, threshold: 0.2 },
        vignette: { enabled: true, darkness: 0.4, offset: 0.3 },
        dof: { enabled: true, focusDistance: 10, focalLength: 5, bokehScale: 2 },
        chromaticAberration: { enabled: true, strength: 0.02, center: { x: 0.5, y: 0.5 }, scale: 1 },
        filmGrain: { enabled: true, intensity: 0.5 },
      });

      // Effects disabled for LOW
      expect(postProcessingConfig.dof).toBeUndefined();
      expect(postProcessingConfig.chromaticAberration).toBeUndefined();
      expect(postProcessingConfig.filmGrain).toBeUndefined();
    });
  });
});
