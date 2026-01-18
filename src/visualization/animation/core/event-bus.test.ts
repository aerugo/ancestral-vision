import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnimationEventBus } from './event-bus';
import type { AnimationEvent } from '../types';

describe('AnimationEventBus', () => {
  let bus: AnimationEventBus;

  beforeEach(() => {
    bus = new AnimationEventBus();
  });

  describe('subscribe', () => {
    it('should subscribe to events', () => {
      const handler = vi.fn();
      const unsubscribe = bus.subscribe(handler);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should emit events to subscribers', () => {
      const handler = vi.fn();
      bus.subscribe(handler);

      const event: AnimationEvent = { type: 'animation:start', animationName: 'test' };
      bus.emit(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should support multiple subscribers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      bus.subscribe(handler1);
      bus.subscribe(handler2);

      const event: AnimationEvent = { type: 'animation:complete' };
      bus.emit(event);

      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledWith(event);
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe correctly', () => {
      const handler = vi.fn();
      const unsubscribe = bus.subscribe(handler);

      unsubscribe();
      bus.emit({ type: 'animation:complete' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should not emit to unsubscribed handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const unsubscribe1 = bus.subscribe(handler1);
      bus.subscribe(handler2);

      unsubscribe1();
      bus.emit({ type: 'animation:complete' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('emit order', () => {
    it('should emit events in subscription order', () => {
      const order: number[] = [];
      bus.subscribe(() => order.push(1));
      bus.subscribe(() => order.push(2));
      bus.subscribe(() => order.push(3));

      bus.emit({ type: 'animation:complete' });

      expect(order).toEqual([1, 2, 3]);
    });
  });

  describe('type narrowing', () => {
    it('should allow type narrowing by event type', () => {
      bus.subscribe((event) => {
        if (event.type === 'phase:enter') {
          expect(event.phase).toBeDefined();
          expect(event.progress).toBeDefined();
        }
      });

      bus.emit({ type: 'phase:enter', phase: 'test', progress: 0.5 });
    });
  });

  describe('clear', () => {
    it('should remove all subscribers', () => {
      const handler = vi.fn();
      bus.subscribe(handler);

      bus.clear();
      bus.emit({ type: 'animation:complete' });

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
