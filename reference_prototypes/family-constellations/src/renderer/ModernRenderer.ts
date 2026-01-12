/**
 * Modern Ancestral Web Renderer
 *
 * Performance-optimized WebGL renderer with post-processing pipeline:
 * - Bloom for ethereal glow effects
 * - SMAA antialiasing (medium preset for performance)
 * - Vignette for atmospheric depth
 * - Hilma af Klint / Klimt inspired sacred geometry
 * - Cell-shaded aesthetic with Wind Waker influence
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  EffectComposer,
  BloomEffect,
  VignetteEffect,
  EffectPass,
  RenderPass,
  SMAAEffect,
  SMAAPreset,
} from 'postprocessing';
import type { GraphNode, GraphEdge, EngineConfig } from '../types';
import { DEFAULT_CONFIG } from '../types';
import {
  instancedNodeVertexShader,
  instancedNodeFragmentShader,
  edgeVertexShader,
  edgeFragmentShader,
  particleVertexShader,
  particleFragmentShader,
  fireflyVertexShader,
  fireflyFragmentShader,
  sharedEventEdgeVertexShader,
  sharedEventEdgeFragmentShader,
} from '../shaders';

// Re-use types from AncestralWebRenderer
import type { HoverCallback, ClickCallback } from './AncestralWebRenderer';

interface CameraAnimation {
  startPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
  startTarget: THREE.Vector3;
  endTarget: THREE.Vector3;
  startTime: number;
  duration: number;
  onComplete?: () => void;
}

// Easing function for smooth animations
const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * Modern 3D renderer for the Ancestral Web visualization
 *
 * Features:
 * - WebGL renderer with post-processing
 * - Bloom for ethereal glow effects
 * - SMAA antialiasing
 * - Vignette for atmospheric depth
 * - Chromatic aberration for ethereal feel
 */
