// Shader sources - loaded as raw strings by Vite
export const nodeVertexShader = `
uniform float uTime;
uniform float uBiographyWeight;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vBioWeight;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vBioWeight = uBiographyWeight;

  float pulse = 1.0 + sin(uTime * 2.0 + uBiographyWeight * 6.28) * 0.05 * uBiographyWeight;
  vec3 pos = position * pulse;

  vec4 worldPos = modelMatrix * vec4(pos, 1.0);
  vWorldPosition = worldPos.xyz;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const nodeFragmentShader = `
uniform float uTime;
uniform vec3 uColorPrimary;
uniform vec3 uColorSecondary;
uniform float uGlowIntensity;
uniform float uBiographyWeight;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vBioWeight;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);

  float noise = snoise(vWorldPosition * 0.1 + uTime * 0.2) * 0.5 + 0.5;
  float noise2 = snoise(vWorldPosition * 0.3 - uTime * 0.15) * 0.5 + 0.5;

  vec3 baseColor = mix(uColorPrimary, uColorSecondary, noise * vBioWeight);

  float innerGlow = smoothstep(0.0, 0.8, 1.0 - fresnel);
  float glowPulse = 1.0 + sin(uTime * 3.0 + vBioWeight * 10.0) * 0.15 * vBioWeight;

  float rimGlow = fresnel * (1.0 + vBioWeight * 2.0) * uGlowIntensity * glowPulse;

  float sss = pow(max(dot(viewDir, -vNormal), 0.0), 2.0) * 0.3 * (1.0 + vBioWeight);

  vec3 finalColor = baseColor * innerGlow;
  finalColor += baseColor * rimGlow * 1.5;
  finalColor += uColorSecondary * sss;

  float spots = smoothstep(0.6, 0.8, noise2) * vBioWeight;
  finalColor += vec3(1.0, 0.9, 0.8) * spots * 0.5;

  float alpha = 0.7 + vBioWeight * 0.3;

  gl_FragColor = vec4(finalColor, alpha);
}
`;

export const edgeVertexShader = `
attribute float aProgress;

varying float vProgress;
varying vec3 vWorldPosition;

