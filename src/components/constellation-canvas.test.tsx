import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ConstellationCanvas } from './constellation-canvas';

// Mock the visualization modules
vi.mock('@/visualization/renderer', () => ({
  createRenderer: vi.fn().mockResolvedValue({
    setAnimationLoop: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    setSize: vi.fn(),
  }),
  isWebGPUSupported: vi.fn().mockResolvedValue(false),
}));

vi.mock('@/visualization/scene', () => ({
  createScene: vi.fn().mockReturnValue({
    add: vi.fn(),
    traverse: vi.fn(),
    clear: vi.fn(),
  }),
  createCamera: vi.fn().mockReturnValue({
    position: { set: vi.fn() },
    aspect: 1,
    updateProjectionMatrix: vi.fn(),
  }),
  createControls: vi.fn().mockReturnValue({
    update: vi.fn(),
    dispose: vi.fn(),
  }),
  disposeScene: vi.fn(),
}));

vi.mock('@/visualization/constellation', () => ({
  createConstellationMesh: vi.fn().mockReturnValue({
    children: [],
  }),
  generatePlaceholderPeople: vi.fn().mockReturnValue([]),
}));

describe('ConstellationCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render a container element', () => {
    render(<ConstellationCanvas />);

    expect(screen.getByTestId('constellation-canvas')).toBeInTheDocument();
  });

  it('should have full width and height styling', () => {
    render(<ConstellationCanvas />);

    const container = screen.getByTestId('constellation-canvas');
    expect(container).toHaveClass('w-full');
    expect(container).toHaveClass('h-full');
  });

  it('should initialize the 3D scene', async () => {
    const { createRenderer } = await import('@/visualization/renderer');
    const { createScene, createCamera, createControls } = await import('@/visualization/scene');
    const { createConstellationMesh, generatePlaceholderPeople } = await import('@/visualization/constellation');

    render(<ConstellationCanvas />);

    await waitFor(() => {
      expect(createRenderer).toHaveBeenCalled();
      expect(createScene).toHaveBeenCalled();
      expect(createCamera).toHaveBeenCalled();
      expect(createControls).toHaveBeenCalled();
      expect(generatePlaceholderPeople).toHaveBeenCalled();
      expect(createConstellationMesh).toHaveBeenCalled();
    });
  });

  it('should use setAnimationLoop for rendering (INV-A002)', async () => {
    const { createRenderer } = await import('@/visualization/renderer');
    const mockRenderer = {
      setAnimationLoop: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
      setSize: vi.fn(),
    };
    (createRenderer as ReturnType<typeof vi.fn>).mockResolvedValue(mockRenderer);

    render(<ConstellationCanvas />);

    await waitFor(() => {
      expect(mockRenderer.setAnimationLoop).toHaveBeenCalled();
    });
  });

  it('should clean up resources on unmount (INV-A009)', async () => {
    const { createRenderer } = await import('@/visualization/renderer');
    const { createControls, disposeScene } = await import('@/visualization/scene');

    const mockRenderer = {
      setAnimationLoop: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
      setSize: vi.fn(),
    };
    const mockControls = {
      update: vi.fn(),
      dispose: vi.fn(),
    };

    (createRenderer as ReturnType<typeof vi.fn>).mockResolvedValue(mockRenderer);
    (createControls as ReturnType<typeof vi.fn>).mockReturnValue(mockControls);

    const { unmount } = render(<ConstellationCanvas />);

    await waitFor(() => {
      expect(mockRenderer.setAnimationLoop).toHaveBeenCalled();
    });

    unmount();

    await waitFor(() => {
      expect(mockRenderer.setAnimationLoop).toHaveBeenCalledWith(null);
      expect(mockControls.dispose).toHaveBeenCalled();
      expect(disposeScene).toHaveBeenCalled();
      expect(mockRenderer.dispose).toHaveBeenCalled();
    });
  });
});
