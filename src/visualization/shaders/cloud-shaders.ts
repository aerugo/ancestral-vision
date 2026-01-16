/**
 * GLSL Shaders for Flowing Gas Cloud Material
 *
 * Adapted from "Protean Clouds" by nimitz (twitter: @stormoid)
 * https://www.shadertoy.com/view/3l23Rh
 * License: Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported
 *
 * Renders illuminated flowing cloud textures on spherical nodes,
 * creating mystic gas giant planet effects.
 */

/**
 * Vertex shader for instanced cloud nodes
 *
 * Handles:
 * - Instance matrix transforms
 * - Biography weight for visual variation
 * - UV and normal data for fragment shader
 */
export const cloudNodeVertexShader = /* glsl */ `
uniform float uTime;

attribute float aBiographyWeight;
attribute float aNodeIndex;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vLocalPosition;
varying vec2 vUv;
varying float vBioWeight;
varying float vNodeIndex;

void main() {
  vBioWeight = aBiographyWeight;
  vNodeIndex = aNodeIndex;
  vUv = uv;
  vLocalPosition = position;

  // Transform normal by instance matrix
  mat3 normalMat = mat3(instanceMatrix);
  vNormal = normalize(normalMat * normal);

  // Apply subtle breathing animation based on biography weight
  float breathe = 1.0 + sin(uTime * 1.5 + aBiographyWeight * 6.28) * 0.02 * aBiographyWeight;
  vec3 pos = position * breathe;

  // Apply instance transform
  vec4 worldPos = instanceMatrix * vec4(pos, 1.0);
  vWorldPosition = worldPos.xyz;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

/**
 * Fragment shader for flowing gas cloud effect
 *
 * Implements:
 * - Volumetric cloud rendering adapted for sphere surface
 * - Deformed periodic grid noise (efficient evaluation)
 * - Multi-octave turbulence with dynamic displacement
 * - Illumination with subsurface scattering simulation
 * - Fresnel rim glow for atmospheric depth
 * - Sacred color palette integration
 */
export const cloudNodeFragmentShader = /* glsl */ `
uniform float uTime;
uniform vec3 uColorPrimary;
uniform vec3 uColorSecondary;
uniform vec3 uColorTertiary;
uniform float uGlowIntensity;
uniform float uCloudDensity;
uniform float uCloudScale;
uniform float uFlowSpeed;
uniform float uTurbulence;
uniform float uLightIntensity;
uniform float uIsLightTheme;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vLocalPosition;
varying vec2 vUv;
varying float vBioWeight;
varying float vNodeIndex;

// ============ UTILITY FUNCTIONS ============

mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, s, -s, c);
}

// Rotation matrix for turbulence - creates swirling effect
const mat3 m3 = mat3(
  0.33338, 0.56034, -0.71817,
  -0.87887, 0.32651, -0.15323,
  0.15162, 0.69596, 0.61339
) * 1.93;

float mag2(vec2 p) {
  return dot(p, p);
}

float linstep(float mn, float mx, float x) {
  return clamp((x - mn) / (mx - mn), 0.0, 1.0);
}

// ============ DISPLACEMENT FUNCTIONS ============

// Creates flowing displacement path through the cloud
vec2 disp(float t) {
  return vec2(sin(t * 0.22) * 1.0, cos(t * 0.175) * 1.0) * 2.0;
}

// ============ CLOUD DENSITY FUNCTION ============

// Parameters modulated by biography weight and node variation
float prm1 = 0.0;
vec2 bsMo = vec2(0.0);

// Main cloud density evaluation using deformed periodic grid
// Returns: x = density, y = distance from center (for color mapping)
vec2 cloudMap(vec3 p, float time, float bioWeight, float nodeIdx) {
  vec3 p2 = p;

  // Flow displacement - creates the tunnel-like flow
  p2.xy -= disp(p.z).xy;

  // Rotational turbulence - core swirling motion
  float rotStrength = 0.1 + prm1 * 0.05;
  p.xy *= rot(sin(p.z + time) * rotStrength + time * 0.09);

  float cl = mag2(p2.xy);
  float d = 0.0;
  p *= 0.61;
  float z = 1.0;
  float trk = 1.0;
  float dspAmp = 0.1 + prm1 * 0.2;

  // Multi-octave turbulence - creates layered cloud detail
  for (int i = 0; i < 5; i++) {
    // Displacement with varying frequency
    p += sin(p.zxy * 0.75 * trk + time * trk * 0.8) * dspAmp;
    // Accumulate density using cross-product of sinusoids
    d -= abs(dot(cos(p), sin(p.yzx)) * z);
    z *= 0.57;
    trk *= 1.4;
    p = p * m3; // Apply rotation matrix for turbulence
  }

  // Final density calculation with parameter modulation
  d = abs(d + prm1 * 3.0) + prm1 * 0.3 - 2.5 + bsMo.y;
  return vec2(d + cl * 0.2 + 0.25, cl);
}

