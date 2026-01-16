# Phase 7: Theme Support

**Status**: Pending
**Started**:
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Implement light/dark theme switching that updates all visual elements including materials, lighting, background, and post-processing effects.

---

## Invariants Enforced in This Phase

- **INV-A009**: Resource Disposal - Theme-related resources cleaned up on switch

---

## TDD Steps

### Step 7.1: Write Failing Tests for Theme Manager (RED)

Create `src/visualization/effects/theme-manager.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import {
  createThemeManager,
  setTheme,
  getCurrentTheme,
  getDarkThemeColors,
  getLightThemeColors,
  type ThemeManager,
  type ThemeColors,
} from './theme-manager';

describe('theme-manager module', () => {
  describe('getDarkThemeColors', () => {
    it('should return dark theme color palette', () => {
      const colors = getDarkThemeColors();
      expect(colors).toHaveProperty('background');
      expect(colors).toHaveProperty('primary');
      expect(colors).toHaveProperty('secondary');
      expect(colors).toHaveProperty('ambient');
      expect(colors).toHaveProperty('grid');
    });

    it('should have cosmic indigo background', () => {
      const colors = getDarkThemeColors();
      expect(colors.background.getHex()).toBe(0x0a0612);
    });

    it('should have violet primary color', () => {
      const colors = getDarkThemeColors();
      expect(colors.primary.getHex()).toBe(0x9966cc);
    });

    it('should have gold secondary color', () => {
      const colors = getDarkThemeColors();
      expect(colors.secondary.getHex()).toBe(0xd4a84b);
    });
  });

  describe('getLightThemeColors', () => {
    it('should return light theme color palette', () => {
      const colors = getLightThemeColors();
      expect(colors).toHaveProperty('background');
      expect(colors).toHaveProperty('primary');
      expect(colors).toHaveProperty('secondary');
    });

    it('should have warm parchment background', () => {
      const colors = getLightThemeColors();
      expect(colors.background.getHex()).toBe(0xf5ebd7);
    });

    it('should have deep lapis primary color', () => {
      const colors = getLightThemeColors();
      expect(colors.primary.getHex()).toBe(0x1e3a8a);
    });
  });

  describe('createThemeManager', () => {
    it('should export createThemeManager function', () => {
      expect(createThemeManager).toBeDefined();
      expect(typeof createThemeManager).toBe('function');
    });

    it('should return theme manager interface', () => {
      const manager = createThemeManager();
      expect(manager).toHaveProperty('setTheme');
      expect(manager).toHaveProperty('getTheme');
      expect(manager).toHaveProperty('getColors');
      expect(manager).toHaveProperty('subscribe');
    });

    it('should default to dark theme', () => {
      const manager = createThemeManager();
      expect(manager.getTheme()).toBe('dark');
    });

    it('should accept initial theme', () => {
      const manager = createThemeManager({ initialTheme: 'light' });
      expect(manager.getTheme()).toBe('light');
    });
  });

  describe('ThemeManager.setTheme', () => {
    it('should switch to light theme', () => {
      const manager = createThemeManager();
      manager.setTheme('light');
      expect(manager.getTheme()).toBe('light');
    });

    it('should switch to dark theme', () => {
      const manager = createThemeManager({ initialTheme: 'light' });
      manager.setTheme('dark');
      expect(manager.getTheme()).toBe('dark');
    });

    it('should notify subscribers on theme change', () => {
      const manager = createThemeManager();
      const callback = vi.fn();
      manager.subscribe(callback);

      manager.setTheme('light');
      expect(callback).toHaveBeenCalledWith('light', expect.any(Object));
    });

    it('should not notify if theme unchanged', () => {
      const manager = createThemeManager();
      const callback = vi.fn();
      manager.subscribe(callback);

      manager.setTheme('dark'); // Already dark
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('ThemeManager.getColors', () => {
    it('should return dark theme colors when dark', () => {
      const manager = createThemeManager();
      const colors = manager.getColors();
      expect(colors.background.getHex()).toBe(0x0a0612);
    });

    it('should return light theme colors when light', () => {
      const manager = createThemeManager({ initialTheme: 'light' });
      const colors = manager.getColors();
      expect(colors.background.getHex()).toBe(0xf5ebd7);
    });
  });

  describe('ThemeManager.subscribe', () => {
    it('should return unsubscribe function', () => {
      const manager = createThemeManager();
      const unsubscribe = manager.subscribe(vi.fn());
      expect(typeof unsubscribe).toBe('function');
    });

    it('should stop notifications after unsubscribe', () => {
      const manager = createThemeManager();
      const callback = vi.fn();
      const unsubscribe = manager.subscribe(callback);

      unsubscribe();
      manager.setTheme('light');
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('setTheme utility', () => {
    it('should update scene background', () => {
      const scene = new THREE.Scene();
      const uniforms = {
        node: { uColorPrimary: { value: new THREE.Color() } },
      };

      setTheme('light', { scene, uniforms });
      expect((scene.background as THREE.Color).getHex()).toBe(0xf5ebd7);
    });

    it('should update material uniforms', () => {
      const scene = new THREE.Scene();
      const uniforms = {
        node: {
          uColorPrimary: { value: new THREE.Color() },
          uColorSecondary: { value: new THREE.Color() },
        },
      };

      setTheme('light', { scene, uniforms });
      expect(uniforms.node.uColorPrimary.value.getHex()).toBe(0x1e3a8a);
    });
  });
});
```

