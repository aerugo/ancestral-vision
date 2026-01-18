/**
 * Animation Track
 *
 * Interpolates keyframe values over time with configurable easing.
 */
import type { TrackDefinition, Keyframe } from '../types';
import { getEasing, type EasingFunction } from '../core/easing';

export class AnimationTrack {
  private readonly _name: string;
  private readonly _keyframes: Keyframe[];
  private readonly _easing: EasingFunction;

  public constructor(definition: TrackDefinition) {
    this._name = definition.name;
    this._keyframes = [...definition.keyframes].sort((a, b) => a.time - b.time);
    this._easing = getEasing(definition.easing ?? 'linear');
  }

  public get name(): string {
    return this._name;
  }

  public getValue(time: number): number | number[] {
    if (this._keyframes.length === 0) {
      return 0;
    }

    if (this._keyframes.length === 1) {
      return this._keyframes[0].value;
    }

    const t = Math.max(0, Math.min(1, time));

    let prevKeyframe = this._keyframes[0];
    let nextKeyframe = this._keyframes[this._keyframes.length - 1];

    for (let i = 0; i < this._keyframes.length - 1; i++) {
      if (t >= this._keyframes[i].time && t <= this._keyframes[i + 1].time) {
        prevKeyframe = this._keyframes[i];
        nextKeyframe = this._keyframes[i + 1];
        break;
      }
    }

    if (t <= prevKeyframe.time) return prevKeyframe.value;
    if (t >= nextKeyframe.time) return nextKeyframe.value;

    const keyframeRange = nextKeyframe.time - prevKeyframe.time;
    const localProgress = (t - prevKeyframe.time) / keyframeRange;
    const easedProgress = this._easing(localProgress);

    return this._interpolate(prevKeyframe.value, nextKeyframe.value, easedProgress);
  }

  private _interpolate(
    a: number | number[],
    b: number | number[],
    t: number
  ): number | number[] {
    if (typeof a === 'number' && typeof b === 'number') {
      return a + (b - a) * t;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      return a.map((av, i) => av + ((b[i] ?? av) - av) * t);
    }

    return a;
  }
}