export class ModernRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private controls: OrbitControls;
  private config: EngineConfig;

  // Post-processing effects (stored for theme adjustments)
  private bloomEffect: BloomEffect;
  private vignetteEffect: VignetteEffect;

  // Instanced rendering
  private nodeInstancedMesh: THREE.InstancedMesh | null = null;
  private nodeOutlineMesh: THREE.InstancedMesh | null = null;
  private nodeData: GraphNode[] = [];
  private nodeUniforms: {
    uTime: THREE.IUniform;
    uColorPrimary: THREE.IUniform;
    uColorSecondary: THREE.IUniform;
    uGlowIntensity: THREE.IUniform;
    uIsLightTheme: THREE.IUniform;
  } | null = null;

  private edgeLines: THREE.Line[] = [];
  private particleSystem: THREE.Points | null = null;
  private backgroundParticles: THREE.Points | null = null;
  private fireflySystem: THREE.Points | null = null;
  private sharedEventEdges: THREE.Line[] = [];
  private sacredGeometryGroup: THREE.Group | null = null;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredNode: GraphNode | null = null;
  private onHoverCallback: HoverCallback | null = null;
  private onClickCallback: ClickCallback | null = null;

  private clock: THREE.Clock;
  private animationId: number = 0;
  private cameraAnimation: CameraAnimation | null = null;

  constructor(container: HTMLElement, config: Partial<EngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Scene setup - Deep cosmic indigo for esoteric mandala aesthetic
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0612);
    this.scene.fog = new THREE.FogExp2(0x0a0612, 0.0008);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      5000
    );
    this.camera.position.set(0, 50, 150);

    // Renderer with performance-optimized settings
    this.renderer = new THREE.WebGLRenderer({
      antialias: false, // Using post-process AA instead
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    // Cap pixel ratio at 1.5 for better performance (2.0 is often overkill)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    // Initialize post-processing
    this.composer = new EffectComposer(this.renderer, {
      frameBufferType: THREE.HalfFloatType,
    });

    // Render pass
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // SMAA antialiasing (MEDIUM preset for better performance)
    const smaaEffect = new SMAAEffect({
      preset: SMAAPreset.MEDIUM,
    });

    // Bloom for ethereal glow (reduced intensity for performance)
    this.bloomEffect = new BloomEffect({
      intensity: 0.6,
      mipmapBlur: true,
    });

    // Vignette for atmospheric depth
    this.vignetteEffect = new VignetteEffect({
      darkness: 0.4,
      offset: 0.3,
    });

    // Single effects pass for all post-processing (no chromatic aberration for performance)
    const effectsPass = new EffectPass(
      this.camera,
      smaaEffect,
      this.bloomEffect,
      this.vignetteEffect
    );
    this.composer.addPass(effectsPass);

    // Controls - optimized for smooth panning/zooming
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08; // Higher = smoother but more delayed
    this.controls.maxDistance = 2000;
    this.controls.minDistance = 10;
    this.controls.rotateSpeed = 0.5; // Slower rotation for smoother feel
    this.controls.zoomSpeed = 0.8; // Slightly slower zoom
    this.controls.panSpeed = 0.8; // Slightly slower pan

    // Event listeners
    this.setupEventListeners(container);

    // Add ambient lighting
    this.setupLighting();

    // Add background atmosphere
    this.createBackgroundParticles();

    // Add sacred geometry mandala grid
    this.createSacredGeometryGrid();
  }

  /**
   * Set theme (light/dark)
   * Updates scene background, fog, lighting, post-processing, and materials
   */
  setTheme(theme: 'light' | 'dark'): void {
    const isLight = theme === 'light';

    if (isLight) {
      // Light theme - Illuminated manuscript aesthetic
      const bgColor = 0xf5ebd7; // Aged vellum
      this.scene.background = new THREE.Color(bgColor);
      this.scene.fog = new THREE.FogExp2(bgColor, 0.0003);

      // Adjust post-processing for light theme
      this.bloomEffect.intensity = 0.3;
      this.vignetteEffect.darkness = 0.2;

      // Warm, natural lighting like candlelit scriptorium
      this.scene.traverse((object) => {
        if (object instanceof THREE.AmbientLight) {
          object.color.setHex(0xfff8f0);
          object.intensity = 1.4;
        }
        if (object instanceof THREE.PointLight) {
          if (object.position.y > 0) {
            object.color.setHex(0xffe4b0);
            object.intensity = 1.2;
          } else {
            object.color.setHex(0xc9a227);
            object.intensity = 0.9;
          }
        }
      });
    } else {
      // Dark theme - cosmic mystical
      const bgColor = 0x0a0612;
      this.scene.background = new THREE.Color(bgColor);
      this.scene.fog = new THREE.FogExp2(bgColor, 0.0008);

      // Adjust post-processing for dark theme
      this.bloomEffect.intensity = 0.6;
      this.vignetteEffect.darkness = 0.4;

      // Update lighting for dark theme
      this.scene.traverse((object) => {
        if (object instanceof THREE.AmbientLight) {
          object.color.setHex(0x1a1025);
          object.intensity = 0.6;
        }
        if (object instanceof THREE.PointLight) {
          if (object.position.y > 0) {
            object.color.setHex(0xd4a84b);
            object.intensity = 0.9;
          } else {
            object.color.setHex(0x9966cc);
            object.intensity = 0.7;
          }
        }
      });
    }

    // Update node material
    if (this.nodeInstancedMesh) {
      const material = this.nodeInstancedMesh.material as THREE.ShaderMaterial;
      material.blending = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
      material.uniforms.uIsLightTheme.value = isLight ? 1.0 : 0.0;
      if (isLight) {
        material.uniforms.uColorPrimary.value = new THREE.Color(0x1e3a8a);
        material.uniforms.uColorSecondary.value = new THREE.Color(0xd4a84b);
        material.uniforms.uGlowIntensity.value = 0.15;
      } else {
        material.uniforms.uColorPrimary.value = new THREE.Color(this.config.visuals.colorPrimary);
        material.uniforms.uColorSecondary.value = new THREE.Color(this.config.visuals.colorSecondary);
        material.uniforms.uGlowIntensity.value = this.config.visuals.glowIntensity;
      }
      material.needsUpdate = true;
    }

    // Update outline mesh visibility
    if (this.nodeOutlineMesh) {
      this.nodeOutlineMesh.visible = isLight;
    }

    // Update edge materials
    for (const line of this.edgeLines) {
      const material = line.material as THREE.ShaderMaterial;
      material.blending = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
      material.uniforms.uIsLightTheme.value = isLight ? 1.0 : 0.0;
      if (isLight) {
        material.uniforms.uColorPrimary.value = new THREE.Color(0xd4a84b);
        material.uniforms.uColorSecondary.value = new THREE.Color(0x1e3a8a);
        material.uniforms.uEdgeStrength.value = 1.0;
      } else {
        material.uniforms.uColorPrimary.value = new THREE.Color(this.config.visuals.colorPrimary);
        material.uniforms.uColorSecondary.value = new THREE.Color(this.config.visuals.colorSecondary);
      }
      material.needsUpdate = true;
    }

    // Update shared event edges
    for (const line of this.sharedEventEdges) {
      const material = line.material as THREE.ShaderMaterial;
      material.blending = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
      if (isLight) {
        material.uniforms.uColorGold.value = new THREE.Color(0xd4a84b);
      } else {
        material.uniforms.uColorGold.value = new THREE.Color(1.0, 0.8, 0.3);
      }
      material.needsUpdate = true;
    }

    // Update particle systems - hide in light mode
    if (this.particleSystem) {
      const material = this.particleSystem.material as THREE.ShaderMaterial;
      material.blending = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
      material.uniforms.uSize.value = isLight ? 0 : 10;
      material.needsUpdate = true;
    }

    if (this.backgroundParticles) {
      const material = this.backgroundParticles.material as THREE.ShaderMaterial;
      material.blending = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
      material.uniforms.uSize.value = isLight ? 0 : 15;
      material.needsUpdate = true;
    }

    // Update firefly system
    if (this.fireflySystem) {
      const material = this.fireflySystem.material as THREE.ShaderMaterial;
      material.blending = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
      if (!material.uniforms.uIsLightTheme) {
        material.uniforms.uIsLightTheme = { value: 0.0 };
      }
      material.uniforms.uIsLightTheme.value = isLight ? 1.0 : 0.0;
      material.uniforms.uSize.value = isLight ? 6 : 12;
      material.needsUpdate = true;
    }

    // Update sacred geometry grid
    if (this.sacredGeometryGroup) {
      this.sacredGeometryGroup.traverse((object) => {
        if (object instanceof THREE.Line && object.material instanceof THREE.LineBasicMaterial) {
          object.material.blending = THREE.NormalBlending;
          if (isLight) {
            object.material.opacity = 0.35;
            object.material.color.setHex(0x2c5a8c);
          } else {
            object.material.opacity = 0.08;
            object.material.color.setHex(0xd4a84b);
          }
          object.material.needsUpdate = true;
        }
      });
    }
  }

  private setupEventListeners(container: HTMLElement): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = container.clientWidth / container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(container.clientWidth, container.clientHeight);
      this.composer.setSize(container.clientWidth, container.clientHeight);
    });

    container.addEventListener('mousemove', (event) => {
      const rect = container.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    });

    container.addEventListener('click', (event) => {
      if (this.controls.enableRotate === false) return;

      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );

      this.raycaster.setFromCamera(mouse, this.camera);

      if (this.nodeInstancedMesh) {
        const intersects = this.raycaster.intersectObject(this.nodeInstancedMesh);
        if (intersects.length > 0) {
          const instanceId = intersects[0].instanceId;
          if (instanceId !== undefined && instanceId < this.nodeData.length) {
            const node = this.nodeData[instanceId];
            this.flyToNode(node.id);
            if (this.onClickCallback) {
              this.onClickCallback(node.person);
            }
          }
        }
      }
    });
  }

  private setupLighting(): void {
    // Mystical ambient - deep violet undertone
    const ambient = new THREE.AmbientLight(0x1a1025, 0.6);
    this.scene.add(ambient);

    // Sacred gold light from above
    const light1 = new THREE.PointLight(0xd4a84b, 0.9, 350);
    light1.position.set(50, 60, 50);
    this.scene.add(light1);

    // Luminous violet accent light
    const light2 = new THREE.PointLight(0x9966cc, 0.7, 300);
    light2.position.set(-50, -30, -50);
    this.scene.add(light2);
  }

  private createBackgroundParticles(): void {
    const count = 300; // Reduced for better performance
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 100 + Math.random() * 400;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      phases[i] = Math.random();
      speeds[i] = 0.2 + Math.random() * 0.3;

      const colorChoice = Math.random();
      let hue: number;
      if (colorChoice < 0.5) {
        hue = 0.75 + Math.random() * 0.08;
      } else if (colorChoice < 0.8) {
        hue = 0.1 + Math.random() * 0.05;
      } else {
        hue = 0.95 + Math.random() * 0.05;
      }
      const color = new THREE.Color().setHSL(hue, 0.6, 0.55);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 15 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.backgroundParticles = new THREE.Points(geometry, material);
    this.scene.add(this.backgroundParticles);
  }

  private createSacredGeometryGrid(): void {
    this.sacredGeometryGroup = new THREE.Group();

    const gridColor = new THREE.Color(0xd4a84b);
    const gridMaterial = new THREE.LineBasicMaterial({
      color: gridColor,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
    });

    // Concentric circles
    const ringCount = 8;
    const ringSpacing = 50;

    for (let i = 1; i <= ringCount; i++) {
      const radius = i * ringSpacing;
      const segments = 64 + i * 8;
      const circleGeometry = new THREE.BufferGeometry();
      const circlePoints: number[] = [];

      for (let j = 0; j <= segments; j++) {
        const angle = (j / segments) * Math.PI * 2;
        circlePoints.push(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      }

      circleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(circlePoints, 3));
      const circle = new THREE.Line(circleGeometry, gridMaterial.clone());
      this.sacredGeometryGroup.add(circle);
    }

    // Radial lines (12 cardinal directions)
    const radialCount = 12;
    const maxRadius = ringCount * ringSpacing;

    for (let i = 0; i < radialCount; i++) {
      const angle = (i / radialCount) * Math.PI * 2;
      const lineGeometry = new THREE.BufferGeometry();

      lineGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          [0, 0, 0, Math.cos(angle) * maxRadius, 0, Math.sin(angle) * maxRadius],
          3
        )
      );

      const line = new THREE.Line(lineGeometry, gridMaterial.clone());
      this.sacredGeometryGroup.add(line);
    }

    this.sacredGeometryGroup.position.y = -5;
    this.scene.add(this.sacredGeometryGroup);
  }

  /**
   * Render the family graph
   */
  renderGraph(nodes: GraphNode[], edges: GraphEdge[]): void {
    this.clearScene();
    this.nodeData = nodes;

    this.createInstancedNodes(nodes);
    this.createEdgeLines(nodes, edges);
    this.createNodeParticles(nodes);
    this.createEventFireflies(nodes);
    this.createSharedEventEdges(nodes);

    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';

    console.log(`Rendered ${nodes.length} nodes with modern post-processing pipeline`);
  }

  private clearScene(): void {
    if (this.nodeInstancedMesh) {
      this.scene.remove(this.nodeInstancedMesh);
      this.nodeInstancedMesh.geometry.dispose();
      (this.nodeInstancedMesh.material as THREE.Material).dispose();
      this.nodeInstancedMesh = null;
    }

    if (this.nodeOutlineMesh) {
      this.scene.remove(this.nodeOutlineMesh);
      this.nodeOutlineMesh.geometry.dispose();
      (this.nodeOutlineMesh.material as THREE.Material).dispose();
      this.nodeOutlineMesh = null;
    }

    for (const line of this.edgeLines) {
      this.scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.edgeLines = [];

    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      this.particleSystem.geometry.dispose();
      (this.particleSystem.material as THREE.Material).dispose();
      this.particleSystem = null;
    }

    if (this.fireflySystem) {
      this.scene.remove(this.fireflySystem);
      this.fireflySystem.geometry.dispose();
      (this.fireflySystem.material as THREE.Material).dispose();
      this.fireflySystem = null;
    }

    for (const line of this.sharedEventEdges) {
      this.scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.sharedEventEdges = [];
  }

  private createInstancedNodes(nodes: GraphNode[]): void {
    const count = nodes.length;
    const primary = new THREE.Color(this.config.visuals.colorPrimary);
    const secondary = new THREE.Color(this.config.visuals.colorSecondary);

    // Higher poly sphere for smoother appearance
    const baseSize = this.config.visuals.nodeBaseSize;
    const geometry = new THREE.SphereGeometry(baseSize, 32, 32);

    // Instance attributes
    const biographyWeights = new Float32Array(count);
    const nodeIndices = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      biographyWeights[i] = nodes[i].biographyWeight;
      nodeIndices[i] = i;
    }

    geometry.setAttribute('aBiographyWeight', new THREE.InstancedBufferAttribute(biographyWeights, 1));
    geometry.setAttribute('aNodeIndex', new THREE.InstancedBufferAttribute(nodeIndices, 1));

    this.nodeUniforms = {
      uTime: { value: 0 },
      uColorPrimary: { value: primary },
      uColorSecondary: { value: secondary },
      uGlowIntensity: { value: this.config.visuals.glowIntensity },
      uIsLightTheme: { value: 0 },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: instancedNodeVertexShader,
      fragmentShader: instancedNodeFragmentShader,
      uniforms: this.nodeUniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
    });

    this.nodeInstancedMesh = new THREE.InstancedMesh(geometry, material, count);

    // Create outline mesh for light theme (Wind Waker style)
    const outlineGeometry = new THREE.SphereGeometry(baseSize * 1.05, 32, 32);
    outlineGeometry.setAttribute('aBiographyWeight', new THREE.InstancedBufferAttribute(biographyWeights, 1));
    outlineGeometry.setAttribute('aNodeIndex', new THREE.InstancedBufferAttribute(nodeIndices, 1));

    const outlineMaterial = new THREE.MeshBasicMaterial({
      color: 0x1c1917, // Lamp black
      side: THREE.BackSide,
    });

    this.nodeOutlineMesh = new THREE.InstancedMesh(outlineGeometry, outlineMaterial, count);
    this.nodeOutlineMesh.visible = false; // Only show in light theme

    // Set instance transforms
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      const node = nodes[i];
      position.set(node.position.x, node.position.y, node.position.z);

      const nodeScale = 1 + node.biographyWeight * this.config.visuals.nodeSizeMultiplier;
      scale.set(nodeScale, nodeScale, nodeScale);

      matrix.compose(position, quaternion, scale);
      this.nodeInstancedMesh.setMatrixAt(i, matrix);
      this.nodeOutlineMesh.setMatrixAt(i, matrix);
    }

    this.nodeInstancedMesh.instanceMatrix.needsUpdate = true;
    this.nodeOutlineMesh.instanceMatrix.needsUpdate = true;

    this.scene.add(this.nodeInstancedMesh);
    this.scene.add(this.nodeOutlineMesh);
  }

  private createEdgeLines(nodes: GraphNode[], edges: GraphEdge[]): void {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const primary = new THREE.Color(this.config.visuals.colorPrimary);
    const secondary = new THREE.Color(this.config.visuals.colorSecondary);

    const curvePoints = nodes.length > 500 ? 20 : nodes.length > 200 ? 30 : 50;

    for (const edge of edges) {
      const source = nodeMap.get(edge.sourceId);
      const target = nodeMap.get(edge.targetId);

      if (!source || !target) continue;

      const start = new THREE.Vector3(source.position.x, source.position.y, source.position.z);
      const end = new THREE.Vector3(target.position.x, target.position.y, target.position.z);

      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      const perpendicular = new THREE.Vector3()
        .subVectors(end, start)
        .cross(new THREE.Vector3(0, 1, 0))
        .normalize()
        .multiplyScalar(start.distanceTo(end) * this.config.visuals.edgeCurvature);
      mid.add(perpendicular);

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const points = curve.getPoints(curvePoints);

      const positions = new Float32Array(points.length * 3);
      const progress = new Float32Array(points.length);

      for (let i = 0; i < points.length; i++) {
        positions[i * 3] = points[i].x;
        positions[i * 3 + 1] = points[i].y;
        positions[i * 3 + 2] = points[i].z;
        progress[i] = i / (points.length - 1);
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('aProgress', new THREE.BufferAttribute(progress, 1));

      const material = new THREE.ShaderMaterial({
        vertexShader: edgeVertexShader,
        fragmentShader: edgeFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uColorPrimary: { value: primary },
          uColorSecondary: { value: secondary },
          uEdgeStrength: { value: edge.strength },
          uIsLightTheme: { value: 0 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const line = new THREE.Line(geometry, material);
      this.scene.add(line);
      this.edgeLines.push(line);
    }
  }

  private createNodeParticles(nodes: GraphNode[]): void {
    // Reduced multipliers for better performance
    const particleMultiplier = nodes.length > 500 ? 0.05 : nodes.length > 200 ? 0.1 : 0.2;

    let totalParticles = 0;
    for (const node of nodes) {
      const count = Math.floor(5 + node.biographyWeight * 20 * particleMultiplier);
      totalParticles += count;
    }

    const positions = new Float32Array(totalParticles * 3);
    const phases = new Float32Array(totalParticles);
    const speeds = new Float32Array(totalParticles);
    const colors = new Float32Array(totalParticles * 3);

    let index = 0;
    for (const node of nodes) {
      const count = Math.floor(5 + node.biographyWeight * 20 * particleMultiplier);

      for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const r = 3 + Math.random() * 8 * (1 + node.biographyWeight);

        positions[index * 3] = node.position.x + r * Math.sin(phi) * Math.cos(theta);
        positions[index * 3 + 1] = node.position.y + r * Math.sin(phi) * Math.sin(theta);
        positions[index * 3 + 2] = node.position.z + r * Math.cos(phi);

        phases[index] = Math.random();
        speeds[index] = 0.3 + Math.random() * 0.5;

        const hue = 0.5 + (node.generation * 0.05 + Math.random() * 0.1);
        const sat = 0.7 + node.biographyWeight * 0.3;
        const color = new THREE.Color().setHSL(hue, sat, 0.6);
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;

        index++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 10 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);
  }

  private createEventFireflies(nodes: GraphNode[]): void {
    let totalEvents = 0;
    for (const node of nodes) {
      totalEvents += node.eventCount || 0;
    }

    if (totalEvents === 0) return;

    const orbitRadii = new Float32Array(totalEvents);
    const orbitSpeeds = new Float32Array(totalEvents);
    const orbitPhases = new Float32Array(totalEvents);
    const orbitTilts = new Float32Array(totalEvents);
    const nodePositions = new Float32Array(totalEvents * 3);
    const colors = new Float32Array(totalEvents * 3);
    const eventIndices = new Float32Array(totalEvents);

    const eventTypeColors: Record<string, THREE.Color> = {
      birth: new THREE.Color(0.4, 0.9, 0.6),
      death: new THREE.Color(0.6, 0.5, 0.8),
      marriage: new THREE.Color(1.0, 0.8, 0.4),
      occupation: new THREE.Color(0.4, 0.7, 1.0),
      residence: new THREE.Color(0.6, 0.9, 0.9),
      military_service: new THREE.Color(0.9, 0.5, 0.4),
      graduation: new THREE.Color(0.9, 0.9, 0.5),
      other: new THREE.Color(0.8, 0.8, 0.8),
    };

    const defaultColor = new THREE.Color(0.7, 0.8, 0.9);

    let index = 0;
    for (const node of nodes) {
      const events = node.events || [];
      const eventCount = events.length;
      if (eventCount === 0) continue;

      const nodeScale = 1 + node.biographyWeight * this.config.visuals.nodeSizeMultiplier;
      const baseRadius = this.config.visuals.nodeBaseSize * nodeScale + 4;

      for (let i = 0; i < eventCount; i++) {
        const event = events[i];

        const radiusOffset = (i % 3) * 2;
        orbitRadii[index] = baseRadius + radiusOffset + Math.random() * 1.5;
        orbitSpeeds[index] = 0.3 + Math.random() * 0.4;
        orbitPhases[index] = (i / eventCount) * Math.PI * 2 + Math.random() * 0.5;
        orbitTilts[index] = (Math.random() - 0.5) * Math.PI * 0.6;

        nodePositions[index * 3] = node.position.x;
        nodePositions[index * 3 + 1] = node.position.y;
        nodePositions[index * 3 + 2] = node.position.z;

        const color = eventTypeColors[event.eventType] || defaultColor;
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;

        eventIndices[index] = index;

        index++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(totalEvents * 3), 3));
    geometry.setAttribute('aOrbitRadius', new THREE.BufferAttribute(orbitRadii, 1));
    geometry.setAttribute('aOrbitSpeed', new THREE.BufferAttribute(orbitSpeeds, 1));
    geometry.setAttribute('aOrbitPhase', new THREE.BufferAttribute(orbitPhases, 1));
    geometry.setAttribute('aOrbitTilt', new THREE.BufferAttribute(orbitTilts, 1));
    geometry.setAttribute('aNodePosition', new THREE.BufferAttribute(nodePositions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aEventIndex', new THREE.BufferAttribute(eventIndices, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: fireflyVertexShader,
      fragmentShader: fireflyFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 12 },
        uIsLightTheme: { value: 0.0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.fireflySystem = new THREE.Points(geometry, material);
    this.scene.add(this.fireflySystem);

    console.log(`Created ${totalEvents} event fireflies`);
  }

  private createSharedEventEdges(nodes: GraphNode[]): void {
    const eventSignatureToPersons = new Map<string, Set<string>>();

    for (const node of nodes) {
      const events = node.events || [];
      for (const event of events) {
        const signature = [
          event.eventType || '',
          event.eventDate || event.eventYear?.toString() || '',
          event.location || '',
          event.description || '',
        ].join('|');

        if (!eventSignatureToPersons.has(signature)) {
          eventSignatureToPersons.set(signature, new Set());
        }
        eventSignatureToPersons.get(signature)!.add(node.id);
      }
    }

    const sharedEvents: { personIds: string[]; signature: string }[] = [];
    for (const [signature, personIds] of eventSignatureToPersons) {
      if (personIds.size > 1) {
        sharedEvents.push({
          personIds: Array.from(personIds),
          signature,
        });
      }
    }

    if (sharedEvents.length === 0) return;

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const goldColor = new THREE.Color(1.0, 0.8, 0.3);
    const edgePairs = new Set<string>();

    for (const sharedEvent of sharedEvents) {
      const { personIds } = sharedEvent;

      for (let i = 0; i < personIds.length; i++) {
        for (let j = i + 1; j < personIds.length; j++) {
          const pairKey = [personIds[i], personIds[j]].sort().join('-');
          if (edgePairs.has(pairKey)) continue;
          edgePairs.add(pairKey);

          const nodeA = nodeMap.get(personIds[i]);
          const nodeB = nodeMap.get(personIds[j]);

          if (!nodeA || !nodeB) continue;

          const start = new THREE.Vector3(nodeA.position.x, nodeA.position.y, nodeA.position.z);
          const end = new THREE.Vector3(nodeB.position.x, nodeB.position.y, nodeB.position.z);

          const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

          const distance = start.distanceTo(end);
          const arcHeight = Math.min(distance * 0.4, 30);
          mid.y += arcHeight;

          const perpendicular = new THREE.Vector3()
            .subVectors(end, start)
            .cross(new THREE.Vector3(0, 1, 0))
            .normalize()
            .multiplyScalar(distance * 0.15);
          mid.add(perpendicular);

          const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
          const curvePointCount = nodes.length > 200 ? 25 : 40;
          const points = curve.getPoints(curvePointCount);

          const positions = new Float32Array(points.length * 3);
          const progress = new Float32Array(points.length);

          for (let k = 0; k < points.length; k++) {
            positions[k * 3] = points[k].x;
            positions[k * 3 + 1] = points[k].y;
            positions[k * 3 + 2] = points[k].z;
            progress[k] = k / (points.length - 1);
          }

          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          geometry.setAttribute('aProgress', new THREE.BufferAttribute(progress, 1));

          const material = new THREE.ShaderMaterial({
            vertexShader: sharedEventEdgeVertexShader,
            fragmentShader: sharedEventEdgeFragmentShader,
            uniforms: {
              uTime: { value: 0 },
              uColorGold: { value: goldColor },
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          });

          const line = new THREE.Line(geometry, material);
          this.scene.add(line);
          this.sharedEventEdges.push(line);
        }
      }
    }

    console.log(`Created ${this.sharedEventEdges.length} golden edges for shared events`);
  }

  onHover(callback: HoverCallback): void {
    this.onHoverCallback = callback;
  }

  onClick(callback: ClickCallback): void {
    this.onClickCallback = callback;
  }

  private updateHover(): void {
    if (!this.nodeInstancedMesh || this.nodeData.length === 0) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObject(this.nodeInstancedMesh);

    if (intersects.length > 0) {
      const instanceId = intersects[0].instanceId;
      if (instanceId !== undefined && instanceId < this.nodeData.length) {
        const node = this.nodeData[instanceId];

        if (this.hoveredNode !== node) {
          this.hoveredNode = node;

          const vector = new THREE.Vector3(node.position.x, node.position.y, node.position.z);
          vector.project(this.camera);

          const screenPos = {
            x: (vector.x * 0.5 + 0.5) * window.innerWidth,
            y: (-vector.y * 0.5 + 0.5) * window.innerHeight,
          };

          if (this.onHoverCallback) {
            this.onHoverCallback(node.person, screenPos);
          }
        }
      }
    } else if (this.hoveredNode) {
      this.hoveredNode = null;
      if (this.onHoverCallback) {
        this.onHoverCallback(null, null);
      }
    }
  }

  start(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      const time = this.clock.getElapsedTime();

      // Update uniforms
      if (this.nodeUniforms) {
        this.nodeUniforms.uTime.value = time;
      }

      for (const line of this.edgeLines) {
        const material = line.material as THREE.ShaderMaterial;
        material.uniforms.uTime.value = time;
      }

      if (this.particleSystem) {
        const material = this.particleSystem.material as THREE.ShaderMaterial;
        material.uniforms.uTime.value = time;
      }

      if (this.backgroundParticles) {
        const material = this.backgroundParticles.material as THREE.ShaderMaterial;
        material.uniforms.uTime.value = time;
      }

      if (this.fireflySystem) {
        const material = this.fireflySystem.material as THREE.ShaderMaterial;
        material.uniforms.uTime.value = time;
      }

      for (const line of this.sharedEventEdges) {
        const material = line.material as THREE.ShaderMaterial;
        material.uniforms.uTime.value = time;
      }

      this.updateCameraAnimation();
      this.updateHover();
      this.controls.update();

      // Render with post-processing
      this.composer.render();
    };

    animate();
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  dispose(): void {
    this.stop();
    this.clearScene();

    if (this.backgroundParticles) {
      this.scene.remove(this.backgroundParticles);
      this.backgroundParticles.geometry.dispose();
      (this.backgroundParticles.material as THREE.Material).dispose();
    }

    if (this.sacredGeometryGroup) {
      this.scene.remove(this.sacredGeometryGroup);
    }

    this.composer.dispose();

    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }

    this.renderer.dispose();
    this.controls.dispose();
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  private updateCameraAnimation(): void {
    if (!this.cameraAnimation) return;

    const elapsed = this.clock.getElapsedTime() * 1000;
    const anim = this.cameraAnimation;
    const progress = Math.min((elapsed - anim.startTime) / anim.duration, 1);

    const easedProgress = easeInOutCubic(progress);

    this.camera.position.lerpVectors(anim.startPosition, anim.endPosition, easedProgress);
    this.controls.target.lerpVectors(anim.startTarget, anim.endTarget, easedProgress);

    if (progress >= 1) {
      if (anim.onComplete) {
        anim.onComplete();
      }
      this.cameraAnimation = null;
    }
  }

  focusOnNode(nodeId: string): void {
    const node = this.nodeData.find((n) => n.id === nodeId);
    if (node) {
      const target = new THREE.Vector3(node.position.x, node.position.y, node.position.z);
      this.controls.target.copy(target);
      this.camera.position.set(target.x + 30, target.y + 20, target.z + 50);
    }
  }

  flyToNode(nodeId: string, duration: number = 1200, onComplete?: () => void): void {
    const node = this.nodeData.find((n) => n.id === nodeId);
    if (!node) return;

    const targetPoint = new THREE.Vector3(node.position.x, node.position.y, node.position.z);

    const currentDirection = new THREE.Vector3()
      .subVectors(this.camera.position, this.controls.target)
      .normalize();

    const viewDistance = 40 + node.biographyWeight * 20;

    const endPosition = new THREE.Vector3(
      targetPoint.x + currentDirection.x * viewDistance,
      targetPoint.y + Math.max(currentDirection.y * viewDistance, viewDistance * 0.3),
      targetPoint.z + currentDirection.z * viewDistance
    );

    this.cameraAnimation = {
      startPosition: this.camera.position.clone(),
      endPosition: endPosition,
      startTarget: this.controls.target.clone(),
      endTarget: targetPoint,
      startTime: this.clock.getElapsedTime() * 1000,
      duration: duration,
      onComplete: onComplete,
    };
  }

  getNodeData(): GraphNode[] {
    return this.nodeData;
  }

  searchNodes(query: string): GraphNode[] {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return this.nodeData.filter((node) => node.person.name.toLowerCase().includes(lowerQuery));
  }
}
