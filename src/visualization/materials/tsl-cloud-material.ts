/**
 * TSL Mystical Sphere Material
 *
 * WebGPU-compatible material inspired by:
 * - Hilma af Klint: Soft spiritual colors, circles within circles, subtle gradients
 * - Gustav Klimt: Golden patterns, decorative spirals, Byzantine warmth
 * - Sacred geometry: Flower of life, golden spirals, mandalas
 *
 * Creates luminous, self-illuminated spheres with organic flowing patterns.
 */
import * as THREE from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import {
  uniform,
  attribute,
  vec3,
  vec4,
  float,
  positionLocal,
  normalLocal,
  wgslFn,
  Fn,
  mix,
  mul,
  add,
  pow,
  sub,
  max,
  dot,
  normalize,
  cameraPosition,
  positionWorld,
  normalWorld,
} from 'three/tsl';
import { SCIFI_PALETTE, SELECTION_STATE } from './palette';

/** Preset names for mystical sphere materials */
export type TSLCloudPreset = 'lava' | 'celestial' | 'sacred';

export interface TSLCloudMaterialConfig {
  /** Use a preset instead of custom colors */
  preset?: TSLCloudPreset;
  /** Primary cloud color tint (ignored when usePaletteColors is true) */
  colorPrimary?: THREE.Color;
  /** Secondary accent color (ignored when usePaletteColors is true) */
  colorSecondary?: THREE.Color;
  /** Highlight color for shimmer/accents */
  colorHighlight?: THREE.Color;
  /** Flow animation speed (default: 1.0) */
  flowSpeed?: number;
  /** Cloud density multiplier (default: 1.0) */
  cloudDensity?: number;
  /** Glow intensity (default: 1.0) - base glow before selection modulation */
  glowIntensity?: number;
  /** Enable selection-based glow modulation (default: false) */
  selectionGlowEnabled?: boolean;
  /** Base glow intensity when not selected (default: 0.3) */
  baseGlowIntensity?: number;
  /** Glow multiplier when selected (default: 3.0) */
  selectedGlowMultiplier?: number;
  /** Glow multiplier for connected nodes (default: 1.8) */
  connectedGlowMultiplier?: number;
  /** Use sci-fi palette colors based on aColorIndex attribute (default: false) */
  usePaletteColors?: boolean;
}

export interface TSLCloudMaterialUniforms {
  uTime: { value: number };
  uFlowSpeed: { value: number };
  uCloudDensity: { value: number };
  uGlowIntensity: { value: number };
  uColorPrimary: { value: THREE.Color };
  uColorSecondary: { value: THREE.Color };
  uColorHighlight: { value: THREE.Color };
  /** Selection glow uniforms (only present when selectionGlowEnabled=true) */
  uBaseGlow?: { value: number };
  uConnectedGlowMult?: { value: number };
  uSelectedGlowMult?: { value: number };
  /** Palette color uniforms (only present when usePaletteColors=true) */
  uPaletteColor0?: { value: THREE.Color };
  uPaletteColor1?: { value: THREE.Color };
  uPaletteColor2?: { value: THREE.Color };
  uPaletteColor3?: { value: THREE.Color };
  uPaletteColor4?: { value: THREE.Color };
}

export interface TSLCloudMaterialResult {
  material: THREE.Material;
  uniforms: TSLCloudMaterialUniforms;
}