// ============ VOLUMETRIC CLOUD RENDERING ============

// Renders the cloud volume with illumination
vec4 renderCloud(vec3 ro, vec3 rd, float time, float bioWeight, float nodeIdx) {
  vec4 rez = vec4(0.0);

  // Light position follows flow
  float ldst = 8.0;
  vec3 lpos = vec3(disp(time + ldst) * 0.5, time + ldst);

  float t = 1.5;
  float fogT = 0.0;

  // Raymarching with adaptive step size
  for (int i = 0; i < 80; i++) { // Reduced iterations for performance
    if (rez.a > 0.99) break;

    vec3 pos = ro + t * rd;
    vec2 mpv = cloudMap(pos, time, bioWeight, nodeIdx);
    float den = clamp(mpv.x - 0.3, 0.0, 1.0) * 1.12;
    float dn = clamp(mpv.x + 2.0, 0.0, 3.0);

    vec4 col = vec4(0.0);
    if (mpv.x > 0.6) {
      // Base color from position - creates color variation through volume
      col = vec4(
        sin(vec3(5.0, 0.4, 0.2) + mpv.y * 0.1 + sin(pos.z * 0.4) * 0.5 + 1.8) * 0.5 + 0.5,
        0.08
      );
      col *= den * den * den;
      col.rgb *= linstep(4.0, -2.5, mpv.x) * 2.3;

      // Lighting with gradient computation
      float dif = clamp((den - cloudMap(pos + 0.8, time, bioWeight, nodeIdx).x) / 9.0, 0.001, 1.0);
      dif += clamp((den - cloudMap(pos + 0.35, time, bioWeight, nodeIdx).x) / 2.5, 0.001, 1.0);
      col.xyz *= den * (vec3(0.005, 0.045, 0.075) + 1.5 * vec3(0.033, 0.07, 0.03) * dif);
    }

    // Fog integration - creates depth
    float fogC = exp(t * 0.2 - 2.2);
    col.rgba += vec4(0.06, 0.11, 0.11, 0.1) * clamp(fogC - fogT, 0.0, 1.0);
    fogT = fogC;

    // Accumulate color with alpha blending
    rez = rez + col * (1.0 - rez.a);

    // Adaptive step size - faster in sparse regions
    t += clamp(0.5 - dn * dn * 0.05, 0.09, 0.3);
  }

  return clamp(rez, 0.0, 1.0);
}

// ============ COLOR UTILITIES ============

float getsat(vec3 c) {
  float mi = min(min(c.x, c.y), c.z);
  float ma = max(max(c.x, c.y), c.z);
  return (ma - mi) / (ma + 1e-7);
}

// Saturation-preserving interpolation
vec3 iLerp(vec3 a, vec3 b, float x) {
  vec3 ic = mix(a, b, x) + vec3(1e-6, 0.0, 0.0);
  float sd = abs(getsat(ic) - mix(getsat(a), getsat(b), x));
  vec3 dir = normalize(vec3(2.0 * ic.x - ic.y - ic.z, 2.0 * ic.y - ic.x - ic.z, 2.0 * ic.z - ic.y - ic.x));
  float lgt = dot(vec3(1.0), ic);
  float ff = dot(dir, normalize(ic));
  ic += 1.5 * dir * sd * ff * lgt;
  return clamp(ic, 0.0, 1.0);
}

// ============ MAIN SHADER ============