void main() {
  vProgress = aProgress;

  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const edgeFragmentShader = `
uniform float uTime;
uniform vec3 uColorPrimary;
uniform vec3 uColorSecondary;
uniform float uEdgeStrength;
uniform float uIsLightTheme;

varying float vProgress;
varying vec3 vWorldPosition;

void main() {
  // Sacred gold and violet for Klimt-inspired threading
  vec3 sacredGold = vec3(0.83, 0.66, 0.29);
  vec3 ancientCopper = vec3(0.72, 0.45, 0.20);

  // For light theme, use lustrous gold leaf colors (bright, saturated)
  if (uIsLightTheme > 0.5) {
    sacredGold = vec3(0.79, 0.64, 0.15); // Lustrous gold leaf
    ancientCopper = vec3(0.70, 0.50, 0.12); // Rich burnished gold
  }

  // Flowing energy along the golden thread
  float flow = fract(vProgress * 3.0 - uTime * 0.5);
  float flowPulse = smoothstep(0.0, 0.3, flow) * smoothstep(1.0, 0.7, flow);

  // Alex Grey inspired energy nodes - "prayer beads" along the connection
  float nodeSpacing = 8.0;
  float nodePos = fract(vProgress * nodeSpacing - uTime * 0.4);
  float energyNode = smoothstep(0.4, 0.5, nodePos) * smoothstep(0.6, 0.5, nodePos);
  energyNode *= 2.0;

  // Byzantine pattern overlay (Klimt)
  float byzantine = sin(vProgress * 40.0) * sin(uTime * 2.0 + vProgress * 15.0);
  float byzantinePattern = smoothstep(0.3, 0.6, byzantine * 0.5 + 0.5) * 0.3;

  float endFade = smoothstep(0.0, 0.1, vProgress) * smoothstep(1.0, 0.9, vProgress);

  // Gold shimmer effect
  float shimmer = sin(uTime * 5.0 + vProgress * 30.0) * 0.15 + 0.85;

  // Blend primary color with sacred gold
  vec3 baseColor = mix(uColorPrimary, sacredGold, 0.6);
  vec3 color = mix(baseColor, uColorSecondary, vProgress * 0.3);

  float energy = flowPulse * 0.5 + 0.5;
  color *= energy * shimmer;

  // Add energy nodes as bright gold points
  color += sacredGold * energyNode;
  color += ancientCopper * byzantinePattern;

  float glow = 0.3 + flowPulse * 0.7 * uEdgeStrength + energyNode * 0.3;

  float alpha = endFade * glow * 0.7;

  // Light theme: Warm gold filigree like manuscript illumination borders
  if (uIsLightTheme > 0.5) {
    // Warm gold leaf - less yellow, more metallic/coppery
    vec3 warmGold = vec3(0.85, 0.65, 0.20);

    // Solid and opaque - like inlaid gold
    alpha = endFade * 0.9;

    // Use warm gold
    color = warmGold;

    // Very subtle shimmer
    float leafShimmer = sin(uTime * 0.15 + vProgress * 4.0) * 0.04 + 1.0;
    color *= leafShimmer;

    // Slight copper warmth at energy nodes
    color += vec3(0.06, 0.03, 0.0) * energyNode;
  } else {
    color = color * 1.5; // Brighter for dark theme
  }

  gl_FragColor = vec4(color, alpha);
}
`;

export const particleVertexShader = `
uniform float uTime;
uniform float uSize;

attribute float aPhase;
attribute float aSpeed;
attribute vec3 aColor;

varying vec3 vColor;
varying float vPhase;

void main() {
  vColor = aColor;
  vPhase = aPhase;

  vec3 pos = position;
  float t = uTime * aSpeed;

  pos.x += sin(t + aPhase) * 2.0;
  pos.y += cos(t * 0.7 + aPhase * 1.3) * 1.5;
  pos.z += sin(t * 0.5 + aPhase * 0.7) * 2.0;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

  float sizeAtten = 300.0 / -mvPosition.z;
  gl_PointSize = uSize * sizeAtten;

  gl_Position = projectionMatrix * mvPosition;
}
`;

export const particleFragmentShader = `
uniform float uTime;

varying vec3 vColor;
varying float vPhase;

void main() {
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);

  // Haeckel radiolarian hexagonal shape
  float angle = atan(center.y, center.x);
  float hexShape = cos(angle * 6.0) * 0.08 + 0.42;

  // Blend between circle and hexagon for organic feel
  float shapeMask = mix(0.5, hexShape, 0.6);

  if (dist > shapeMask) discard;

  // Inner structure - concentric rings like diatom shells
  float innerRings = sin(dist * 30.0 - uTime * 2.0) * 0.5 + 0.5;
  float ringDetail = smoothstep(0.3, 0.5, innerRings) * 0.3;

  float glow = 1.0 - smoothstep(0.0, shapeMask, dist);
  glow = pow(glow, 1.5);

  float pulse = sin(uTime * 3.0 + vPhase * 6.28) * 0.5 + 0.5;
  pulse = smoothstep(0.2, 0.8, pulse);

  float flash = pow(sin(uTime * 0.5 + vPhase * 12.56) * 0.5 + 0.5, 8.0);

  float intensity = glow * (0.3 + pulse * 0.5 + flash * 0.5);

  // Add gold dust shimmer (Klimt gold leaf)
  vec3 sacredGold = vec3(0.83, 0.66, 0.29);
  vec3 baseColor = mix(vColor, sacredGold, 0.3 + ringDetail);

  vec3 finalColor = baseColor * intensity * 2.0;
  finalColor += sacredGold * ringDetail * intensity;

  float alpha = intensity * 0.8;

  gl_FragColor = vec4(finalColor, alpha);
}
`;

// Instanced version of node vertex shader
export const instancedNodeVertexShader = `
uniform float uTime;

attribute float aBiographyWeight;
attribute float aNodeIndex;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vBioWeight;
varying float vNodeIndex;

void main() {
  vBioWeight = aBiographyWeight;
  vNodeIndex = aNodeIndex;

  // Transform normal by instance matrix
  mat3 normalMat = mat3(instanceMatrix);
  vNormal = normalize(normalMat * normal);

  // Apply pulse based on biography weight
  float pulse = 1.0 + sin(uTime * 2.0 + aBiographyWeight * 6.28) * 0.05 * aBiographyWeight;
  vec3 pos = position * pulse;

  // Apply instance transform
  vec4 worldPos = instanceMatrix * vec4(pos, 1.0);
  vWorldPosition = worldPos.xyz;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

// Instanced version of node fragment shader (same as regular but reads from varying)
export const instancedNodeFragmentShader = `
uniform float uTime;
uniform vec3 uColorPrimary;
uniform vec3 uColorSecondary;
uniform float uGlowIntensity;
uniform float uIsLightTheme;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vBioWeight;
varying float vNodeIndex;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

// Cel-shading function - Wind Waker / Okami inspired
float celShade(float value, float steps, float softness) {
  float quantized = floor(value * steps + 0.5) / steps;
  return mix(quantized, value, softness);
}

// Improved Hilma af Klint mandala with color symbolism
vec3 hilmaMandala(vec2 uv, float time, float weight) {
  float r = length(uv);
  float theta = atan(uv.y, uv.x);

  // Blue (feminine), Yellow (masculine), Green (synthesis) - Hilma's color theory
  vec3 feminine = vec3(0.15, 0.25, 0.55);  // Deep blue
  vec3 masculine = vec3(0.85, 0.75, 0.25); // Golden yellow
  vec3 synthesis = vec3(0.25, 0.55, 0.35); // Sage green

  // Concentric breathing circles
  float circles = sin(r * 20.0 - time * 0.6) * 0.5 + 0.5;
  circles = smoothstep(0.4, 0.6, circles);

  // 7-fold rotational symmetry (spiritual number)
  float petals = sin(theta * 7.0 + time * 0.3);
  petals = smoothstep(0.0, 0.8, petals);

  // Golden spiral (phi-based)
  float goldenAngle = 2.39996; // Golden angle in radians
  float spiral = sin(r * 15.0 - theta / goldenAngle - time * 0.4);
  spiral = smoothstep(0.5, 0.9, spiral);

  // Color blending based on radius and angle
  float colorMix = sin(theta * 3.0 + time * 0.2) * 0.5 + 0.5;
  vec3 innerColor = mix(feminine, masculine, colorMix);
  vec3 outerColor = mix(synthesis, feminine, 1.0 - colorMix);

  vec3 mandalaColor = mix(innerColor, outerColor, r);
  float mandalaIntensity = (circles * 0.4 + petals * 0.3 + spiral * 0.3) * weight;

  return mandalaColor * mandalaIntensity;
}

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);

  float noise = snoise(vWorldPosition * 0.1 + uTime * 0.2) * 0.5 + 0.5;
  float noise2 = snoise(vWorldPosition * 0.3 - uTime * 0.15) * 0.5 + 0.5;

  vec3 baseColor = mix(uColorPrimary, uColorSecondary, noise * vBioWeight);

  // Directional light for cel-shading
  vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
  float lightValue = max(dot(vNormal, lightDir), 0.0);

  // Apply cel-shading to lighting - 3 bands with soft anti-aliased edges
  float celLight = celShade(lightValue, 3.0, 0.15);

  float innerGlow = smoothstep(0.0, 0.8, 1.0 - fresnel);
  // Subtle cel-shading on inner glow
  innerGlow = mix(innerGlow, celShade(innerGlow, 2.0, 0.2), 0.4);

  float glowPulse = 1.0 + sin(uTime * 3.0 + vBioWeight * 10.0) * 0.15 * vBioWeight;

  float rimGlow = fresnel * (1.0 + vBioWeight * 2.0) * uGlowIntensity * glowPulse;

  float sss = pow(max(dot(viewDir, -vNormal), 0.0), 2.0) * 0.3 * (1.0 + vBioWeight);

  // Apply cel-shaded lighting to base color
  vec3 finalColor = baseColor * innerGlow * (0.6 + celLight * 0.4);
  finalColor += baseColor * rimGlow * 1.5;
  finalColor += uColorSecondary * sss;

  // Sacred geometry colors (Klimt gold, ethereal rose)
  vec3 sacredGold = vec3(0.83, 0.66, 0.29);
  vec3 etherealRose = vec3(0.79, 0.55, 0.55);
  vec3 mysticTeal = vec3(0.29, 0.49, 0.44);

  // Enhanced Hilma af Klint mandala overlay
  vec3 mandalaOverlay = hilmaMandala(vNormal.xy, uTime, vBioWeight * 0.35);
  finalColor += mandalaOverlay;

  // Hilma af Klint inspired concentric rings - breathing mandala pattern
  float ringDist = length(vNormal.xy);
  float rings = sin(ringDist * 15.0 - uTime * 0.8) * 0.5 + 0.5;
  float ringPattern = smoothstep(0.3, 0.6, rings) * vBioWeight * 0.3;

  // Sacred geometry spiral overlay (golden ratio inspired)
  float angle = atan(vNormal.y, vNormal.x);
  float spiral = sin(angle * 6.0 + ringDist * 25.0 - uTime * 0.5);
  float spiralPattern = smoothstep(0.6, 0.8, spiral) * vBioWeight * 0.25;

  // Haeckel radiolarian hexagonal structure
  float hexAngle = atan(vNormal.y, vNormal.x);
  float hexPattern = abs(cos(hexAngle * 3.0)) * smoothstep(0.2, 0.5, ringDist);
  hexPattern *= smoothstep(0.7, 0.4, ringDist) * vBioWeight * 0.15;

  // Apply mandala patterns with sacred colors
  finalColor += sacredGold * ringPattern;
  finalColor += etherealRose * spiralPattern;
  finalColor += mysticTeal * hexPattern;

  float spots = smoothstep(0.6, 0.8, noise2) * vBioWeight;
  finalColor += sacredGold * spots * 0.4;

  float alpha = 0.7 + vBioWeight * 0.3;

  // Light theme - LUMINARIA CAELESTIA: Medieval Celestial Spheres
  // Each soul is a heavenly body in the crystalline spheres of the cosmos
  if (uIsLightTheme > 0.5) {
    // The Seven Planetary Colors - as Dante beheld them in Paradiso
    vec3 solarGold = vec3(0.85, 0.68, 0.22);      // Sol - the central fire
    vec3 lunarSilver = vec3(0.75, 0.78, 0.82);    // Luna - pale reflection
    vec3 venusGreen = vec3(0.32, 0.52, 0.42);     // Venus - verdigris of love
    vec3 marsRed = vec3(0.72, 0.28, 0.22);        // Mars - iron oxide courage
    vec3 jupiterBlue = vec3(0.22, 0.35, 0.58);    // Jupiter - lapis wisdom
    vec3 saturnOchre = vec3(0.58, 0.48, 0.35);    // Saturn - aged earth
    vec3 mercurySilver = vec3(0.68, 0.65, 0.72);  // Mercury - quicksilver mind
    vec3 goldLeaf = vec3(0.82, 0.62, 0.18);       // The crystalline sphere rim

    vec2 uv = vNormal.xy;
    float r = length(uv);

    // Determine celestial body type by node index (cycling through spheres)
    float sphereIndex = mod(vNodeIndex, 7.0);

    // Select planetary color based on sphere
    vec3 bodyColor = solarGold;
    if (sphereIndex < 1.0) bodyColor = solarGold;
    else if (sphereIndex < 2.0) bodyColor = lunarSilver;
    else if (sphereIndex < 3.0) bodyColor = venusGreen;
    else if (sphereIndex < 4.0) bodyColor = marsRed;
    else if (sphereIndex < 5.0) bodyColor = jupiterBlue;
    else if (sphereIndex < 6.0) bodyColor = saturnOchre;
    else bodyColor = mercurySilver;

    // Biography weight determines celestial magnitude (radiance)
    // Low weight = distant star (muted), High weight = blazing sun (radiant)
    float magnitude = 0.6 + vBioWeight * 0.5;

    // === THE THREE ELEMENTS OF A HEAVENLY BODY ===

    // 1. THE BODY: Solid fill with subtle depth
    float bodyMask = smoothstep(0.92, 0.88, r);
    vec3 solidBody = bodyColor * magnitude;

    // Subtle inner shading for depth (not bands, just gentle gradient)
    float innerShade = 1.0 - r * 0.15;
    solidBody *= innerShade;

    // 2. THE CRYSTALLINE SPHERE: Thin gold rim
    float rimOuter = smoothstep(0.92, 0.90, r);
    float rimInner = smoothstep(0.86, 0.88, r);
    float goldRim = rimOuter * rimInner;

    // 3. THE DIVINE RADIANCE: Soft outer glow based on biography weight
    float glowRadius = 0.92 + vBioWeight * 0.08;
    float outerGlow = smoothstep(glowRadius + 0.15, glowRadius, r);
    float glowIntensity = vBioWeight * 0.4;

    // === ASSEMBLE THE CELESTIAL BODY ===

    // Start with the radiant glow (background)
    finalColor = goldLeaf * outerGlow * glowIntensity;

    // Add the solid planetary body
    finalColor = mix(finalColor, solidBody, bodyMask);

    // Add the thin gold rim (crystalline sphere boundary)
    finalColor = mix(finalColor, goldLeaf * 1.2, goldRim * 0.9);

    // For high biography weight, add solar corona effect
    if (vBioWeight > 0.7) {
      float corona = smoothstep(0.95, 0.88, r) * smoothstep(0.80, 0.85, r);
      finalColor += solarGold * corona * (vBioWeight - 0.7) * 1.5;
    }

    // Alpha: solid body, soft edge
    alpha = smoothstep(1.0, 0.85, r);
    alpha = max(alpha, outerGlow * glowIntensity * 0.5);

    finalColor = clamp(finalColor, vec3(0.0), vec3(1.0));
  }

  gl_FragColor = vec4(finalColor, alpha);
}
`;

// Firefly vertex shader - for events orbiting around person orbs
export const fireflyVertexShader = `
uniform float uTime;
uniform float uSize;