// Preset configurations
const PRESETS: Record<TSLCloudPreset, {
  colorPrimary: THREE.Color;
  colorSecondary: THREE.Color;
  colorHighlight: THREE.Color;
  flowSpeed: number;
  cloudDensity: number;
  glowIntensity: number;
}> = {
  // Lava preset - fiery, molten appearance like webgpu-metaballs
  lava: {
    colorPrimary: new THREE.Color(0xff4500), // Orange-red
    colorSecondary: new THREE.Color(0x8b0000), // Dark red
    colorHighlight: new THREE.Color(0xffff00), // Bright yellow
    flowSpeed: 0.6,
    cloudDensity: 1.2,
    glowIntensity: 1.5,
  },
  // Celestial preset - cosmic nebula appearance
  celestial: {
    colorPrimary: new THREE.Color(0x4169e1), // Royal blue
    colorSecondary: new THREE.Color(0x2d1b69), // Deep purple
    colorHighlight: new THREE.Color(0x00ffff), // Cyan
    flowSpeed: 0.4,
    cloudDensity: 0.9,
    glowIntensity: 1.2,
  },
  // Sacred preset - Klimt/Hilma af Klint inspired golden patterns (default)
  sacred: {
    colorPrimary: new THREE.Color(0xd4a84b), // Rich gold
    colorSecondary: new THREE.Color(0x8b6914), // Deep amber
    colorHighlight: new THREE.Color(0xffd700), // Gold
    flowSpeed: 0.3,
    cloudDensity: 1.0,
    glowIntensity: 1.0,
  },
};

// Default to sacred preset
const DEFAULT_COLOR_PRIMARY = PRESETS.sacred.colorPrimary.clone();
const DEFAULT_COLOR_SECONDARY = PRESETS.sacred.colorSecondary.clone();
const DEFAULT_COLOR_HIGHLIGHT = PRESETS.sacred.colorHighlight.clone();

/**
 * WGSL Mystical Sphere Shader
 *
 * Combines sacred geometry patterns with organic flow for a
 * Hilma af Klint / Gustav Klimt inspired luminous sphere.
 */