void main() {
  // View direction for fresnel and raymarching
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);

  // Time modulation for animation
  float time = uTime * uFlowSpeed;

  // Modulate parameters based on biography weight
  prm1 = smoothstep(-0.4, 0.4, sin(time * 0.3)) * (0.5 + vBioWeight * 0.5);
  bsMo = vec2(0.0, vBioWeight * 0.3);

  // Setup ray origin and direction for sphere surface
  // Map local position to cloud space
  vec3 localNorm = normalize(vLocalPosition);

  // Create spherical UV coordinates
  float phi = atan(localNorm.y, localNorm.x);
  float theta = acos(localNorm.z);

  // Ray origin from sphere surface, looking inward
  vec3 ro = vec3(
    phi * 2.0 + time * 0.3,
    theta * 2.0,
    time * 0.5 + vNodeIndex * 0.1
  );

  // Ray direction influenced by view angle
  vec3 rd = normalize(vec3(
    localNorm.x + sin(time * 0.2) * 0.3,
    localNorm.y + cos(time * 0.25) * 0.3,
    -1.0 + vBioWeight * 0.5
  ));

  // Apply cloud scale
  ro *= uCloudScale;

  // Render volumetric cloud
  vec4 cloudResult = renderCloud(ro, rd, time, vBioWeight, vNodeIndex);
  vec3 cloudColor = cloudResult.rgb;

  // Apply color palette based on cloud result
  vec3 baseCloud = iLerp(cloudColor.bgr, cloudColor.rgb, clamp(1.0 - prm1, 0.05, 1.0));

  // Apply sacred color tinting
  vec3 tintedCloud = mix(baseCloud, uColorPrimary, 0.3);
  tintedCloud = mix(tintedCloud, uColorSecondary, cloudResult.a * 0.4 * vBioWeight);
  tintedCloud = mix(tintedCloud, uColorTertiary, fresnel * 0.3);

  // Gamma correction for natural look
  vec3 col = pow(tintedCloud, vec3(0.55, 0.65, 0.6)) * vec3(1.0, 0.97, 0.9);

  // Subsurface scattering simulation
  float sss = pow(max(dot(viewDir, -vNormal), 0.0), 2.0) * 0.4 * (1.0 + vBioWeight);
  col += uColorSecondary * sss;

  // Rim glow for atmosphere effect
  float rimGlow = fresnel * uGlowIntensity * (1.0 + vBioWeight * 2.0);
  float glowPulse = 1.0 + sin(uTime * 3.0 + vBioWeight * 10.0) * 0.15 * vBioWeight;
  col += uColorTertiary * rimGlow * glowPulse * 0.6;

  // Inner glow for luminosity
  float innerGlow = smoothstep(0.0, 0.8, 1.0 - fresnel);
  col *= (innerGlow * 0.5 + 0.5);

  // Apply light intensity
  col *= uLightIntensity;

  // Light theme adjustments
  if (uIsLightTheme > 0.5) {
    // Celestial sphere adaptation for light theme
    vec3 solarGold = vec3(0.85, 0.68, 0.22);
    vec3 goldLeaf = vec3(0.82, 0.62, 0.18);

    // Determine celestial body type by node index
    float sphereIndex = mod(vNodeIndex, 7.0);
    vec3 bodyColor = solarGold;
    if (sphereIndex < 1.0) bodyColor = vec3(0.85, 0.68, 0.22); // Solar gold
    else if (sphereIndex < 2.0) bodyColor = vec3(0.75, 0.78, 0.82); // Lunar silver
    else if (sphereIndex < 3.0) bodyColor = vec3(0.32, 0.52, 0.42); // Venus green
    else if (sphereIndex < 4.0) bodyColor = vec3(0.72, 0.28, 0.22); // Mars red
    else if (sphereIndex < 5.0) bodyColor = vec3(0.22, 0.35, 0.58); // Jupiter blue
    else if (sphereIndex < 6.0) bodyColor = vec3(0.58, 0.48, 0.35); // Saturn ochre
    else bodyColor = vec3(0.68, 0.65, 0.72); // Mercury silver

    // Blend cloud effect with celestial body color
    col = mix(col, bodyColor * (0.6 + vBioWeight * 0.5), 0.4);

    // Add golden rim
    float r = length(vNormal.xy);
    float rimOuter = smoothstep(0.92, 0.90, r);
    float rimInner = smoothstep(0.86, 0.88, r);
    float goldRim = rimOuter * rimInner;
    col = mix(col, goldLeaf * 1.2, goldRim * 0.9);
  }

  // Vignette effect on sphere
  float r = length(vNormal.xy);
  float vignette = pow(16.0 * vUv.x * vUv.y * (1.0 - vUv.x) * (1.0 - vUv.y), 0.12) * 0.7 + 0.3;
  col *= mix(vignette, 1.0, 0.5);

  // Alpha with soft edge falloff
  float alpha = 0.85 + vBioWeight * 0.15;
  alpha *= smoothstep(1.0, 0.7, r);
  alpha = max(alpha, cloudResult.a * 0.5);

  // Final color clamping
  col = clamp(col, vec3(0.0), vec3(1.0));

  gl_FragColor = vec4(col, alpha);
}
`;
