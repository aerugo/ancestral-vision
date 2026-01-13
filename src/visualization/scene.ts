/**
 * Scene module for Three.js scene setup
 *
 * Invariants:
 * - INV-A009: Scene cleanup on component unmount (dispose geometry, materials, textures)
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Cosmic color palette for the constellation visualization
 */
const COLORS = {
  background: new THREE.Color(0x050510), // Deep space blue-black
  ambient: new THREE.Color(0x1a1a2e),
} as const;

/**
 * Create a new Three.js scene with cosmic styling
 */
export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = COLORS.background;

  // Add ambient light for base visibility
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);

  // Add point light for depth and highlights
  const pointLight = new THREE.PointLight(0xffffff, 1);
  pointLight.position.set(50, 50, 50);
  scene.add(pointLight);

  return scene;
}

/**
 * Create a perspective camera for the constellation view
 *
 * @param width - Viewport width
 * @param height - Viewport height
 */
export function createCamera(width: number, height: number): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(
    60, // Field of view
    width / height, // Aspect ratio
    0.1, // Near clipping plane
    10000 // Far clipping plane
  );

  // Position camera to see the initial constellation
  camera.position.set(0, 30, 100);
  camera.lookAt(0, 0, 0);

  return camera;
}

/**
 * Create orbit controls for camera navigation
 *
 * @param camera - The camera to control
 * @param domElement - The DOM element for event listeners
 */
export function createControls(
  camera: THREE.Camera,
  domElement: HTMLElement
): OrbitControls {
  const controls = new OrbitControls(camera, domElement);

  // Enable smooth movement with damping
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // Enable zoom and pan for navigation
  controls.enableZoom = true;
  controls.enablePan = true;

  // Set zoom limits to prevent getting too close or too far
  controls.minDistance = 10;
  controls.maxDistance = 500;

  // Allow full vertical rotation
  controls.maxPolarAngle = Math.PI;

  return controls;
}

/**
 * Dispose all resources in a scene (geometry, materials, textures)
 * Enforces INV-A009: Scene cleanup on component unmount
 *
 * @param scene - The scene to dispose
 */
export function disposeScene(scene: THREE.Scene): void {
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      // Dispose geometry
      if (object.geometry) {
        object.geometry.dispose();
      }

      // Dispose material(s)
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => {
            disposeMaterial(material);
          });
        } else {
          disposeMaterial(object.material);
        }
      }
    }
  });

  // Clear all children from the scene
  scene.clear();
}

/**
 * Dispose a material and its textures
 */
function disposeMaterial(material: THREE.Material): void {
  material.dispose();

  // Dispose textures if present
  if ('map' in material && material.map) {
    (material.map as THREE.Texture).dispose();
  }
  if ('normalMap' in material && material.normalMap) {
    (material.normalMap as THREE.Texture).dispose();
  }
  if ('roughnessMap' in material && material.roughnessMap) {
    (material.roughnessMap as THREE.Texture).dispose();
  }
  if ('metalnessMap' in material && material.metalnessMap) {
    (material.metalnessMap as THREE.Texture).dispose();
  }
  if ('emissiveMap' in material && material.emissiveMap) {
    (material.emissiveMap as THREE.Texture).dispose();
  }
}
