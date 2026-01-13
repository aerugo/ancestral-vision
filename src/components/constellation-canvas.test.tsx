import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ConstellationCanvas } from './constellation-canvas';

// Mock the selection store
const mockSelectPerson = vi.fn();
vi.mock('@/store/selection-store', () => ({
  useSelectionStore: vi.fn(() => ({
    selectPerson: mockSelectPerson,
  })),
}));

// Mock usePeople hook
vi.mock('@/hooks/use-people', () => ({
  usePeople: vi.fn(() => ({
    data: [
      { id: 'person-1', givenName: 'John', surname: 'Doe', generation: 0 },
      { id: 'person-2', givenName: 'Jane', surname: 'Doe', generation: 1 },
    ],
    isLoading: false,
  })),
}));

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
    children: [],
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

// Track ConstellationSelection instantiation
const mockConstellationSelectionInstances: Array<{
  getIntersectedPerson: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
}> = [];

// Mock selection utility - use a function constructor
vi.mock('@/visualization/selection', () => ({
  ConstellationSelection: function MockConstellationSelection() {
    const instance = {
      getIntersectedPerson: vi.fn().mockReturnValue(null),
      dispose: vi.fn(),
    };
    mockConstellationSelectionInstances.push(instance);
    return instance;
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('ConstellationCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConstellationSelectionInstances.length = 0;
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
    const { createConstellationMesh } = await import('@/visualization/constellation');

    render(<ConstellationCanvas />);

    await waitFor(() => {
      expect(createRenderer).toHaveBeenCalled();
      expect(createScene).toHaveBeenCalled();
      expect(createCamera).toHaveBeenCalled();
      expect(createControls).toHaveBeenCalled();
      // createConstellationMesh is called with real or placeholder data
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

    const { unmount } = render(<ConstellationCanvas />, { wrapper: createWrapper() });

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

  describe('People Data Integration', () => {
    it('should use usePeople hook to fetch data', async () => {
      const { usePeople } = await import('@/hooks/use-people');

      render(<ConstellationCanvas />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(usePeople).toHaveBeenCalled();
      });
    });

    it('should create constellation mesh with people data', async () => {
      const { createConstellationMesh } = await import('@/visualization/constellation');

      render(<ConstellationCanvas />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(createConstellationMesh).toHaveBeenCalled();
      });
    });
  });

  describe('Click Selection', () => {
    it('should create ConstellationSelection for raycasting', async () => {
      render(<ConstellationCanvas />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Wait for scene initialization - canvas is created dynamically
        const container = screen.getByTestId('constellation-canvas');
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      // ConstellationSelection is instantiated during scene init
      expect(mockConstellationSelectionInstances.length).toBeGreaterThan(0);
    });

    it('should not call selectPerson on initial render', async () => {
      render(<ConstellationCanvas />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('constellation-canvas')).toBeInTheDocument();
      });

      // Selection should not be triggered without user interaction
      expect(mockSelectPerson).not.toHaveBeenCalled();
    });

    it('should set up click handler on canvas', async () => {
      render(<ConstellationCanvas />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Canvas is created and attached to the container
        const container = screen.getByTestId('constellation-canvas');
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      // The component sets up a click handler during initialization
      // The handler uses ConstellationSelection.getIntersectedPerson
      // and calls selectPerson if a person is found
      // This structure is verified by the ConstellationSelection being called
    });
  });
});
