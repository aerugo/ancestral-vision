/**
 * Metamorphosis Particle System
 *
 * Creates a dramatic mystic swirl particle effect for the ghost-to-biography transformation.
 * Features thousands of particles with vortex motion, spiraling arms, and intense glow
 * that creates a magical, cosmic transformation effect.
 *
 * Animation Timeline:
 * 1. Gather (0-12%) - particles spiral inward from ghost node
 * 2. Compress (12-20%) - intense compression to white-hot center
 * 3. Explode (20-40%) - dramatic outward burst
 * 4. Peak (40-50%) - maximum expansion, particles slow down
 * 5. Reconvene (50-70%) - particles spiral back inward, forming sphere shape
 * 6. Intensify (70-88%) - tight sphere formation with intense glow
 * 7. Reveal (88-100%) - blinding flash then fade, new node appears
 *
 * INV-A008: Use three/webgpu for material classes, three/tsl for shader nodes
 * INV-A009: Resource Disposal - Particle geometries and materials disposed on cleanup
 */
import * as THREE from 'three';
import { PointsNodeMaterial } from 'three/webgpu';
import {
  uniform,
  attribute,
  float,
  vec3,
  vec4,
  sin,
  cos,
  mul,
  add,
  sub,
  mix,
  smoothstep,
  clamp,
  abs,
  max,
  min,
  length,
  pow,
  normalize,
  positionLocal,
  Fn,
} from 'three/tsl';
import { GHOST_COLOR, SACRED_GOLD } from '../materials/palette';

/**
 * Configuration for metamorphosis particles
 */
export interface MetamorphosisParticleConfig {
  /** Total number of particles (default: 2000) */
  count?: number;
  /** Node radius to start from (default: 3) */
  startRadius?: number;
  /** Maximum explosion radius (default: 35) */
  maxRadius?: number;
  /** Target sphere radius for reformation (default: 4) */
  targetRadius?: number;
  /** Base point size (default: 24) */
  pointSize?: number;
  /** Target palette color (default: Sacred Gold) */
  targetColor?: THREE.Color;
  /** Vortex rotation speed in radians/sec (default: 5.0) */
  vortexSpeed?: number;
  /** Number of spiral arms (default: 5) */
  spiralArms?: number;
}

/**
 * Uniforms for metamorphosis particle material
 */
export interface MetamorphosisParticleUniforms {
  uTime: { value: number };
  uProgress: { value: number };
  uPointSize: { value: number };
  uOrigin: { value: THREE.Vector3 };
  uTargetColor: { value: THREE.Color };
  uTargetRadius: { value: number };
}

/**
 * Result of particle system creation
 */
export interface MetamorphosisParticleResult {
  mesh: THREE.Points;
  uniforms: MetamorphosisParticleUniforms;
}

const DEFAULT_CONFIG: Required<MetamorphosisParticleConfig> = {
  count: 2000,
  startRadius: 3,
  maxRadius: 35,
  targetRadius: 4,
  pointSize: 24,
  targetColor: SACRED_GOLD.clone(),
  vortexSpeed: 5.0,
  spiralArms: 5,
};

/**
 * Creates a dramatic metamorphosis particle system with explosion and reformation
 *
 * @param config - Particle system configuration
 * @returns Points mesh and uniform references
 */
