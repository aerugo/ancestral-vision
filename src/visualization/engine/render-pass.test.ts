/**
 * @vitest-environment node
 *
 * RenderPassManager Tests (TDD)
 *
 * Tests for the render pass management system that orchestrates
 * custom WebGPU render passes alongside Three.js.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock WebGPU types since they're not available in Node
const mockCommandEncoder = {
  beginRenderPass: vi.fn(() => mockRenderPassEncoder),
  finish: vi.fn(() => ({})),
};

const mockRenderPassEncoder = {
  setPipeline: vi.fn(),
  setBindGroup: vi.fn(),
  setVertexBuffer: vi.fn(),
  setIndexBuffer: vi.fn(),
  draw: vi.fn(),
  drawIndexed: vi.fn(),
  end: vi.fn(),
};

const mockPipeline = { label: 'test-pipeline' };
const mockBindGroup = { label: 'test-bind-group' };
const mockBuffer = { label: 'test-buffer' };
const mockTexture = {
  createView: vi.fn(() => ({ label: 'test-view' })),
};

// Import after mocks are set up
import {
  createRenderPassManager,
  type RenderPassConfig,
  type DrawCall,
  type RenderPassManager,
} from './render-pass';

describe('render-pass module', () => {
  let manager: RenderPassManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = createRenderPassManager();
  });

  describe('createRenderPassManager', () => {
    it('should export createRenderPassManager function', () => {
      expect(createRenderPassManager).toBeDefined();
      expect(typeof createRenderPassManager).toBe('function');
    });

    it('should return a RenderPassManager instance', () => {
      expect(manager).toHaveProperty('addPass');
      expect(manager).toHaveProperty('removePass');
      expect(manager).toHaveProperty('getPass');
      expect(manager).toHaveProperty('hasPass');
      expect(manager).toHaveProperty('execute');
      expect(manager).toHaveProperty('clear');
    });
  });

  describe('addPass', () => {
    it('should add a pass with the given name', () => {
      const config: RenderPassConfig = {
        colorAttachments: [],
        pipeline: mockPipeline as unknown as GPURenderPipeline,
        bindGroups: [],
        drawCalls: [],
      };

      manager.addPass('test-pass', config);
      expect(manager.hasPass('test-pass')).toBe(true);
    });

    it('should throw if pass name already exists', () => {
      const config: RenderPassConfig = {
        colorAttachments: [],
        pipeline: mockPipeline as unknown as GPURenderPipeline,
        bindGroups: [],
        drawCalls: [],
      };

      manager.addPass('duplicate', config);
      expect(() => manager.addPass('duplicate', config)).toThrow(
        'Pass "duplicate" already exists'
      );
    });

    it('should accept optional depth attachment', () => {
      const config: RenderPassConfig = {
        colorAttachments: [],
        depthAttachment: {
          view: mockTexture.createView() as unknown as GPUTextureView,
          depthClearValue: 1.0,
          depthLoadOp: 'clear',
          depthStoreOp: 'store',
        },
        pipeline: mockPipeline as unknown as GPURenderPipeline,
        bindGroups: [],
        drawCalls: [],
      };

      manager.addPass('depth-pass', config);
      expect(manager.hasPass('depth-pass')).toBe(true);
    });

    it('should accept priority for execution order', () => {
      const config1: RenderPassConfig = {
        colorAttachments: [],
        pipeline: mockPipeline as unknown as GPURenderPipeline,
        bindGroups: [],
        drawCalls: [],
        priority: 10,
      };
      const config2: RenderPassConfig = {
        colorAttachments: [],
        pipeline: mockPipeline as unknown as GPURenderPipeline,
        bindGroups: [],
        drawCalls: [],
        priority: 5,
      };

      manager.addPass('low-priority', config1);
      manager.addPass('high-priority', config2);

      // Higher priority (lower number) should execute first
      const names = manager.getPassNames();
      expect(names[0]).toBe('high-priority');
      expect(names[1]).toBe('low-priority');
    });
  });

  describe('removePass', () => {
    it('should remove an existing pass', () => {
      const config: RenderPassConfig = {
        colorAttachments: [],
        pipeline: mockPipeline as unknown as GPURenderPipeline,
        bindGroups: [],
        drawCalls: [],
      };

      manager.addPass('to-remove', config);
      expect(manager.hasPass('to-remove')).toBe(true);

      manager.removePass('to-remove');
      expect(manager.hasPass('to-remove')).toBe(false);
    });

    it('should not throw when removing non-existent pass', () => {
      expect(() => manager.removePass('non-existent')).not.toThrow();
    });
  });

  describe('getPass', () => {
    it('should return the pass config for existing pass', () => {
      const config: RenderPassConfig = {
        colorAttachments: [],
        pipeline: mockPipeline as unknown as GPURenderPipeline,
        bindGroups: [mockBindGroup as unknown as GPUBindGroup],
        drawCalls: [],
      };

      manager.addPass('get-test', config);
      const retrieved = manager.getPass('get-test');

      expect(retrieved).toBeDefined();
      expect(retrieved?.pipeline).toBe(config.pipeline);
      expect(retrieved?.bindGroups).toEqual(config.bindGroups);
    });

    it('should return undefined for non-existent pass', () => {
      expect(manager.getPass('non-existent')).toBeUndefined();
    });
  });

  describe('execute', () => {
    it('should begin render pass with correct descriptor', () => {
      const colorView = mockTexture.createView();
      const config: RenderPassConfig = {
        colorAttachments: [
          {
            view: colorView as unknown as GPUTextureView,
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
        pipeline: mockPipeline as unknown as GPURenderPipeline,
        bindGroups: [],
        drawCalls: [],
      };

      manager.addPass('execute-test', config);
      manager.execute(mockCommandEncoder as unknown as GPUCommandEncoder);

      expect(mockCommandEncoder.beginRenderPass).toHaveBeenCalledWith(
        expect.objectContaining({
          colorAttachments: config.colorAttachments,
        })
      );
    });

    it('should set pipeline on render pass encoder', () => {
      const config: RenderPassConfig = {
        colorAttachments: [
          {
            view: mockTexture.createView() as unknown as GPUTextureView,
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
        pipeline: mockPipeline as unknown as GPURenderPipeline,
        bindGroups: [],
        drawCalls: [],
      };

      manager.addPass('pipeline-test', config);
      manager.execute(mockCommandEncoder as unknown as GPUCommandEncoder);

      expect(mockRenderPassEncoder.setPipeline).toHaveBeenCalledWith(mockPipeline);
    });

    it('should set bind groups in order', () => {
      const bindGroup0 = { label: 'bg0' };
      const bindGroup1 = { label: 'bg1' };

      const config: RenderPassConfig = {
        colorAttachments: [
          {
            view: mockTexture.createView() as unknown as GPUTextureView,
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
        pipeline: mockPipeline as unknown as GPURenderPipeline,
        bindGroups: [
          bindGroup0 as unknown as GPUBindGroup,
          bindGroup1 as unknown as GPUBindGroup,
        ],
        drawCalls: [],
      };

      manager.addPass('bindgroup-test', config);
      manager.execute(mockCommandEncoder as unknown as GPUCommandEncoder);

      expect(mockRenderPassEncoder.setBindGroup).toHaveBeenCalledWith(0, bindGroup0);
      expect(mockRenderPassEncoder.setBindGroup).toHaveBeenCalledWith(1, bindGroup1);
    });

    it('should execute draw calls', () => {
      const drawCall: DrawCall = {
        vertexCount: 36,
        instanceCount: 100,
      };

      const config: RenderPassConfig = {
        colorAttachments: [
          {
            view: mockTexture.createView() as unknown as GPUTextureView,
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
        pipeline: mockPipeline as unknown as GPURenderPipeline,
        bindGroups: [],
        drawCalls: [drawCall],
      };

      manager.addPass('draw-test', config);
      manager.execute(mockCommandEncoder as unknown as GPUCommandEncoder);

      expect(mockRenderPassEncoder.draw).toHaveBeenCalledWith(36, 100, 0, 0);
    });

    it('should execute indexed draw calls', () => {
      const drawCall: DrawCall = {
        indexCount: 72,
        instanceCount: 50,
        vertexBuffer: mockBuffer as unknown as GPUBuffer,
        indexBuffer: mockBuffer as unknown as GPUBuffer,
        indexFormat: 'uint16',
      };

      const config: RenderPassConfig = {
        colorAttachments: [
          {
            view: mockTexture.createView() as unknown as GPUTextureView,
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
        pipeline: mockPipeline as unknown as GPURenderPipeline,
        bindGroups: [],
        drawCalls: [drawCall],
      };

      manager.addPass('indexed-test', config);
      manager.execute(mockCommandEncoder as unknown as GPUCommandEncoder);

      expect(mockRenderPassEncoder.setVertexBuffer).toHaveBeenCalledWith(0, mockBuffer);
      expect(mockRenderPassEncoder.setIndexBuffer).toHaveBeenCalledWith(
        mockBuffer,
        'uint16'
      );
      expect(mockRenderPassEncoder.drawIndexed).toHaveBeenCalledWith(72, 50, 0, 0, 0);
    });

    it('should end render pass after execution', () => {
      const config: RenderPassConfig = {
        colorAttachments: [
          {
            view: mockTexture.createView() as unknown as GPUTextureView,
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
        pipeline: mockPipeline as unknown as GPURenderPipeline,
        bindGroups: [],
        drawCalls: [],
      };

      manager.addPass('end-test', config);
      manager.execute(mockCommandEncoder as unknown as GPUCommandEncoder);

      expect(mockRenderPassEncoder.end).toHaveBeenCalled();
    });

    it('should execute passes in priority order', () => {
      const executionOrder: string[] = [];

      const createConfig = (name: string, priority: number): RenderPassConfig => ({
        colorAttachments: [
          {
            view: mockTexture.createView() as unknown as GPUTextureView,
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
        pipeline: mockPipeline as unknown as GPURenderPipeline,
        bindGroups: [],
        drawCalls: [],
        priority,
        onExecute: () => executionOrder.push(name),
      });

      manager.addPass('third', createConfig('third', 30));
      manager.addPass('first', createConfig('first', 10));
      manager.addPass('second', createConfig('second', 20));

      manager.execute(mockCommandEncoder as unknown as GPUCommandEncoder);

      expect(executionOrder).toEqual(['first', 'second', 'third']);
    });

    it('should not execute disabled passes', () => {
      const config: RenderPassConfig = {
        colorAttachments: [
          {
            view: mockTexture.createView() as unknown as GPUTextureView,
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
        pipeline: mockPipeline as unknown as GPURenderPipeline,
        bindGroups: [],
        drawCalls: [],
        enabled: false,
      };

      manager.addPass('disabled-test', config);
      manager.execute(mockCommandEncoder as unknown as GPUCommandEncoder);

      expect(mockCommandEncoder.beginRenderPass).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should remove all passes', () => {
      const config: RenderPassConfig = {
        colorAttachments: [],
        pipeline: mockPipeline as unknown as GPURenderPipeline,
        bindGroups: [],
        drawCalls: [],
      };

      manager.addPass('pass1', config);
      manager.addPass('pass2', config);
      manager.addPass('pass3', config);

      expect(manager.getPassNames().length).toBe(3);

      manager.clear();

      expect(manager.getPassNames().length).toBe(0);
    });
  });

  describe('updatePass', () => {
    it('should update existing pass config', () => {
      const initialConfig: RenderPassConfig = {
        colorAttachments: [],
        pipeline: mockPipeline as unknown as GPURenderPipeline,
        bindGroups: [],
        drawCalls: [],
        enabled: true,
      };

      manager.addPass('update-test', initialConfig);
      manager.updatePass('update-test', { enabled: false });

      const updated = manager.getPass('update-test');
      expect(updated?.enabled).toBe(false);
    });

    it('should throw if pass does not exist', () => {
      expect(() => manager.updatePass('non-existent', {})).toThrow(
        'Pass "non-existent" does not exist'
      );
    });
  });
});
