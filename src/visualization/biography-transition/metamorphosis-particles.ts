/**
 * Metamorphosis Particle System
 *
 * Creates a dramatic mystic swirl particle effect for the ghost-to-biography transformation.
 * Features thousands of particles with vortex motion, spiraling arms, and intense glow
 * that creates a magical, cosmic transformation effect.
 *
 * Particle Types:
 * - Disc particles (core + arm): Original spiral vortex particles
 * - Sphere shell particles: Dense point cloud matching ghost orb appearance
 *   - Form a spherical shell at ghost radius (~3)
 *   - Fade in during gather phase (0-12%) while ghost orb is visible
 *   - Explode outward at explosion moment (20%)
 *   - Creates "dissolve" effect as ghost fades and sphere particles intensify
 *
 * Animation Timeline (synced with reveal sphere and biography node):
 * 1. Gather (0-12%) - disc particles spiral inward, sphere particles fade in over ghost
 * 2. Compress (12-20%) - ghost fades out (12-20%), sphere particles intensify
 * 3. Explode (20-40%) - dramatic outward burst (ghost already invisible)
 * 4. Peak (40-50%) - maximum expansion, particles slow down
 * 5. Reconvene (50-70%) - particles spiral back inward, forming sphere shape
 *    - Biography node starts growing at 55%, full scale at 85%
 * 6. Intensify (70-90%) - tight sphere formation with intense glow
 *    - Reveal sphere fades in 55-85%, peaks with glow boost 75-88%
 * 7. Reveal (88-100%) - particles + reveal sphere fade out together
 *    - Biography node visible underneath as seamless handoff
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
  /** Ghost sphere radius for shell particles (default: 3) */
  ghostRadius?: number;
  /** Number of sphere shell particles (default: 800) */
  sphereParticleCount?: number;
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
  ghostRadius: 3, // Match ghost node radius
  sphereParticleCount: 800, // Dense sphere shell particles
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
    ghostRadius,
    sphereParticleCount,
  } = { ...DEFAULT_CONFIG, ...config };

  // Total particles = disc/arm particles + sphere shell particles
  const totalCount = count + sphereParticleCount;

  // Create geometry
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(totalCount * 3);
  const phases = new Float32Array(totalCount);
  const armIndices = new Float32Array(totalCount); // Which spiral arm (-1 = core, -2 = sphere shell)
  const radialOffsets = new Float32Array(totalCount); // Distance along arm
  const sizes = new Float32Array(totalCount);
  const brightness = new Float32Array(totalCount); // Individual brightness
  const sphereAngles = new Float32Array(totalCount * 2); // Target angle on final sphere (theta, phi)
  const particleTypes = new Float32Array(totalCount); // 0 = core/arm, 1 = sphere shell

  // First, create the disc/arm particles (original particles)
  for (let i = 0; i < count; i++) {
    // Assign to spiral arm with some core particles
    const isCore = i < count * 0.2; // 20% are core particles
    const armIndex = isCore ? -1 : Math.floor(Math.random() * spiralArms);
    armIndices[i] = armIndex;
    particleTypes[i] = 0; // Disc particle

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

  // Create sphere shell particles (dense point cloud matching ghost orb)
  // These particles form a spherical shell at ghostRadius and dissolve at explosion
  for (let i = 0; i < sphereParticleCount; i++) {
    const idx = count + i;

    // Fibonacci sphere distribution for even coverage on shell
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const theta = 2 * Math.PI * i / goldenRatio;
    const phi = Math.acos(1 - 2 * (i + 0.5) / sphereParticleCount);

    // Position on sphere surface with slight jitter for natural look
    const jitter = 0.05 * ghostRadius;
    const r = ghostRadius + (Math.random() - 0.5) * jitter;
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.cos(phi);
    const z = r * Math.sin(phi) * Math.sin(theta);

    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    // Mark as sphere shell particle
    armIndices[idx] = -2; // -2 indicates sphere shell
    particleTypes[idx] = 1; // Sphere particle

    // Random phase for variation
    phases[idx] = Math.random() * Math.PI * 2;

    // Radial offset based on position on sphere (normalized)
    radialOffsets[idx] = 1.0;

    // Uniform small size for dense appearance
    sizes[idx] = 0.6 + Math.random() * 0.4;

    // Bright particles for visible shell
    brightness[idx] = 1.0 + Math.random() * 0.5;

    // Store sphere angles for explosion direction
    sphereAngles[idx * 2] = theta;
    sphereAngles[idx * 2 + 1] = phi;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('aArmIndex', new THREE.BufferAttribute(armIndices, 1));
  geometry.setAttribute('aRadialOffset', new THREE.BufferAttribute(radialOffsets, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aBrightness', new THREE.BufferAttribute(brightness, 1));
  geometry.setAttribute('aSphereAngles', new THREE.BufferAttribute(sphereAngles, 2));
  geometry.setAttribute('aParticleType', new THREE.BufferAttribute(particleTypes, 1));

  // Create uniforms
  const uTime = uniform(0);
  const uProgress = uniform(0);
  const uPointSize = uniform(pointSize);
  const uOrigin = uniform(new THREE.Vector3(0, 0, 0));
  const uTargetColor = uniform(targetColor);
  const uTargetRadius = uniform(targetRadius);
  const uGhostRadius = uniform(ghostRadius);

  // Vertex attributes
  const phase = attribute('aPhase');
  const armIndex = attribute('aArmIndex');
  const radialOffset = attribute('aRadialOffset');
  const sizeAttr = attribute('aSize');
  const brightnessAttr = attribute('aBrightness');
  const sphereAnglesAttr = attribute('aSphereAngles');
  const particleTypeAttr = attribute('aParticleType'); // 0 = disc, 1 = sphere shell

  // Animation phase boundaries (synced with reveal sphere animation)
  const GATHER_END = float(0.12);
  const COMPRESS_END = float(0.20);
  const EXPLODE_END = float(0.40);
  const PEAK_END = float(0.50);
  const RECONVENE_END = float(0.70);
  const INTENSIFY_END = float(0.90); // Extended to overlap with reveal sphere fade (0.88-1.0)
  // REVEAL: 0.90 to 1.0 - particles fade as biography node takes over

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

  // Sphere shell particle position - maintains shell shape until explosion
  const sphereShellPosition = Fn(() => {
    const p = uProgress;
    const theta = sphereAnglesAttr.x;
    const phi = sphereAnglesAttr.y;

    // Get initial sphere position (from positionLocal)
    const initialPos = positionLocal;

    // Phase 1: Stay at ghost sphere shell position during gather (0-12%)
    // Just gentle pulsing animation
    const gatherPulse = mul(
      sin(add(mul(uTime, float(3.0)), phase)),
      mul(float(0.05), sub(float(1), smoothstep(float(0), GATHER_END, p)))
    );
    const gatherRadius = add(uGhostRadius, gatherPulse);

    // Phase 2: During compress (12-20%), hold position with slight intensifying glow
    // (handled in color/brightness, position stays mostly the same)

    // Phase 3: At explosion (20%), particles burst outward from sphere shell
    const explodeProgress = smoothstep(COMPRESS_END, EXPLODE_END, p);

    // Direction is outward from center (along sphere normal)
    const dirX = mul(sin(phi), cos(theta));
    const dirY = cos(phi);
    const dirZ = mul(sin(phi), sin(theta));
    const explodeDir = vec3(dirX, dirY, dirZ);

    // Explosion distance - sphere particles explode outward
    const explodeDistance = mul(
      pow(explodeProgress, float(0.6)),
      mul(float(maxRadius * 0.8), add(float(1), mul(sin(phase), float(0.3))))
    );

    // Add some spiral motion during explosion for visual interest
    const explosionSpin = mul(explodeProgress, float(2.0));
    const spinCos = cos(add(theta, explosionSpin));
    const spinSin = sin(add(theta, explosionSpin));
    const spinDirX = add(mul(dirX, spinCos), mul(dirZ, spinSin));
    const spinDirZ = add(mul(dirZ, spinCos), mul(dirX.negate(), spinSin));
    const spinExplodeDir = vec3(spinDirX, dirY, spinDirZ);

    // Position during explosion
    const explodedPos = add(
      mul(normalize(initialPos), gatherRadius),
      mul(spinExplodeDir, explodeDistance)
    );

    // Add vertical drift during explosion (matches disc particles)
    const vertDrift = mul(explodeProgress, mul(float(maxRadius * 0.2), add(float(1), mul(sin(phase), float(0.5)))));
    const explodedWithDrift = vec3(explodedPos.x, add(explodedPos.y, vertDrift), explodedPos.z);

    // Phase 4-6: Reconvene back to final sphere (same as disc particles)
    const reconveneProgress = smoothstep(PEAK_END, RECONVENE_END, p);
    const intensifyProgress = smoothstep(RECONVENE_END, INTENSIFY_END, p);

    // Target position on final sphere (Fibonacci distribution)
    const targetX = mul(uTargetRadius, mul(sin(phi), cos(theta)));
    const targetY = mul(uTargetRadius, cos(phi));
    const targetZ = mul(uTargetRadius, mul(sin(phi), sin(theta)));

    // Add gentle spin to target sphere
    const sphereSpinAngle = mul(uTime, float(2.0));
    const finalX = add(mul(targetX, cos(sphereSpinAngle)), mul(targetZ, sin(sphereSpinAngle)));
    const finalZ = add(mul(targetZ, cos(sphereSpinAngle)), mul(targetX.negate(), sin(sphereSpinAngle)));
    const finalTarget = vec3(finalX, targetY, finalZ);

    // Blend from exploded position to final sphere
    const reconveneBlend = pow(reconveneProgress, float(0.7));
    const reconvenedPos = mix(explodedWithDrift, finalTarget, reconveneBlend);

    // Tighten during intensify phase
    const intensifiedPos = mix(reconvenedPos, finalTarget, pow(intensifyProgress, float(0.5)));

    // Select position based on phase
    // Before explosion: at ghost sphere shell
    // After explosion: blend toward final position
    const preExplosionPos = mul(normalize(initialPos), gatherRadius);
    const postExplosionPos = intensifiedPos;
    const explosionStarted = smoothstep(COMPRESS_END, float(0.22), p); // Quick transition at explosion

    return mix(preExplosionPos, postExplosionPos, explosionStarted);
  })();

  // Position calculation with explosion and reformation to sphere
  const positionNode = Fn(() => {
    const p = uProgress;
    const radius = animatedRadius;
    const angle = spiralAngle;
    const isSphereParticle = particleTypeAttr;

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

    // Spiral position (used during explosion) - for disc particles
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
    const discPos = mix(spiralPos, rotatedSphere, pow(toSphereBlend, float(0.6)));

    // Choose between disc particle position and sphere shell particle position
    const finalPos = mix(discPos, sphereShellPosition, isSphereParticle);

    return add(finalPos, uOrigin);
  })();

  // Color - from ghost blue through white-hot, to target color during reformation
  const colorNode = Fn(() => {
    const p = uProgress;
    const isSphereParticle = particleTypeAttr;

    // Colors
    const ghostBlue = vec3(GHOST_COLOR.r, GHOST_COLOR.g, GHOST_COLOR.b);
    const warmOrange = vec3(float(1), float(0.65), float(0.25));
    const whiteHot = vec3(float(1), float(0.98), float(0.92));
    const sacredGold = vec3(SACRED_GOLD.r, SACRED_GOLD.g, SACRED_GOLD.b);
    const target = vec3(uTargetColor);
    const blindingWhite = vec3(float(1), float(1), float(1));

    // === Disc particle color transitions (original behavior) ===
    const toOrange = smoothstep(float(0), float(0.15), p);
    const toWhite = smoothstep(float(0.1), COMPRESS_END, p);
    const toGold = smoothstep(COMPRESS_END, EXPLODE_END, p);
    const toTarget = smoothstep(PEAK_END, RECONVENE_END, p);
    const toBlinding = mul(
      smoothstep(RECONVENE_END, float(0.85), p),
      sub(float(1), smoothstep(float(0.85), float(0.95), p))
    );

    // Mix colors through phases for disc particles
    const c1 = mix(ghostBlue, warmOrange, toOrange);
    const c2 = mix(c1, whiteHot, toWhite);
    const c3 = mix(c2, sacredGold, toGold);
    const c4 = mix(c3, target, toTarget);
    const discColor = mix(c4, blindingWhite, toBlinding);

    // === Sphere shell particle color (stays ghost blue until explosion) ===
    // Phase 1-2 (0-20%): Stay ghost blue with slight intensification
    const sphereGatherColor = ghostBlue;

    // Phase 3 (20%): Flash to white-hot at explosion moment
    const explosionFlash = mul(
      smoothstep(float(0.18), COMPRESS_END, p), // Start just before explosion
      sub(float(1), smoothstep(COMPRESS_END, float(0.25), p)) // Quick fade
    );
    const sphereExplosionColor = mix(sphereGatherColor, blindingWhite, explosionFlash);

    // After explosion: transition to warm colors -> gold -> target (joins disc flow)
    const sphereToWarm = smoothstep(COMPRESS_END, EXPLODE_END, p);
    const sphereToGold = smoothstep(EXPLODE_END, PEAK_END, p);
    const sphereToTarget = smoothstep(PEAK_END, RECONVENE_END, p);
    const sphereToBlinding = mul(
      smoothstep(RECONVENE_END, float(0.85), p),
      sub(float(1), smoothstep(float(0.85), float(0.95), p))
    );

    const sc1 = mix(sphereExplosionColor, warmOrange, sphereToWarm);
    const sc2 = mix(sc1, sacredGold, sphereToGold);
    const sc3 = mix(sc2, target, sphereToTarget);
    const sphereColor = mix(sc3, blindingWhite, sphereToBlinding);

    // Choose color based on particle type
    const baseColor = mix(discColor, sphereColor, isSphereParticle);

    // === Brightness multiplier ===
    // Disc particles: original glow behavior
    const compressionGlow = mul(
      smoothstep(float(0.1), COMPRESS_END, p),
      sub(float(1), smoothstep(COMPRESS_END, EXPLODE_END, p))
    );
    const intensifyGlow = mul(
      smoothstep(RECONVENE_END, float(0.85), p),
      sub(float(1), smoothstep(float(0.85), float(0.95), p))
    );
    const discGlow = add(
      brightnessAttr,
      add(mul(compressionGlow, float(2.5)), mul(intensifyGlow, float(4.0)))
    );

    // Sphere particles: intense glow at explosion moment (much brighter!)
    const sphereExplosionGlow = mul(
      smoothstep(float(0.16), COMPRESS_END, p),
      sub(float(1), smoothstep(COMPRESS_END, float(0.28), p))
    );
    const sphereGlow = add(
      brightnessAttr,
      add(
        mul(sphereExplosionGlow, float(6.0)), // Very bright at explosion!
        add(mul(compressionGlow, float(1.5)), mul(intensifyGlow, float(4.0)))
      )
    );

    const glowMultiplier = mix(discGlow, sphereGlow, isSphereParticle);

    return mul(baseColor, glowMultiplier);
  })();

  // Size animation - swell during compression and intensify phases
  const sizeNode = Fn(() => {
    const p = uProgress;
    const isSphereParticle = particleTypeAttr;

    // === Disc particle size (original behavior) ===
    // Fade in quickly for disc particles
    const discFadeIn = smoothstep(float(0), float(0.08), p);

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

    // Combine effects for disc particles
    const discSwellAmount = add(
      float(1),
      add(
        mul(compressionSwell, float(2.5)),
        sub(mul(reconveneShrink, float(0.5)), mul(intensifySwell.negate(), float(1.5)))
      )
    );

    // Core particles stay visible longer and bigger
    const coreBoost = smoothstep(float(-0.5), float(0), armIndex);
    const discAdjustedFadeOut = mix(fadeOut, max(fadeOut, float(0.4)), coreBoost);

    const discBaseSize = mul(uPointSize, mul(mul(discFadeIn, discAdjustedFadeOut), sizeAttr));
    const discUniformSize = mix(discBaseSize, mul(uPointSize, float(0.8)), intensifySwell);
    const discSize = mul(discUniformSize, max(discSwellAmount, float(0.3)));

    // === Sphere shell particle size ===
    // Gradual fade in during gather phase (0-12%) - creates the ghost dissolve effect
    const sphereFadeIn = smoothstep(float(0), GATHER_END, p);

    // Slight size increase just before explosion for dramatic effect
    const preExplosionSwell = mul(
      smoothstep(GATHER_END, COMPRESS_END, p),
      sub(float(1), smoothstep(COMPRESS_END, float(0.25), p))
    );

    // Sphere particles are smaller initially, denser appearance
    const sphereBaseSize = mul(uPointSize, mul(float(0.7), sizeAttr));

    // Swell during explosion then shrink during reconvene
    const sphereExplosionSwell = mul(
      smoothstep(COMPRESS_END, float(0.25), p),
      sub(float(1), smoothstep(EXPLODE_END, PEAK_END, p))
    );

    const sphereSwellAmount = add(
      float(1),
      add(
        mul(preExplosionSwell, float(1.5)),
        add(mul(sphereExplosionSwell, float(1.8)), mul(intensifySwell.negate(), float(1.5)))
      )
    );

    const sphereSize = mul(
      sphereBaseSize,
      mul(mul(sphereFadeIn, fadeOut), max(sphereSwellAmount, float(0.3)))
    );

    // Choose size based on particle type
    return mix(discSize, sphereSize, isSphereParticle);
  })();

  // Opacity with intense glow during compression and intensify
  // Synced with reveal sphere: both fade out 0.88-1.0 as biography node takes over
  const opacityNode = Fn(() => {
    const p = uProgress;
    const isSphereParticle = particleTypeAttr;

    // === Disc particle opacity (original behavior) ===
    // Fade in quickly for disc particles
    const discFadeIn = smoothstep(float(0), float(0.06), p);

    // Compression glow
    const compressionGlow = mul(
      smoothstep(float(0.12), COMPRESS_END, p),
      sub(float(1), smoothstep(COMPRESS_END, EXPLODE_END, p))
    );

    // Intensify glow - peaks at 0.82, fades by 0.92 (overlaps with biography node at full scale)
    const intensifyGlow = mul(
      smoothstep(RECONVENE_END, float(0.82), p),
      sub(float(1), smoothstep(float(0.82), float(0.92), p))
    );

    const discGlow = add(float(1), add(mul(compressionGlow, float(0.6)), mul(intensifyGlow, float(1.5))));

    // Fade out during reveal phase (0.88-1.0) - synced with reveal sphere fade
    // Biography node is at full scale from 0.85, so particles/reveal sphere blend out smoothly
    const fadeOut = sub(float(1), pow(smoothstep(float(0.88), float(1), p), float(0.5)));

    const discOpacity = clamp(mul(mul(discFadeIn, fadeOut), discGlow), float(0), float(1));

    // === Sphere shell particle opacity ===
    // Gradual fade in during gather phase (0-12%) - matches ghost dissolve timing
    const sphereFadeIn = smoothstep(float(0), GATHER_END, p);

    // Intense glow at explosion moment
    const sphereExplosionGlow = mul(
      smoothstep(float(0.16), COMPRESS_END, p),
      sub(float(1), smoothstep(COMPRESS_END, float(0.30), p))
    );

    const sphereGlow = add(
      float(1),
      add(
        mul(sphereExplosionGlow, float(1.2)), // Bright at explosion
        add(mul(compressionGlow, float(0.4)), mul(intensifyGlow, float(1.5)))
      )
    );

    const sphereOpacity = clamp(mul(mul(sphereFadeIn, fadeOut), sphereGlow), float(0), float(1));

    // Choose opacity based on particle type
    return mix(discOpacity, sphereOpacity, isSphereParticle);
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
