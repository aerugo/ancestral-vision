'use client';

/**
 * AnimationModeSelector - A/B test selector for animation systems
 *
 * Development tool for comparing legacy manual animation updates
 * with the new unified AnimationSystem.
 */
import { useAnimationModeStore, type AnimationMode } from '@/stores/animation-mode-store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Timer } from 'lucide-react';

const ANIMATION_MODES: AnimationMode[] = ['legacy', 'animation-system'];

/**
 * Dropdown selector for switching between animation modes
 *
 * Only visible in development mode.
 */
export function AnimationModeSelector() {
  const { mode, setMode, getModeLabel } = useAnimationModeStore();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-background/80 backdrop-blur-sm border-muted-foreground/20"
        >
          <Timer className="h-4 w-4" />
          <span className="hidden sm:inline">{getModeLabel(mode)}</span>
          <span className="sm:hidden">
            {mode === 'legacy' ? 'Legacy' : 'New'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Animation System (A/B Test)</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={mode} onValueChange={(v) => setMode(v as AnimationMode)}>
          {ANIMATION_MODES.map((m) => (
            <DropdownMenuRadioItem key={m} value={m}>
              {getModeLabel(m)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {mode === 'legacy' ? (
            <span>Manual uTime updates in render loop</span>
          ) : (
            <span>Unified AnimationSystem with pause/resume</span>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
