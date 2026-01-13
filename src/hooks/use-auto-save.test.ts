/**
 * useAutoSave Hook Tests
 *
 * TDD tests for the auto-save debounce hook (INV-A010).
 * Validates 2-second debounce, pending state, and error handling.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from './use-auto-save';

describe('useAutoSave (INV-A010)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Debounce Behavior', () => {
    it('should debounce save calls by 2 seconds', async () => {
      const saveFn = vi.fn().mockResolvedValue({});
      const { result } = renderHook(() => useAutoSave(saveFn, 2000));

      // Trigger multiple changes rapidly
      act(() => {
        result.current.triggerSave({ name: 'First' });
      });
      act(() => {
        result.current.triggerSave({ name: 'Second' });
      });
      act(() => {
        result.current.triggerSave({ name: 'Third' });
      });

      // Should not have called save yet
      expect(saveFn).not.toHaveBeenCalled();

      // Advance timers by 2 seconds
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      // Should have called save only once with last value
      expect(saveFn).toHaveBeenCalledTimes(1);
      expect(saveFn).toHaveBeenCalledWith({ name: 'Third' });
    });

    it('should reset debounce timer on new trigger', async () => {
      const saveFn = vi.fn().mockResolvedValue({});
      const { result } = renderHook(() => useAutoSave(saveFn, 2000));

      // First trigger
      act(() => {
        result.current.triggerSave({ name: 'First' });
      });

      // Advance by 1.5 seconds (not enough to trigger save)
      await act(async () => {
        vi.advanceTimersByTime(1500);
      });

      expect(saveFn).not.toHaveBeenCalled();

      // Trigger again - should reset timer
      act(() => {
        result.current.triggerSave({ name: 'Second' });
      });

      // Advance by another 1.5 seconds (still not 2s from last trigger)
      await act(async () => {
        vi.advanceTimersByTime(1500);
      });

      expect(saveFn).not.toHaveBeenCalled();

      // Advance remaining 500ms
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(saveFn).toHaveBeenCalledTimes(1);
      expect(saveFn).toHaveBeenCalledWith({ name: 'Second' });
    });

    it('should use custom debounce time', async () => {
      const saveFn = vi.fn().mockResolvedValue({});
      const { result } = renderHook(() => useAutoSave(saveFn, 1000));

      act(() => {
        result.current.triggerSave({ name: 'Test' });
      });

      // 1 second debounce
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(saveFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Pending State', () => {
    it('should indicate pending state when save is queued', async () => {
      const saveFn = vi.fn().mockResolvedValue({});
      const { result } = renderHook(() => useAutoSave(saveFn, 2000));

      expect(result.current.isPending).toBe(false);

      act(() => {
        result.current.triggerSave({ name: 'Test' });
      });

      // Should show pending state
      expect(result.current.isPending).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      // After save completes, should not be pending
      expect(result.current.isPending).toBe(false);
    });

    it('should remain pending during async save operation', async () => {
      let resolvePromise: () => void;
      const saveFn = vi.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolvePromise = resolve;
          })
      );

      const { result } = renderHook(() => useAutoSave(saveFn, 2000));

      act(() => {
        result.current.triggerSave({ name: 'Test' });
      });

      // Advance to trigger save
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      // Should still be pending while save is in progress
      expect(result.current.isPending).toBe(true);

      // Complete the save
      await act(async () => {
        resolvePromise!();
      });

      expect(result.current.isPending).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle save errors gracefully', async () => {
      const saveFn = vi.fn().mockRejectedValue(new Error('Save failed'));
      const { result } = renderHook(() => useAutoSave(saveFn, 2000));

      act(() => {
        result.current.triggerSave({ name: 'Test' });
      });

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.error).toBe('Save failed');
      expect(result.current.isPending).toBe(false);
    });

    it('should clear error on new save trigger', async () => {
      const saveFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({});

      const { result } = renderHook(() => useAutoSave(saveFn, 2000));

      // First save - fails
      act(() => {
        result.current.triggerSave({ name: 'First' });
      });

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.error).toBe('First error');

      // Second save - should clear error
      act(() => {
        result.current.triggerSave({ name: 'Second' });
      });

      expect(result.current.error).toBeNull();
    });

    it('should handle non-Error exceptions', async () => {
      const saveFn = vi.fn().mockRejectedValue('String error');
      const { result } = renderHook(() => useAutoSave(saveFn, 2000));

      act(() => {
        result.current.triggerSave({ name: 'Test' });
      });

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.error).toBe('Save failed');
    });
  });

  describe('Last Saved Timestamp', () => {
    it('should update lastSavedAt after successful save', async () => {
      const saveFn = vi.fn().mockResolvedValue({});
      const { result } = renderHook(() => useAutoSave(saveFn, 2000));

      expect(result.current.lastSavedAt).toBeNull();

      act(() => {
        result.current.triggerSave({ name: 'Test' });
      });

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.lastSavedAt).toBeInstanceOf(Date);
    });

    it('should not update lastSavedAt on failed save', async () => {
      const saveFn = vi.fn().mockRejectedValue(new Error('Failed'));
      const { result } = renderHook(() => useAutoSave(saveFn, 2000));

      act(() => {
        result.current.triggerSave({ name: 'Test' });
      });

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.lastSavedAt).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('should cancel pending save on unmount', async () => {
      const saveFn = vi.fn().mockResolvedValue({});
      const { result, unmount } = renderHook(() => useAutoSave(saveFn, 2000));

      act(() => {
        result.current.triggerSave({ name: 'Test' });
      });

      // Unmount before debounce completes
      unmount();

      // Advance time
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      // Should not have called save because hook was unmounted
      expect(saveFn).not.toHaveBeenCalled();
    });
  });

  describe('Force Save', () => {
    it('should allow immediate save without debounce', async () => {
      const saveFn = vi.fn().mockResolvedValue({});
      const { result } = renderHook(() => useAutoSave(saveFn, 2000));

      await act(async () => {
        await result.current.forceSave({ name: 'Immediate' });
      });

      expect(saveFn).toHaveBeenCalledTimes(1);
      expect(saveFn).toHaveBeenCalledWith({ name: 'Immediate' });
    });

    it('should cancel pending debounced save when force save is called', async () => {
      const saveFn = vi.fn().mockResolvedValue({});
      const { result } = renderHook(() => useAutoSave(saveFn, 2000));

      act(() => {
        result.current.triggerSave({ name: 'Debounced' });
      });

      await act(async () => {
        await result.current.forceSave({ name: 'Immediate' });
      });

      // Should have only called once with force save data
      expect(saveFn).toHaveBeenCalledTimes(1);
      expect(saveFn).toHaveBeenCalledWith({ name: 'Immediate' });

      // Advance past debounce time - should not trigger another save
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(saveFn).toHaveBeenCalledTimes(1);
    });
  });
});