const mysticalSphere = wgslFn(`
  fn mysticalSphere(
    localPos: vec3<f32>,
    localNormal: vec3<f32>,
    time: f32,
    flowSpeed: f32,
    densityMult: f32,
    glowIntensity: f32,
    colorPrimary: vec3<f32>,
    colorSecondary: vec3<f32>,
    colorHighlight: vec3<f32>
  ) -> vec4<f32> {
    // Rotation matrix for pattern flow
    let m3 = mat3x3<f32>(
      vec3<f32>(0.33338, 0.56034, -0.71817),
      vec3<f32>(-0.87887, 0.32651, -0.15323),
      vec3<f32>(0.15162, 0.69596, 0.61339)
    );

    let flowTime = time * flowSpeed;

    // Normalize position for consistent sampling
    let spherePos = normalize(localPos);

    // Convert to spherical coordinates for pattern mapping
    let theta = atan2(spherePos.z, spherePos.x); // Longitude
    let phi = acos(clamp(spherePos.y, -1.0, 1.0)); // Latitude

    // === SACRED GEOMETRY: Golden Spiral Pattern ===
    // Create flowing spiral arms (Klimt-inspired)
    let spiralAngle = theta + phi * 3.0 + flowTime * 0.2;
    let spiralR = phi / 3.14159;
    let goldenSpiral = sin(spiralAngle * 5.0 + spiralR * 8.0 - flowTime * 0.5) * 0.5 + 0.5;

    // === SACRED GEOMETRY: Flower of Life Pattern ===
    // Overlapping circles creating the seed of life
    var flowerPattern: f32 = 0.0;
    let flowerScale = 4.0;
    for (var i: i32 = 0; i < 6; i = i + 1) {
      let angle = f32(i) * 3.14159 / 3.0 + flowTime * 0.1;
      let cx = cos(angle) * 0.3;
      let cy = sin(angle) * 0.3;
      let dist = length(vec2<f32>(spherePos.x - cx, spherePos.z - cy));
      let circle = smoothstep(0.35, 0.30, dist);
      flowerPattern = max(flowerPattern, circle * 0.5);
    }
    // Central circle
    let centerDist = length(vec2<f32>(spherePos.x, spherePos.z));
    flowerPattern = max(flowerPattern, smoothstep(0.35, 0.30, centerDist) * 0.5);

    // === ORGANIC FLOW: Protean Clouds Turbulence ===
    var p = spherePos * 2.5 + vec3<f32>(
      sin(flowTime * 0.15) * 0.4,
      cos(flowTime * 0.12) * 0.4,
      flowTime * 0.08
    );

    // Animated rotation
    let rotAngle = flowTime * 0.05;
    let c = cos(rotAngle);
    let s = sin(rotAngle);
    p = vec3<f32>(p.x * c - p.z * s, p.y, p.x * s + p.z * c);

    // Multi-octave turbulence
    var turb: f32 = 0.0;
    var amp: f32 = 1.0;
    let dsp = 0.15;

    p = p + sin(p.zxy * 0.7 + flowTime * 0.4) * dsp;
    turb = turb - abs(dot(cos(p), sin(p.yzx)) * amp);
    amp = amp * 0.5;
    p = m3 * p * 2.0;

    p = p + sin(p.zxy * 0.7 + flowTime * 0.4) * dsp;
    turb = turb - abs(dot(cos(p), sin(p.yzx)) * amp);
    amp = amp * 0.5;
    p = m3 * p * 2.0;

    p = p + sin(p.zxy * 0.7 + flowTime * 0.4) * dsp;
    turb = turb - abs(dot(cos(p), sin(p.yzx)) * amp);
    amp = amp * 0.5;
    p = m3 * p * 2.0;

    p = p + sin(p.zxy * 0.7 + flowTime * 0.4) * dsp;
    turb = turb - abs(dot(cos(p), sin(p.yzx)) * amp);

    // Normalize turbulence (range -2 to 0 -> 0 to 1)
    let turbNorm = (turb + 2.0) * 0.5;

    // === COMBINE PATTERNS (Hilma af Klint style layering) ===
    // Ensure minimum pattern value to avoid dark blotches
    let patternMix = max(turbNorm * 0.5 + goldenSpiral * 0.3 + flowerPattern * 0.2, 0.25);
    let patternIntensity = pow(patternMix, 1.1) * densityMult;

    // === COLOR PALETTE (Klimt golden warmth) ===
    // Base: warm amber to gold gradient with minimum brightness
    let goldBase = mix(colorSecondary, colorPrimary, clamp(patternIntensity, 0.3, 1.0));

    // Add subtle color variation based on position
    let positionHue = (spherePos.y + 1.0) * 0.5; // 0 at bottom, 1 at top

    // Create complementary accent colors from the highlight
    let accentLight = colorHighlight * 1.2; // Brighter version
    let accentDark = colorHighlight * 0.6; // Darker version

    // Blend colors based on pattern and position
    var finalColor = goldBase;
    finalColor = mix(finalColor, accentDark, (1.0 - positionHue) * turbNorm * 0.3);
    finalColor = mix(finalColor, colorHighlight, goldenSpiral * 0.4);
    finalColor = mix(finalColor, accentLight, flowerPattern * positionHue * 0.3);

    // === SELF-ILLUMINATION (inner glow) ===
    // Strong base glow for visible luminous spheres - prevents dark blotches
    let innerGlow = 0.55 + patternIntensity * 0.35; // Base illumination 55-90%
    finalColor = finalColor * innerGlow;

    // === SURFACE LIGHTING (subtle directional) ===
    // Soft directional lights for depth and form
    let light1 = normalize(vec3<f32>(1.0, 1.0, 0.5));
    let light2 = normalize(vec3<f32>(-0.5, 0.5, -1.0));
    let light3 = normalize(vec3<f32>(0.0, -1.0, 0.0));

    let diffuse1 = max(dot(localNormal, light1), 0.0) * 0.15;
    let diffuse2 = max(dot(localNormal, light2), 0.0) * 0.12;
    let diffuse3 = max(dot(localNormal, light3), 0.0) * 0.08;

    // Wrap lighting for softer falloff
    let wrap1 = (dot(localNormal, light1) * 0.5 + 0.5);
    let wrap2 = (dot(localNormal, light2) * 0.5 + 0.5);
    let wrapLight = wrap1 * 0.1 + wrap2 * 0.08;

    let surfaceLight = diffuse1 + diffuse2 + diffuse3 + wrapLight;
    finalColor = finalColor + finalColor * surfaceLight;

    // === RIM GLOW (Fresnel) - edge highlight for form definition ===
    let viewDot = abs(dot(normalize(localPos), localNormal));
    let fresnel = pow(1.0 - viewDot, 2.5);
    let rimColor = mix(colorPrimary, colorHighlight, 0.5) * fresnel * glowIntensity * 0.2;
    finalColor = finalColor + rimColor;

    // === SHIMMER (animated sparkles) ===
    let shimmerPos = spherePos * 20.0 + vec3<f32>(flowTime * 0.3, flowTime * 0.2, flowTime * 0.25);
    var shimmer = sin(shimmerPos.x) * sin(shimmerPos.y) * sin(shimmerPos.z);
    shimmer = pow(max(shimmer, 0.0), 8.0) * 0.1;
    finalColor = finalColor + colorHighlight * shimmer;

    // === FINAL OUTPUT ===
    // Minimum brightness for visibility - prevents dark blotches
    finalColor = max(finalColor, vec3<f32>(0.15, 0.12, 0.10));

    // Clamp to prevent over-saturation
    finalColor = clamp(finalColor, vec3<f32>(0.0), vec3<f32>(0.95));

    return vec4<f32>(finalColor, 1.0);
  }
`);