**Run tests to confirm RED**:

```bash
npx vitest src/visualization/effects/theme-manager.test.ts
```

### Step 7.2: Implement Theme Manager (GREEN)

Create `src/visualization/effects/theme-manager.ts`:

```typescript
/**
 * Theme Manager
 * Handles light/dark theme switching for constellation visualization
 */
import * as THREE from 'three';

export type Theme = 'light' | 'dark';

export interface ThemeColors {
  background: THREE.Color;
  primary: THREE.Color;
  secondary: THREE.Color;
  accent: THREE.Color;
  ambient: THREE.Color;
  grid: THREE.Color;
  gridOpacity: number;
  bloomIntensity: number;
  vignetteIntensity: number;
}

export type ThemeChangeCallback = (theme: Theme, colors: ThemeColors) => void;

export interface ThemeManager {
  setTheme: (theme: Theme) => void;
  getTheme: () => Theme;
  getColors: () => ThemeColors;
  subscribe: (callback: ThemeChangeCallback) => () => void;
}

export interface ThemeManagerConfig {
  initialTheme?: Theme;
}

export interface ThemeTargets {
  scene?: THREE.Scene;
  uniforms?: {
    node?: {
      uColorPrimary?: { value: THREE.Color };
      uColorSecondary?: { value: THREE.Color };
    };
    edge?: {
      uColorPrimary?: { value: THREE.Color };
      uColorSecondary?: { value: THREE.Color };
    };
  };
  grid?: THREE.Group;
  bloomPass?: { strength: number };
  vignettePass?: { uniforms: { darkness: { value: number } } };
}

/**
 * Dark theme color palette (cosmic mystical)
 */
export function getDarkThemeColors(): ThemeColors {
  return {
    background: new THREE.Color(0x0a0612),    // Cosmic indigo
    primary: new THREE.Color(0x9966cc),       // Luminous violet
    secondary: new THREE.Color(0xd4a84b),     // Sacred gold
    accent: new THREE.Color(0xc98b8b),        // Ethereal rose
    ambient: new THREE.Color(0x1a1025),       // Deep violet ambient
    grid: new THREE.Color(0xd4a84b),          // Sacred gold
    gridOpacity: 0.08,
    bloomIntensity: 0.6,
    vignetteIntensity: 0.4,
  };
}

/**
 * Light theme color palette (illuminated manuscript)
 */
export function getLightThemeColors(): ThemeColors {
  return {
    background: new THREE.Color(0xf5ebd7),    // Aged vellum
    primary: new THREE.Color(0x1e3a8a),       // Deep lapis
    secondary: new THREE.Color(0xd9a633),     // Warm gold
    accent: new THREE.Color(0x8b2942),        // Vermillion
    ambient: new THREE.Color(0xfff8f0),       // Warm white
    grid: new THREE.Color(0x2c5a8c),          // Ultramarine
    gridOpacity: 0.35,
    bloomIntensity: 0.3,
    vignetteIntensity: 0.2,
  };
}

/**
 * Creates theme manager instance
 * @param config - Manager configuration
 * @returns Theme manager interface
 */
export function createThemeManager(config: ThemeManagerConfig = {}): ThemeManager {
  let currentTheme: Theme = config.initialTheme ?? 'dark';
  const subscribers = new Set<ThemeChangeCallback>();

  const getColors = (): ThemeColors => {
    return currentTheme === 'dark' ? getDarkThemeColors() : getLightThemeColors();
  };

  const setTheme = (theme: Theme): void => {
    if (theme === currentTheme) return;

    currentTheme = theme;
    const colors = getColors();

    subscribers.forEach((callback) => {
      callback(theme, colors);
    });
  };

  const subscribe = (callback: ThemeChangeCallback): (() => void) => {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  };

  return {
    setTheme,
    getTheme: () => currentTheme,
    getColors,
    subscribe,
  };
}

/**
 * Utility function to apply theme to scene and materials
 * @param theme - Theme to apply
 * @param targets - Objects to update
 */
export function setTheme(theme: Theme, targets: ThemeTargets): void {
  const colors = theme === 'dark' ? getDarkThemeColors() : getLightThemeColors();

  // Update scene background
  if (targets.scene) {
    targets.scene.background = colors.background.clone();
  }

  // Update node material uniforms
  if (targets.uniforms?.node) {
    if (targets.uniforms.node.uColorPrimary) {
      targets.uniforms.node.uColorPrimary.value.copy(colors.primary);
    }
    if (targets.uniforms.node.uColorSecondary) {
      targets.uniforms.node.uColorSecondary.value.copy(colors.secondary);
    }
  }

  // Update edge material uniforms
  if (targets.uniforms?.edge) {
    if (targets.uniforms.edge.uColorPrimary) {
      targets.uniforms.edge.uColorPrimary.value.copy(colors.secondary); // Edges use gold
    }
    if (targets.uniforms.edge.uColorSecondary) {
      targets.uniforms.edge.uColorSecondary.value.copy(colors.accent);
    }
  }

  // Update grid
  if (targets.grid) {
    targets.grid.children.forEach((child) => {
      if (child instanceof THREE.Line) {
        const material = child.material as THREE.LineBasicMaterial;
        material.color.copy(colors.grid);
        material.opacity = colors.gridOpacity;
      }
    });
  }

  // Update post-processing
  if (targets.bloomPass) {
    targets.bloomPass.strength = colors.bloomIntensity;
  }

  if (targets.vignettePass) {
    targets.vignettePass.uniforms.darkness.value = colors.vignetteIntensity;
  }
}

/**
 * Gets current theme from manager
 * @param manager - Theme manager
 * @returns Current theme
 */
export function getCurrentTheme(manager: ThemeManager): Theme {
  return manager.getTheme();
}
```

**Run tests to confirm GREEN**:

```bash
npx vitest src/visualization/effects/theme-manager.test.ts
```

### Step 7.3: Refactor

- [ ] Add transition animations between themes
- [ ] Persist theme preference to localStorage
- [ ] Add system theme detection

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/visualization/effects/theme-manager.ts` | CREATE | Theme management |
| `src/visualization/effects/theme-manager.test.ts` | CREATE | Theme tests |
| `src/visualization/effects/index.ts` | MODIFY | Add theme exports |

---

## Completion Criteria

- [ ] All test cases pass
- [ ] Dark theme: cosmic mystical appearance
- [ ] Light theme: illuminated manuscript appearance
- [ ] Theme toggle updates all elements atomically
- [ ] Color palettes match prototype
- [ ] Post-processing intensities adjusted per theme

---

*Template version: 1.0*