export function createMetamorphosisParticles(
  config: MetamorphosisParticleConfig = {}
): MetamorphosisParticleResult {
  const {
    count,
    startRadius,
    maxRadius,
    targetRadius,
    pointSize,
    targetColor,
    vortexSpeed,
    spiralArms,
  } = { ...DEFAULT_CONFIG, ...config };

  // Create geometry
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const armIndices = new Float32Array(count); // Which spiral arm
  const radialOffsets = new Float32Array(count); // Distance along arm
  const sizes = new Float32Array(count);
  const brightness = new Float32Array(count); // Individual brightness
  const sphereAngles = new Float32Array(count * 2); // Target angle on final sphere (theta, phi)

  for (let i = 0; i < count; i++) {
    // Assign to spiral arm with some core particles
    const isCore = i < count * 0.2; // 20% are core particles
    const armIndex = isCore ? -1 : Math.floor(Math.random() * spiralArms);
    armIndices[i] = armIndex;

    // Random angle within the arm (arms spread out)
    const armAngle = armIndex >= 0
      ? (armIndex / spiralArms) * Math.PI * 2 + (Math.random() - 0.5) * 0.6
      : Math.random() * Math.PI * 2;

    // Radial position - logarithmic distribution for natural spiral look
    const radialT = Math.random();
    const radialDist = isCore
      ? radialT * radialT * startRadius * 0.8 // Core: concentrated at center
      : startRadius * 0.5 + Math.pow(radialT, 0.7) * startRadius * 1.5; // Arms: spread outward

    radialOffsets[i] = radialDist / startRadius;

    // Vertical spread (thinner at edges, thicker at center)
    const verticalSpread = isCore
      ? (Math.random() - 0.5) * startRadius * 0.5
      : (Math.random() - 0.5) * startRadius * 0.3 * (1 - radialT * 0.7);

    // Initial position
    positions[i * 3] = Math.cos(armAngle) * radialDist;
    positions[i * 3 + 1] = verticalSpread;
    positions[i * 3 + 2] = Math.sin(armAngle) * radialDist;

    // Random phase for variation
    phases[i] = Math.random() * Math.PI * 2;

    // Size variation - core particles larger, arm tips smaller
    if (isCore) {
      sizes[i] = 1.0 + Math.random() * 1.2;
    } else {
      sizes[i] = 0.4 + Math.random() * 0.7 * (1 - radialT * 0.5);
    }

    // Brightness - core much brighter
    brightness[i] = isCore
      ? 1.3 + Math.random() * 0.8
      : 0.5 + Math.random() * 0.5;

    // Target position on the final sphere (Fibonacci sphere distribution for even coverage)
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const theta = 2 * Math.PI * i / goldenRatio; // Azimuthal angle
    const phi = Math.acos(1 - 2 * (i + 0.5) / count); // Polar angle
    sphereAngles[i * 2] = theta;
    sphereAngles[i * 2 + 1] = phi;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('aArmIndex', new THREE.BufferAttribute(armIndices, 1));
  geometry.setAttribute('aRadialOffset', new THREE.BufferAttribute(radialOffsets, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aBrightness', new THREE.BufferAttribute(brightness, 1));
  geometry.setAttribute('aSphereAngles', new THREE.BufferAttribute(sphereAngles, 2));

  // Create uniforms
  const uTime = uniform(0);
  const uProgress = uniform(0);
  const uPointSize = uniform(pointSize);
  const uOrigin = uniform(new THREE.Vector3(0, 0, 0));
  const uTargetColor = uniform(targetColor);
  const uTargetRadius = uniform(targetRadius);

  // Vertex attributes
  const phase = attribute('aPhase');
  const armIndex = attribute('aArmIndex');
  const radialOffset = attribute('aRadialOffset');
  const sizeAttr = attribute('aSize');
  const brightnessAttr = attribute('aBrightness');
  const sphereAnglesAttr = attribute('aSphereAngles');

  // Animation phase boundaries
  const GATHER_END = float(0.12);
  const COMPRESS_END = float(0.20);
  const EXPLODE_END = float(0.40);
  const PEAK_END = float(0.50);
  const RECONVENE_END = float(0.70);
  const INTENSIFY_END = float(0.88);
  // REVEAL: 0.88 to 1.0

  // Spiral angle calculation - creates the twisting vortex effect
  const spiralAngle = Fn(() => {
    const p = uProgress;
    const baseRotation = mul(uTime, float(vortexSpeed));

    // Rotation accelerates during compression, slows during explosion, speeds up during reconvene
    const compressionBoost = mul(
      smoothstep(GATHER_END, COMPRESS_END, p),
      sub(float(1), smoothstep(COMPRESS_END, EXPLODE_END, p))
    );
    const reconveneBoost = mul(
      smoothstep(PEAK_END, RECONVENE_END, p),
      sub(float(1), smoothstep(RECONVENE_END, INTENSIFY_END, p))
    );
    const rotationSpeed = add(float(1), add(mul(compressionBoost, float(4)), mul(reconveneBoost, float(3))));

    // Spiral tightening during gather and reconvene
    const spiralTightness = mix(
      float(0.5),
      float(2.5),
      smoothstep(float(0), COMPRESS_END, p)
    );
    const spiralLoosen = mix(
      spiralTightness,
      float(0.2),
      smoothstep(COMPRESS_END, PEAK_END, p)
    );
    const spiralRetighten = mix(
      spiralLoosen,
      float(3.0),
      smoothstep(PEAK_END, INTENSIFY_END, p)
    );

    return add(
      mul(baseRotation, rotationSpeed),
      add(phase, mul(radialOffset, spiralRetighten))
    );
  })();

  // Calculate target position on sphere surface
  const sphereTargetPos = Fn(() => {
    const theta = sphereAnglesAttr.x;
    const phi = sphereAnglesAttr.y;
    const r = uTargetRadius;

    const x = mul(r, mul(sin(phi), cos(theta)));
    const y = mul(r, cos(phi));
    const z = mul(r, mul(sin(phi), sin(theta)));

    return vec3(x, y, z);
  })();

  // Radius animation with explosion and reformation
  const animatedRadius = Fn(() => {
    const p = uProgress;
    const startDist = length(positionLocal);

    // Phase 1: Gather (0 to 0.12) - particles spiral inward
    const gatherProgress = smoothstep(float(0), GATHER_END, p);
    const gatherRadius = mul(startDist, sub(float(1), mul(gatherProgress, float(0.75))));

    // Phase 2: Compress (0.12 to 0.20) - intense compression to center
    const compressProgress = smoothstep(GATHER_END, COMPRESS_END, p);
    const compressRadius = mul(gatherRadius, sub(float(1), mul(compressProgress, float(0.7))));

    // Phase 3: Explode (0.20 to 0.40) - dramatic outward burst
    const explodeProgress = smoothstep(COMPRESS_END, EXPLODE_END, p);
    const explodeBoost = add(float(1), mul(radialOffset, float(0.4)));
    const explodeRadius = add(
      compressRadius,
      mul(pow(explodeProgress, float(0.5)), mul(float(maxRadius), explodeBoost))
    );

    // Phase 4: Peak (0.40 to 0.50) - slight continued expansion
    const peakProgress = smoothstep(EXPLODE_END, PEAK_END, p);
    const peakRadius = add(explodeRadius, mul(peakProgress, float(maxRadius * 0.15)));

    // Phase 5: Reconvene (0.50 to 0.70) - particles gather back toward center
    const reconveneProgress = smoothstep(PEAK_END, RECONVENE_END, p);
    // Ease back toward target radius with some overshoot prevention
    const reconveneTarget = mul(uTargetRadius, float(1.5)); // Slightly larger than final
    const reconveneRadius = mix(peakRadius, reconveneTarget, pow(reconveneProgress, float(0.7)));

    // Phase 6: Intensify (0.70 to 0.88) - tighten to exact sphere radius
    const intensifyProgress = smoothstep(RECONVENE_END, INTENSIFY_END, p);
    const intensifyRadius = mix(reconveneRadius, uTargetRadius, pow(intensifyProgress, float(0.5)));

    // Phase 7: Reveal (0.88 to 1.0) - hold at target radius
    const revealProgress = smoothstep(INTENSIFY_END, float(1), p);
    const finalRadius = mix(intensifyRadius, uTargetRadius, revealProgress);

    return finalRadius;
  })();

  // Vertical motion - up during explosion, back to sphere during reconvene
  const verticalOffset = Fn(() => {
    const p = uProgress;

    // Upward drift during explosion
    const explodePhase = smoothstep(COMPRESS_END, PEAK_END, p);
    const baseDrift = mul(explodePhase, float(maxRadius * 0.3));

    // Return to sphere level during reconvene
    const reconvenePhase = smoothstep(PEAK_END, INTENSIFY_END, p);
    const returnDrift = mul(baseDrift, sub(float(1), reconvenePhase));

    // Add turbulence during explosion only
    const turbulenceAmount = mul(
      explodePhase,
      sub(float(1), smoothstep(EXPLODE_END, RECONVENE_END, p))
    );
    const turbulence = mul(
      sin(add(mul(uTime, float(2.5)), mul(phase, float(3)))),
      mul(turbulenceAmount, float(3))
    );

    return add(returnDrift, turbulence);
  })();

  // Position calculation with explosion and reformation to sphere
  const positionNode = Fn(() => {
    const p = uProgress;
    const radius = animatedRadius;
    const angle = spiralAngle;

    // Get original direction for spiral motion
    const origLen = max(length(positionLocal), float(0.001));
    const origAngle = Fn(() => {
      const x = positionLocal.x;
      const z = positionLocal.z;
      return add(
        mul(float(Math.PI), smoothstep(float(0), float(0.001), x.negate())),
        mul(z.div(max(abs(x), float(0.001))), float(0.7))
      );
    })();

    // Apply spiral rotation
    const totalAngle = add(origAngle, angle);
    const cosA = cos(totalAngle);
    const sinA = sin(totalAngle);

    // Flatten ratio - more disc-like during compression
    const flattenAmount = mul(
      smoothstep(float(0.05), COMPRESS_END, p),
      sub(float(1), smoothstep(COMPRESS_END, EXPLODE_END, p))
    );
    const yScale = sub(float(1), mul(flattenAmount, float(0.8)));

    // Spiral position (used during explosion)
    const spiralX = mul(cosA, radius);
    const spiralY = add(
      mul(mul(positionLocal.y.div(max(origLen, float(0.001))), radius), yScale),
      verticalOffset
    );
    const spiralZ = mul(sinA, radius);
    const spiralPos = vec3(spiralX, spiralY, spiralZ);

    // Sphere target position (with spinning animation)
    const sphereTarget = sphereTargetPos;
    const sphereSpinAngle = mul(uTime, float(2.0)); // Gentle spin
    const sphereX = add(
      mul(sphereTarget.x, cos(sphereSpinAngle)),
      mul(sphereTarget.z, sin(sphereSpinAngle))
    );
    const sphereZ = add(
      mul(sphereTarget.z, cos(sphereSpinAngle)),
      mul(sphereTarget.x.negate(), sin(sphereSpinAngle))
    );
    const rotatedSphere = vec3(sphereX, sphereTarget.y, sphereZ);

    // Blend from spiral to sphere during reconvene/intensify phases
    const toSphereBlend = smoothstep(PEAK_END, INTENSIFY_END, p);
    const blendedPos = mix(spiralPos, rotatedSphere, pow(toSphereBlend, float(0.6)));

    return add(blendedPos, uOrigin);
  })();

  // Color - from ghost blue through white-hot, to target color during reformation
  const colorNode = Fn(() => {
    const p = uProgress;

    // Colors
    const ghostBlue = vec3(GHOST_COLOR.r, GHOST_COLOR.g, GHOST_COLOR.b);
    const warmOrange = vec3(float(1), float(0.65), float(0.25));
    const whiteHot = vec3(float(1), float(0.98), float(0.92));
    const sacredGold = vec3(SACRED_GOLD.r, SACRED_GOLD.g, SACRED_GOLD.b);
    const target = vec3(uTargetColor);
    const blindingWhite = vec3(float(1), float(1), float(1));

    // Phase transitions
    const toOrange = smoothstep(float(0), float(0.15), p);
    const toWhite = smoothstep(float(0.1), COMPRESS_END, p);
    const toGold = smoothstep(COMPRESS_END, EXPLODE_END, p);
    const toTarget = smoothstep(PEAK_END, RECONVENE_END, p);
    const toBlinding = mul(
      smoothstep(RECONVENE_END, float(0.85), p),
      sub(float(1), smoothstep(float(0.85), float(0.95), p))
    );

    // Mix colors through phases
    const c1 = mix(ghostBlue, warmOrange, toOrange);
    const c2 = mix(c1, whiteHot, toWhite);
    const c3 = mix(c2, sacredGold, toGold);
    const c4 = mix(c3, target, toTarget);
    const c5 = mix(c4, blindingWhite, toBlinding);

    // Brightness boost based on phase
    const compressionGlow = mul(
      smoothstep(float(0.1), COMPRESS_END, p),
      sub(float(1), smoothstep(COMPRESS_END, EXPLODE_END, p))
    );
    const intensifyGlow = mul(
      smoothstep(RECONVENE_END, float(0.85), p),
      sub(float(1), smoothstep(float(0.85), float(0.95), p))
    );
    const glowMultiplier = add(
      brightnessAttr,
      add(mul(compressionGlow, float(2.5)), mul(intensifyGlow, float(4.0)))
    );

    return mul(c5, glowMultiplier);
  })();

  // Size animation - swell during compression and intensify phases
  const sizeNode = Fn(() => {
    const p = uProgress;

    // Fade in
    const fadeIn = smoothstep(float(0), float(0.08), p);

    // Compression swell
    const compressionSwell = mul(
      smoothstep(float(0.1), COMPRESS_END, p),
      sub(float(1), smoothstep(COMPRESS_END, EXPLODE_END, p))
    );

    // Reconvene shrink - particles get smaller as they converge
    const reconveneShrink = smoothstep(PEAK_END, RECONVENE_END, p);

    // Intensify swell - particles grow during bright flash
    const intensifySwell = mul(
      smoothstep(RECONVENE_END, float(0.82), p),
      sub(float(1), smoothstep(float(0.82), float(0.95), p))
    );

    // Fade out during reveal
    const fadeOut = sub(float(1), smoothstep(float(0.88), float(1), p));

    // Combine effects
    const swellAmount = add(
      float(1),
      add(
        mul(compressionSwell, float(2.5)),
        sub(mul(reconveneShrink, float(0.5)), mul(intensifySwell.negate(), float(1.5)))
      )
    );

    // Core particles stay visible longer and bigger
    const coreBoost = smoothstep(float(-0.5), float(0), armIndex);
    const adjustedFadeOut = mix(fadeOut, max(fadeOut, float(0.4)), coreBoost);

    const baseSize = mul(uPointSize, mul(mul(fadeIn, adjustedFadeOut), sizeAttr));

    // During intensify, all particles converge to similar size
    const uniformSize = mix(baseSize, mul(uPointSize, float(0.8)), intensifySwell);

    return mul(uniformSize, max(swellAmount, float(0.3)));
  })();

  // Opacity with intense glow during compression and intensify
  const opacityNode = Fn(() => {
    const p = uProgress;

    // Fade in quickly
    const fadeIn = smoothstep(float(0), float(0.06), p);

    // Compression glow
    const compressionGlow = mul(
      smoothstep(float(0.12), COMPRESS_END, p),
      sub(float(1), smoothstep(COMPRESS_END, EXPLODE_END, p))
    );

    // Intensify glow - very bright before reveal (extended range for more drama)
    const intensifyGlow = mul(
      smoothstep(RECONVENE_END, float(0.80), p),
      sub(float(1), smoothstep(float(0.80), float(0.94), p))
    );

    const glow = add(float(1), add(mul(compressionGlow, float(0.6)), mul(intensifyGlow, float(1.5))));

    // Fade out during final reveal (starts at 0.92 to overlap with reveal sphere)
    const fadeOut = sub(float(1), pow(smoothstep(float(0.92), float(1), p), float(0.4)));

    return clamp(mul(mul(fadeIn, fadeOut), glow), float(0), float(1));
  })();

  // Create material with additive blending for glow
  const material = new PointsNodeMaterial();
  material.positionNode = positionNode;
  material.colorNode = vec4(colorNode, opacityNode);
  material.sizeNode = sizeNode;
  material.transparent = true;
  material.blending = THREE.AdditiveBlending;
  material.depthWrite = false;
  material.sizeAttenuation = true;

  // Create mesh
  const mesh = new THREE.Points(geometry, material);
  mesh.frustumCulled = false;
  mesh.visible = false;

  const uniforms: MetamorphosisParticleUniforms = {
    uTime: uTime as unknown as { value: number },
    uProgress: uProgress as unknown as { value: number },
    uPointSize: uPointSize as unknown as { value: number },
    uOrigin: uOrigin as unknown as { value: THREE.Vector3 },
    uTargetColor: uTargetColor as unknown as { value: THREE.Color },
    uTargetRadius: uTargetRadius as unknown as { value: number },
  };

  return { mesh, uniforms };
}

/**
 * Updates particle animation progress
 */
export function updateMetamorphosisParticles(
  uniforms: MetamorphosisParticleUniforms,
  progress: number,
  time: number
): void {
  uniforms.uProgress.value = progress;
  uniforms.uTime.value = time;
}

/**
 * Sets the origin position for the particle burst
 */
export function setMetamorphosisParticleOrigin(
  uniforms: MetamorphosisParticleUniforms,
  position: THREE.Vector3
): void {
  uniforms.uOrigin.value.copy(position);
}

/**
 * Sets the target color for the particle transition
 */
export function setMetamorphosisTargetColor(
  uniforms: MetamorphosisParticleUniforms,
  color: THREE.Color
): void {
  uniforms.uTargetColor.value.copy(color);
}

/**
 * Sets the target radius for the reformed sphere
 */
export function setMetamorphosisTargetRadius(
  uniforms: MetamorphosisParticleUniforms,
  radius: number
): void {
  uniforms.uTargetRadius.value = radius;
}

/**
 * Disposes particle system resources (INV-A009)
 */
export function disposeMetamorphosisParticles(mesh: THREE.Points): void {
  mesh.geometry.dispose();
  if (Array.isArray(mesh.material)) {
    mesh.material.forEach((m) => m.dispose());
  } else {
    mesh.material.dispose();
  }
}