/**
 * Creates a TSL-based mystical sphere material compatible with WebGPU
 *
 * Features:
 * - Sacred geometry patterns (golden spirals, flower of life)
 * - Klimt-inspired golden color palette
 * - Hilma af Klint soft color transitions
 * - Self-illumination (no dark side)
 * - Organic flowing turbulence
 * - Animated golden shimmer
 *
 * @param config - Material configuration options
 * @returns Material instance and uniform references
 */
export function createTSLCloudMaterial(
  config: TSLCloudMaterialConfig = {}
): TSLCloudMaterialResult {
  // If preset is specified, use preset values as defaults
  const preset = config.preset ? PRESETS[config.preset] : null;

  const {
    colorPrimary = preset?.colorPrimary.clone() ?? DEFAULT_COLOR_PRIMARY.clone(),
    colorSecondary = preset?.colorSecondary.clone() ?? DEFAULT_COLOR_SECONDARY.clone(),
    colorHighlight = preset?.colorHighlight.clone() ?? DEFAULT_COLOR_HIGHLIGHT.clone(),
    flowSpeed = preset?.flowSpeed ?? 1.0,
    cloudDensity = preset?.cloudDensity ?? 1.0,
    glowIntensity = preset?.glowIntensity ?? 1.0,
    selectionGlowEnabled = false,
    baseGlowIntensity = 0.3,
    selectedGlowMultiplier = 3.0,
    connectedGlowMultiplier = 1.8,
    usePaletteColors = false,
  } = config;

  // Create base uniforms
  const uTime = uniform(0);
  const uFlowSpeed = uniform(flowSpeed);
  const uCloudDensity = uniform(cloudDensity);
  const uGlowIntensity = uniform(glowIntensity);
  const uColorPrimary = uniform(colorPrimary);
  const uColorSecondary = uniform(colorSecondary);
  const uColorHighlight = uniform(colorHighlight);

  // Selection glow uniforms (only when enabled)
  const uBaseGlow = selectionGlowEnabled ? uniform(baseGlowIntensity) : null;
  const uConnectedGlowMult = selectionGlowEnabled ? uniform(connectedGlowMultiplier) : null;
  const uSelectedGlowMult = selectionGlowEnabled ? uniform(selectedGlowMultiplier) : null;

  // Palette color uniforms (only when using palette)
  const uPaletteColor0 = usePaletteColors ? uniform(SCIFI_PALETTE[0].clone()) : null;
  const uPaletteColor1 = usePaletteColors ? uniform(SCIFI_PALETTE[1].clone()) : null;
  const uPaletteColor2 = usePaletteColors ? uniform(SCIFI_PALETTE[2].clone()) : null;
  const uPaletteColor3 = usePaletteColors ? uniform(SCIFI_PALETTE[3].clone()) : null;
  const uPaletteColor4 = usePaletteColors ? uniform(SCIFI_PALETTE[4].clone()) : null;

  // Instance attributes
  const selectionState = attribute('aSelectionState');
  const colorIndex = attribute('aColorIndex');
  const pulseIntensity = attribute('aPulseIntensity');

  // Build the sphere color using TSL Fn
  const sphereColorNode = Fn(() => {
    // Determine colors to use
    let effectivePrimary = vec3(uColorPrimary);
    let effectiveSecondary = vec3(uColorSecondary);

    // If using palette colors, select based on colorIndex
    if (usePaletteColors && uPaletteColor0 && uPaletteColor1 && uPaletteColor2 && uPaletteColor3 && uPaletteColor4) {
      // Select primary color from palette based on index
      // Using conditional mixing since TSL doesn't have array indexing
      const idx = colorIndex;
      const c0 = vec3(uPaletteColor0);
      const c1 = vec3(uPaletteColor1);
      const c2 = vec3(uPaletteColor2);
      const c3 = vec3(uPaletteColor3);
      const c4 = vec3(uPaletteColor4);

      // Select primary: idx < 0.5 -> c0, idx < 1.5 -> c1, etc.
      effectivePrimary = mix(c0, c1, idx.sub(0).clamp(0, 1));
      effectivePrimary = mix(effectivePrimary, c2, idx.sub(1).clamp(0, 1));
      effectivePrimary = mix(effectivePrimary, c3, idx.sub(2).clamp(0, 1));
      effectivePrimary = mix(effectivePrimary, c4, idx.sub(3).clamp(0, 1));

      // Secondary is a darker version of the primary
      effectiveSecondary = effectivePrimary.mul(float(0.6));
    }

    // Call mystical sphere shader
    const result = mysticalSphere({
      localPos: positionLocal,
      localNormal: normalLocal,
      time: uTime,
      flowSpeed: uFlowSpeed,
      densityMult: uCloudDensity,
      glowIntensity: uGlowIntensity,
      colorPrimary: effectivePrimary,
      colorSecondary: effectiveSecondary,
      colorHighlight: vec3(uColorHighlight),
    });

    // Extract base sphere color
    const baseSphereCol = vec3(result.x, result.y, result.z);

    // Add selection-based rim glow (if enabled)
    const finalSphereCol = (() => {
      if (!selectionGlowEnabled || !uBaseGlow || !uConnectedGlowMult || !uSelectedGlowMult) {
        return baseSphereCol;
      }

      // Calculate glow multiplier based on selection state
      // selectionState: 0 = none (1x), 0.5 = connected (connectedMult), 1 = selected (selectedMult)
      const glowMult = mix(
        float(1.0),
        mix(uConnectedGlowMult, uSelectedGlowMult, selectionState.mul(2).sub(1).clamp(0, 1)),
        selectionState.mul(2).clamp(0, 1)
      );

      // Fresnel for rim glow
      const viewDir = normalize(sub(cameraPosition, positionWorld));
      const fresnel = pow(sub(float(1), max(dot(viewDir, normalWorld), 0)), 2.5);

      // Effective glow intensity
      const effectiveGlow = mul(uBaseGlow, glowMult);

      // Add rim glow to the sphere color
      const rimGlow = mul(mul(fresnel, effectiveGlow), float(1.5));
      const rimColor = mix(effectivePrimary, vec3(uColorHighlight), float(0.5));
      const withRimGlow = add(baseSphereCol, mul(rimColor, rimGlow));

      // Add slight overall brightness boost when selected
      const brightBoost = float(1.0).add(selectionState.mul(float(0.15)));
      return mul(withRimGlow, brightBoost);
    })();

    // Add pulse glow (warm white when pulse is passing through)
    const viewDir = normalize(sub(cameraPosition, positionWorld));
    const fresnel = pow(sub(float(1), max(dot(viewDir, normalWorld), 0)), 2.0);
    const pulseGlowColor = vec3(1.0, 0.95, 0.85); // Warm white
    const pulseGlow = mul(
      pulseGlowColor,
      mul(pulseIntensity, mul(add(fresnel, float(0.4)), float(3.5)))
    );
    const withPulseGlow = add(finalSphereCol, pulseGlow);

    // Clamp to prevent over-saturation
    return withPulseGlow.clamp(vec3(float(0.05)), vec3(float(0.95)));
  })();

  // Create material
  const material = new MeshBasicNodeMaterial();
  material.colorNode = sphereColorNode;
  material.transparent = false;
  material.side = THREE.FrontSide;
  material.depthWrite = true;

  // Build uniforms object
  const uniforms: TSLCloudMaterialUniforms = {
    uTime: uTime as unknown as { value: number },
    uFlowSpeed: uFlowSpeed as unknown as { value: number },
    uCloudDensity: uCloudDensity as unknown as { value: number },
    uGlowIntensity: uGlowIntensity as unknown as { value: number },
    uColorPrimary: uColorPrimary as unknown as { value: THREE.Color },
    uColorSecondary: uColorSecondary as unknown as { value: THREE.Color },
    uColorHighlight: uColorHighlight as unknown as { value: THREE.Color },
    // Add selection glow uniforms if enabled
    ...(selectionGlowEnabled && uBaseGlow && {
      uBaseGlow: uBaseGlow as unknown as { value: number },
    }),
    ...(selectionGlowEnabled && uConnectedGlowMult && {
      uConnectedGlowMult: uConnectedGlowMult as unknown as { value: number },
    }),
    ...(selectionGlowEnabled && uSelectedGlowMult && {
      uSelectedGlowMult: uSelectedGlowMult as unknown as { value: number },
    }),
    // Add palette color uniforms if using palette
    ...(usePaletteColors && uPaletteColor0 && {
      uPaletteColor0: uPaletteColor0 as unknown as { value: THREE.Color },
    }),
    ...(usePaletteColors && uPaletteColor1 && {
      uPaletteColor1: uPaletteColor1 as unknown as { value: THREE.Color },
    }),
    ...(usePaletteColors && uPaletteColor2 && {
      uPaletteColor2: uPaletteColor2 as unknown as { value: THREE.Color },
    }),
    ...(usePaletteColors && uPaletteColor3 && {
      uPaletteColor3: uPaletteColor3 as unknown as { value: THREE.Color },
    }),
    ...(usePaletteColors && uPaletteColor4 && {
      uPaletteColor4: uPaletteColor4 as unknown as { value: THREE.Color },
    }),
  };

  return { material, uniforms };
}

