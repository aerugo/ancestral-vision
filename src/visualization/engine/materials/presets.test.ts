/**
 * @vitest-environment node
 *
 * MaterialPresets Tests (TDD)
 *
 * Tests for the material preset definitions and factory functions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock FlowingMaterial
const mockFlowingMaterial = {
  configure: vi.fn(),
  update: vi.fn(),
  getUniforms: vi.fn(() => ({
    baseColor: [1, 1, 1],
    emissive: [0, 0, 0],
    emissiveStrength: 0,
    flowSpeed: 0.5,
    flowScale: 1.0,
    turbulence: 1.0,
    triplanarBlend: 4.0,
    metallic: 0,
    roughness: 0.5,
    time: 0,
  })),
  loadTextures: vi.fn(() => Promise.resolve()),
  dispose: vi.fn(),
};

vi.mock('./flowing-material', () => ({
  createFlowingMaterial: vi.fn(() => mockFlowingMaterial),
}));

import {
  MATERIAL_PRESETS,
  MaterialPresetName,
  MaterialPreset,
  createMaterialFromPreset,
  getPresetNames,
  getPreset,
  getRandomPreset,
  applyPresetToMaterial,
} from './presets';

describe('presets module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MATERIAL_PRESETS', () => {
    it('should export MATERIAL_PRESETS constant', () => {
      expect(MATERIAL_PRESETS).toBeDefined();
      expect(typeof MATERIAL_PRESETS).toBe('object');
    });

    it('should contain lava preset', () => {
      expect(MATERIAL_PRESETS.lava).toBeDefined();
    });

    it('should contain celestial preset', () => {
      expect(MATERIAL_PRESETS.celestial).toBeDefined();
    });

    it('should contain sacred preset', () => {
      expect(MATERIAL_PRESETS.sacred).toBeDefined();
    });
  });

  describe('lava preset', () => {
    it('should have warm/hot color palette', () => {
      const preset = MATERIAL_PRESETS.lava;

      // Base color should be warm (red/orange dominant)
      expect(preset.baseColor[0]).toBeGreaterThan(preset.baseColor[2]);
    });

    it('should have emissive glow', () => {
      const preset = MATERIAL_PRESETS.lava;

      expect(preset.emissiveStrength).toBeGreaterThan(0);
    });

    it('should have texture reference', () => {
      const preset = MATERIAL_PRESETS.lava;

      expect(preset.baseTexture).toBeDefined();
      expect(typeof preset.baseTexture).toBe('string');
    });

    it('should have moderate flow speed', () => {
      const preset = MATERIAL_PRESETS.lava;

      expect(preset.flowSpeed).toBeGreaterThan(0);
      expect(preset.flowSpeed).toBeLessThan(2);
    });

    it('should have appropriate turbulence', () => {
      const preset = MATERIAL_PRESETS.lava;

      expect(preset.turbulence).toBeGreaterThan(0);
    });
  });

  describe('celestial preset', () => {
    it('should have cool color palette', () => {
      const preset = MATERIAL_PRESETS.celestial;

      // Base color should be cool (blue dominant)
      expect(preset.baseColor[2]).toBeGreaterThan(preset.baseColor[0]);
    });

    it('should have softer emissive than lava', () => {
      const preset = MATERIAL_PRESETS.celestial;

      expect(preset.emissiveStrength).toBeLessThanOrEqual(
        MATERIAL_PRESETS.lava.emissiveStrength
      );
    });

    it('should have slower flow speed than lava', () => {
      const preset = MATERIAL_PRESETS.celestial;

      expect(preset.flowSpeed).toBeLessThan(MATERIAL_PRESETS.lava.flowSpeed);
    });
  });

  describe('sacred preset', () => {
    it('should have golden color palette', () => {
      const preset = MATERIAL_PRESETS.sacred;

      // Golden colors have high red, high green, lower blue
      expect(preset.baseColor[0]).toBeGreaterThan(0.5);
      expect(preset.baseColor[1]).toBeGreaterThan(0.3);
    });

    it('should have subtle emissive', () => {
      const preset = MATERIAL_PRESETS.sacred;

      expect(preset.emissiveStrength).toBeGreaterThan(0);
      expect(preset.emissiveStrength).toBeLessThanOrEqual(
        MATERIAL_PRESETS.lava.emissiveStrength
      );
    });

    it('should have slowest flow speed', () => {
      const preset = MATERIAL_PRESETS.sacred;

      expect(preset.flowSpeed).toBeLessThanOrEqual(
        MATERIAL_PRESETS.celestial.flowSpeed
      );
    });
  });

  describe('MaterialPreset interface', () => {
    it('should have all required properties on each preset', () => {
      for (const [name, preset] of Object.entries(MATERIAL_PRESETS)) {
        expect(preset.baseColor).toHaveLength(3);
        expect(preset.emissive).toHaveLength(3);
        expect(typeof preset.emissiveStrength).toBe('number');
        expect(typeof preset.flowSpeed).toBe('number');
        expect(typeof preset.flowScale).toBe('number');
        expect(typeof preset.turbulence).toBe('number');
        expect(typeof preset.baseTexture).toBe('string');
      }
    });

    it('should have valid color values (0-1 range)', () => {
      for (const preset of Object.values(MATERIAL_PRESETS)) {
        for (const c of preset.baseColor) {
          expect(c).toBeGreaterThanOrEqual(0);
          expect(c).toBeLessThanOrEqual(1);
        }
        for (const c of preset.emissive) {
          expect(c).toBeGreaterThanOrEqual(0);
          expect(c).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe('getPresetNames', () => {
    it('should return array of preset names', () => {
      const names = getPresetNames();

      expect(Array.isArray(names)).toBe(true);
      expect(names.length).toBe(Object.keys(MATERIAL_PRESETS).length);
    });

    it('should include all defined presets', () => {
      const names = getPresetNames();

      expect(names).toContain('lava');
      expect(names).toContain('celestial');
      expect(names).toContain('sacred');
    });
  });

  describe('getPreset', () => {
    it('should return preset by name', () => {
      const preset = getPreset('lava');

      expect(preset).toBe(MATERIAL_PRESETS.lava);
    });

    it('should return undefined for unknown preset', () => {
      const preset = getPreset('unknown' as MaterialPresetName);

      expect(preset).toBeUndefined();
    });
  });

  describe('getRandomPreset', () => {
    it('should return a valid preset', () => {
      const result = getRandomPreset();

      expect(result.name).toBeDefined();
      expect(result.preset).toBeDefined();
      expect(MATERIAL_PRESETS[result.name]).toBe(result.preset);
    });

    it('should return different presets over many calls (probabilistic)', () => {
      const results = new Set<string>();

      for (let i = 0; i < 100; i++) {
        results.add(getRandomPreset().name);
      }

      // Should have seen at least 2 different presets in 100 calls
      expect(results.size).toBeGreaterThan(1);
    });

    it('should accept seed for reproducibility', () => {
      const result1 = getRandomPreset(12345);
      const result2 = getRandomPreset(12345);

      expect(result1.name).toBe(result2.name);
    });
  });

  describe('createMaterialFromPreset', () => {
    it('should create material with preset configuration', () => {
      const mockDevice = {} as GPUDevice;
      const mockTextureManager = {} as Parameters<
        typeof createMaterialFromPreset
      >[1];

      createMaterialFromPreset(mockDevice, mockTextureManager, 'lava');

      expect(mockFlowingMaterial.configure).toHaveBeenCalledWith(
        expect.objectContaining({
          baseColor: MATERIAL_PRESETS.lava.baseColor,
          emissive: MATERIAL_PRESETS.lava.emissive,
        })
      );
    });

    it('should throw for unknown preset', () => {
      const mockDevice = {} as GPUDevice;
      const mockTextureManager = {} as Parameters<
        typeof createMaterialFromPreset
      >[1];

      expect(() =>
        createMaterialFromPreset(
          mockDevice,
          mockTextureManager,
          'unknown' as MaterialPresetName
        )
      ).toThrow('Unknown preset');
    });
  });

  describe('applyPresetToMaterial', () => {
    it('should configure material with preset values', () => {
      applyPresetToMaterial(mockFlowingMaterial as never, 'celestial');

      expect(mockFlowingMaterial.configure).toHaveBeenCalledWith(
        expect.objectContaining({
          baseColor: MATERIAL_PRESETS.celestial.baseColor,
          emissive: MATERIAL_PRESETS.celestial.emissive,
          emissiveStrength: MATERIAL_PRESETS.celestial.emissiveStrength,
          flowSpeed: MATERIAL_PRESETS.celestial.flowSpeed,
        })
      );
    });

    it('should throw for unknown preset', () => {
      expect(() =>
        applyPresetToMaterial(
          mockFlowingMaterial as never,
          'unknown' as MaterialPresetName
        )
      ).toThrow('Unknown preset');
    });
  });

  describe('preset texture paths', () => {
    it('should have valid texture names for all presets', () => {
      for (const preset of Object.values(MATERIAL_PRESETS)) {
        // Texture name should be a simple string without path separators
        expect(preset.baseTexture).toMatch(/^[a-z-]+$/);
      }
    });
  });
});

// Mock GPU constants for Node environment
const GPUBufferUsage = {
  UNIFORM: 0x0040,
  COPY_DST: 0x0008,
};
const GPUShaderStage = {
  VERTEX: 0x1,
  FRAGMENT: 0x2,
};
(globalThis as Record<string, unknown>).GPUBufferUsage = GPUBufferUsage;
(globalThis as Record<string, unknown>).GPUShaderStage = GPUShaderStage;
