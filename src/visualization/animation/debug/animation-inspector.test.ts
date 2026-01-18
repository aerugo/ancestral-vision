import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnimationInspector } from './animation-inspector';
import { AnimationSystem } from '../core/animation-system';

describe('AnimationInspector', () => {
  let system: AnimationSystem;
  let inspector: AnimationInspector;

  beforeEach(() => {
    system = new AnimationSystem();
    inspector = new AnimationInspector(system);
  });

  describe('getSnapshot', () => {
    it('should return debug info from system', () => {
      const snapshot = inspector.getSnapshot();

      expect(snapshot).toHaveProperty('elapsedTime');
      expect(snapshot).toHaveProperty('isPaused');
      expect(snapshot).toHaveProperty('timeScale');
    });

    it('should reflect system state changes', () => {
      system.setTimeScale(0.5);
      system.update(0.1);

      const snapshot = inspector.getSnapshot() as { timeScale: number; elapsedTime: number };

      expect(snapshot.timeScale).toBe(0.5);
      expect(snapshot.elapsedTime).toBeCloseTo(0.05);
    });
  });

  describe('logging', () => {
    it('should not be logging initially', () => {
      expect(inspector.isLogging()).toBe(false);
    });

    it('should start logging', () => {
      inspector.startLogging();
      expect(inspector.isLogging()).toBe(true);
    });

    it('should stop logging', () => {
      inspector.startLogging();
      inspector.stopLogging();
      expect(inspector.isLogging()).toBe(false);
    });

    it('should log on tick when enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      inspector.startLogging();
      inspector.tick();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should not log on tick when disabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      inspector.tick();

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('global exposure', () => {
    it('should expose to window in browser environment', () => {
      // Mock window
      const mockWindow: Record<string, unknown> = {};
      vi.stubGlobal('window', mockWindow);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      inspector.exposeGlobally('__testAnimation');

      expect(mockWindow.__testAnimation).toBeDefined();
      expect(typeof (mockWindow.__testAnimation as { pause: () => void }).pause).toBe('function');

      consoleSpy.mockRestore();
      vi.unstubAllGlobals();
    });

    it('should remove global exposure', () => {
      const mockWindow: Record<string, unknown> = {};
      vi.stubGlobal('window', mockWindow);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      inspector.exposeGlobally('__testAnimation');
      inspector.removeGlobalExposure('__testAnimation');

      expect(mockWindow.__testAnimation).toBeUndefined();

      consoleSpy.mockRestore();
      vi.unstubAllGlobals();
    });

    it('should expose control functions that work', () => {
      const mockWindow: Record<string, unknown> = {};
      vi.stubGlobal('window', mockWindow);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      inspector.exposeGlobally('__testAnimation');

      const exposed = mockWindow.__testAnimation as {
        pause: () => void;
        resume: () => void;
        setTimeScale: (s: number) => void;
        isPaused: () => boolean;
        getTimeScale: () => number;
      };

      exposed.pause();
      expect(system.isPaused()).toBe(true);

      exposed.resume();
      expect(system.isPaused()).toBe(false);

      exposed.setTimeScale(2.0);
      expect(system.getTimeScale()).toBe(2.0);

      consoleSpy.mockRestore();
      vi.unstubAllGlobals();
    });
  });
});