/**
 * Updates the time uniform for animation
 * @param uniforms - Uniform references from createTSLCloudMaterial
 * @param time - Current time in seconds
 */
export function updateTSLCloudMaterialTime(
  uniforms: TSLCloudMaterialUniforms,
  time: number
): void {
  uniforms.uTime.value = time;
}

/**
 * Disposes of the TSL cloud material
 * @param material - Material to dispose
 */
export function disposeTSLCloudMaterial(material: THREE.Material): void {
  material.dispose();
}

/**
 * Creates a TSL cloud material with a specific preset
 * @param preset - Preset name ('lava', 'celestial', or 'sacred')
 * @param overrides - Optional config overrides
 * @returns Material instance and uniform references
 */
export function createTSLCloudMaterialWithPreset(
  preset: TSLCloudPreset,
  overrides: Omit<TSLCloudMaterialConfig, 'preset'> = {}
): TSLCloudMaterialResult {
  return createTSLCloudMaterial({ ...overrides, preset });
}

/**
 * Gets the available preset names
 */
export function getTSLCloudPresetNames(): TSLCloudPreset[] {
  return ['lava', 'celestial', 'sacred'];
}

/**
 * Gets a random preset name
 */
export function getRandomTSLCloudPreset(): TSLCloudPreset {
  const presets = getTSLCloudPresetNames();
  const preset = presets[Math.floor(Math.random() * presets.length)];
  // Safety: presets array is always non-empty (defined in getTSLCloudPresetNames)
  return preset ?? 'celestial';
}

/**
 * Export the presets for external access
 */
export const TSL_CLOUD_PRESETS = PRESETS;