attribute float aOrbitRadius;
attribute float aOrbitSpeed;
attribute float aOrbitPhase;
attribute float aOrbitTilt;
attribute vec3 aNodePosition;
attribute vec3 aColor;
attribute float aEventIndex;

varying vec3 vColor;
varying float vPhase;

void main() {
  vColor = aColor;
  vPhase = aOrbitPhase;

  // Calculate orbital position around the node
  float angle = uTime * aOrbitSpeed + aOrbitPhase;

  // Create tilted orbit using rotation
  float cosT = cos(aOrbitTilt);
  float sinT = sin(aOrbitTilt);

  float x = cos(angle) * aOrbitRadius;
  float y = sin(angle) * aOrbitRadius * cosT;
  float z = sin(angle) * aOrbitRadius * sinT;

  // Add some wobble
  float wobble = sin(uTime * 2.0 + aOrbitPhase * 3.0) * 0.3;
  y += wobble;

  vec3 pos = aNodePosition + vec3(x, y, z);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

  // Size attenuation
  float sizeAtten = 200.0 / -mvPosition.z;
  gl_PointSize = uSize * sizeAtten * (0.8 + sin(uTime * 4.0 + aOrbitPhase * 6.28) * 0.2);

  gl_Position = projectionMatrix * mvPosition;
}
`;

export const fireflyFragmentShader = `
uniform float uTime;
uniform float uIsLightTheme;

