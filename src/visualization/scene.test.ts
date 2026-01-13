import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createScene, createCamera, createControls, disposeScene } from './scene';
import * as THREE from 'three';

describe('Scene', () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    document.body.appendChild(canvas);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('createScene', () => {
    it('should create a THREE.Scene', () => {
      const scene = createScene();

      expect(scene).toBeInstanceOf(THREE.Scene);
    });

    it('should create scene with dark background', () => {
      const scene = createScene();

      expect(scene.background).toBeDefined();
      expect(scene.background).toBeInstanceOf(THREE.Color);
    });

    it('should have cosmic color scheme (very dark)', () => {
      const scene = createScene();
      const bg = scene.background as THREE.Color;

      // Should be very dark (near black) - cosmic aesthetic
      expect(bg.r).toBeLessThan(0.1);
      expect(bg.g).toBeLessThan(0.1);
      expect(bg.b).toBeLessThan(0.15);
    });

    it('should include ambient lighting', () => {
      const scene = createScene();

      const ambientLight = scene.children.find(
        (child) => child instanceof THREE.AmbientLight
      );
      expect(ambientLight).toBeDefined();
    });
  });

  describe('createCamera', () => {
    it('should create perspective camera', () => {
      const camera = createCamera(800, 600);

      expect(camera).toBeInstanceOf(THREE.PerspectiveCamera);
    });

    it('should set correct aspect ratio', () => {
      const camera = createCamera(800, 600);

      expect(camera.aspect).toBeCloseTo(800 / 600);
    });

    it('should position camera at reasonable distance to see constellation', () => {
      const camera = createCamera(800, 600);

      // Camera should be positioned far enough to see constellation
      expect(camera.position.z).toBeGreaterThan(50);
    });

    it('should set appropriate near and far planes', () => {
      const camera = createCamera(800, 600);

      expect(camera.near).toBeLessThan(1);
      expect(camera.far).toBeGreaterThan(1000);
    });
  });

  describe('createControls', () => {
    it('should create orbit controls', () => {
      const camera = createCamera(800, 600);
      const controls = createControls(camera, canvas);

      expect(controls).toBeDefined();
    });

    it('should enable damping for smooth movement', () => {
      const camera = createCamera(800, 600);
      const controls = createControls(camera, canvas);

      expect(controls.enableDamping).toBe(true);
    });

    it('should enable zoom', () => {
      const camera = createCamera(800, 600);
      const controls = createControls(camera, canvas);

      expect(controls.enableZoom).toBe(true);
    });

    it('should enable pan', () => {
      const camera = createCamera(800, 600);
      const controls = createControls(camera, canvas);

      expect(controls.enablePan).toBe(true);
    });

    it('should set zoom limits', () => {
      const camera = createCamera(800, 600);
      const controls = createControls(camera, canvas);

      expect(controls.minDistance).toBeGreaterThan(0);
      expect(controls.maxDistance).toBeGreaterThan(controls.minDistance);
    });
  });

  describe('disposeScene', () => {
    it('should dispose geometry resources', () => {
      const scene = createScene();
      const geometry = new THREE.SphereGeometry(1);
      const material = new THREE.MeshBasicMaterial();
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      const geometryDisposeSpy = vi.spyOn(geometry, 'dispose');

      disposeScene(scene);

      expect(geometryDisposeSpy).toHaveBeenCalled();
    });

    it('should dispose material resources', () => {
      const scene = createScene();
      const geometry = new THREE.SphereGeometry(1);
      const material = new THREE.MeshBasicMaterial();
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      const materialDisposeSpy = vi.spyOn(material, 'dispose');

      disposeScene(scene);

      expect(materialDisposeSpy).toHaveBeenCalled();
    });

    it('should handle meshes with material arrays', () => {
      const scene = createScene();
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const materials = [
        new THREE.MeshBasicMaterial({ color: 0xff0000 }),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 }),
      ];
      const mesh = new THREE.Mesh(geometry, materials);
      scene.add(mesh);

      const materialDisposeSpy1 = vi.spyOn(materials[0]!, 'dispose');
      const materialDisposeSpy2 = vi.spyOn(materials[1]!, 'dispose');

      disposeScene(scene);

      expect(materialDisposeSpy1).toHaveBeenCalled();
      expect(materialDisposeSpy2).toHaveBeenCalled();
    });

    it('should clear all children from scene', () => {
      const scene = createScene();
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(1),
        new THREE.MeshBasicMaterial()
      );
      scene.add(mesh);

      disposeScene(scene);

      expect(scene.children.length).toBe(0);
    });
  });
});
