'use client';

/**
 * Constellation Page - Main 3D visualization view
 */

import { AppShell } from '@/components/app-shell';
import { ConstellationCanvas } from '@/components/constellation-canvas';

export default function ConstellationPage(): React.ReactElement {
  return (
    <div data-testid="constellation-page" className="h-screen">
      <AppShell>
        <ConstellationCanvas />
      </AppShell>
    </div>
  );
}