varying vec3 vColor;
varying float vPhase;

void main() {
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);

  // === LIGHT THEME: Illuminated manuscript bezants ===
  if (uIsLightTheme > 0.5) {
    // Solid circle - bezant shape
    if (dist > 0.45) discard;

    // Manuscript pigment colors - gold bezants, vermillion berries, lapis dots
    vec3 goldBezant = vec3(0.82, 0.62, 0.18);
    vec3 vermillionBerry = vec3(0.75, 0.22, 0.15);
    vec3 lapisBlue = vec3(0.18, 0.28, 0.52);

    // Select color based on phase (creates variety like manuscript decoration)
    vec3 bezantColor = goldBezant;
    float colorSelect = mod(vPhase * 3.0, 3.0);
    if (colorSelect < 1.0) bezantColor = goldBezant;
    else if (colorSelect < 2.0) bezantColor = vermillionBerry;
    else bezantColor = lapisBlue;

    // Solid fill with subtle shading for painted look
    float shade = 1.0 - dist * 0.3;
    vec3 finalColor = bezantColor * shade;

    // Thin dark outline like painted bezants
    float outline = smoothstep(0.40, 0.45, dist);
    finalColor = mix(finalColor, bezantColor * 0.4, outline);

    // Tiny gold highlight for metallic effect (only on gold bezants)
    if (colorSelect < 1.0) {
      float highlight = smoothstep(0.25, 0.15, dist) * smoothstep(0.0, 0.1, dist);
      finalColor += vec3(0.2, 0.15, 0.05) * highlight;
    }

    gl_FragColor = vec4(finalColor, 1.0);
    return;
  }

  // === DARK THEME: Sacred flame/star effect ===
  // Sacred gold for mystic glow
  vec3 sacredGold = vec3(0.83, 0.66, 0.29);

  // Star/mandala shape with 6 points
  float angle = atan(center.y, center.x);
  float starShape = cos(angle * 6.0) * 0.1 + 0.4;

  // Blend between circle and star shape
  float shapeMask = mix(0.5, starShape, 0.4);

  if (dist > shapeMask) discard;

  // Soft glow with bright center
  float glow = 1.0 - smoothstep(0.0, shapeMask, dist);
  glow = pow(glow, 2.0);

  // Inner mandala rings
  float innerRing = sin(dist * 25.0 - uTime * 3.0) * 0.5 + 0.5;
  float ringGlow = smoothstep(0.4, 0.6, innerRing) * 0.4;

  // Flickering effect like sacred flame
  float flicker = sin(uTime * 8.0 + vPhase * 12.56) * 0.5 + 0.5;
  flicker = smoothstep(0.3, 0.7, flicker);

  // Occasional bright flash - like divine spark
  float flash = pow(sin(uTime * 2.0 + vPhase * 6.28) * 0.5 + 0.5, 6.0);

  float intensity = glow * (0.4 + flicker * 0.4 + flash * 0.4);

  // Blend event color with sacred gold for golden trail effect
  vec3 baseColor = mix(vColor, sacredGold, 0.4 + ringGlow);
  vec3 finalColor = baseColor * intensity * 2.5;
  finalColor += sacredGold * ringGlow * intensity;

  float alpha = intensity * 0.9;

  gl_FragColor = vec4(finalColor, alpha);
}
`;

// Golden edge shader for shared events - connects fireflies between people
export const sharedEventEdgeVertexShader = `
attribute float aProgress;

varying float vProgress;
varying vec3 vWorldPosition;

void main() {
  vProgress = aProgress;

  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const sharedEventEdgeFragmentShader = `
uniform float uTime;
uniform vec3 uColorGold;

varying float vProgress;
varying vec3 vWorldPosition;

void main() {
  // Flowing golden energy
  float flow = fract(vProgress * 2.0 - uTime * 0.8);
  float flowPulse = smoothstep(0.0, 0.4, flow) * smoothstep(1.0, 0.6, flow);

  // Fade at ends
  float endFade = smoothstep(0.0, 0.15, vProgress) * smoothstep(1.0, 0.85, vProgress);

  // Golden shimmer
  float shimmer = sin(uTime * 6.0 + vProgress * 20.0) * 0.3 + 0.7;

  float energy = flowPulse * shimmer;

  vec3 color = uColorGold * (0.6 + energy * 0.8);

  float alpha = endFade * (0.3 + flowPulse * 0.5);

  gl_FragColor = vec4(color * 1.8, alpha);
}
`;
