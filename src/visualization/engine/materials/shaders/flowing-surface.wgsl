/**
 * Flowing Surface Material
 *
 * Animated surface material using tri-planar texturing with flow
 * animation and turbulence noise. Creates organic, lava-like surfaces.
 */

// Material uniform structure
struct FlowingMaterialUniforms {
  baseColor: vec3<f32>,
  _pad0: f32,
  emissive: vec3<f32>,
  emissiveStrength: f32,
  flowSpeed: f32,
  flowScale: f32,
  turbulence: f32,
  time: f32,
  triplanarBlend: f32,
  metallic: f32,
  roughness: f32,
  _pad1: f32,
}

// Calculate flow offset based on time
fn calculateFlowOffset(time: f32, flowSpeed: f32) -> vec3<f32> {
  return vec3<f32>(
    sin(time * flowSpeed * 0.3) * 0.2,
    time * flowSpeed * 0.1,
    cos(time * flowSpeed * 0.2) * 0.15
  );
}

// Simple 3D hash function
fn hash3(p: vec3<f32>) -> f32 {
  let h = dot(p, vec3<f32>(127.1, 311.7, 74.7));
  return fract(sin(h) * 43758.5453);
}

// 3D value noise
fn noise3(p: vec3<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(
      mix(hash3(i), hash3(i + vec3<f32>(1.0, 0.0, 0.0)), u.x),
      mix(hash3(i + vec3<f32>(0.0, 1.0, 0.0)), hash3(i + vec3<f32>(1.0, 1.0, 0.0)), u.x),
      u.y
    ),
    mix(
      mix(hash3(i + vec3<f32>(0.0, 0.0, 1.0)), hash3(i + vec3<f32>(1.0, 0.0, 1.0)), u.x),
      mix(hash3(i + vec3<f32>(0.0, 1.0, 1.0)), hash3(i + vec3<f32>(1.0, 1.0, 1.0)), u.x),
      u.y
    ),
    u.z
  );
}

// FBM (Fractal Brownian Motion) noise for turbulence
fn fbmNoise(p: vec3<f32>, octaves: i32) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  var pos = p;

  for (var i = 0; i < octaves; i++) {
    value += amplitude * noise3(pos * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value;
}

// FBM with lacunarity and persistence control
fn fbmNoiseAdvanced(
  p: vec3<f32>,
  octaves: i32,
  lacunarity: f32,
  persistence: f32
) -> f32 {
  var value = 0.0;
  var amplitude = 1.0;
  var frequency = 1.0;
  var maxValue = 0.0;
  var pos = p;

  for (var i = 0; i < octaves; i++) {
    value += amplitude * noise3(pos * frequency);
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return value / maxValue;
}

// Tri-planar sample (duplicated for standalone use)
fn triplanarSampleFlowing(
  tex: texture_2d<f32>,
  samp: sampler,
  worldPos: vec3<f32>,
  normal: vec3<f32>,
  flow: vec3<f32>,
  scale: f32,
  blendSharpness: f32
) -> vec4<f32> {
  let uvX = worldPos.yz * scale + flow.yz;
  let uvY = worldPos.xz * scale + flow.xz;
  let uvZ = worldPos.xy * scale + flow.xy;

  let texX = textureSample(tex, samp, uvX);
  let texY = textureSample(tex, samp, uvY);
  let texZ = textureSample(tex, samp, uvZ);

  let blending = pow(abs(normal), vec3<f32>(blendSharpness));
  let blendSum = blending.x + blending.y + blending.z;
  let normalizedBlend = blending / blendSum;

  return texX * normalizedBlend.x + texY * normalizedBlend.y + texZ * normalizedBlend.z;
}

// Main flowing material color function
fn flowingMaterialColor(
  worldPos: vec3<f32>,
  normal: vec3<f32>,
  time: f32,
  baseTexture: texture_2d<f32>,
  baseSampler: sampler,
  uniforms: FlowingMaterialUniforms
) -> vec4<f32> {
  // Calculate flow offset
  let flowOffset = calculateFlowOffset(time, uniforms.flowSpeed);

  // Tri-planar texture sampling with flow
  let surfaceColor = triplanarSampleFlowing(
    baseTexture, baseSampler,
    worldPos, normal, flowOffset,
    uniforms.flowScale,
    uniforms.triplanarBlend
  );

  // Add turbulence noise
  let noise = fbmNoise(worldPos * uniforms.turbulence + flowOffset, 4);
  let finalColor = mix(surfaceColor.rgb, uniforms.baseColor, noise * 0.3);

  // Self-illumination/emissive with noise modulation
  let emissive = uniforms.emissive * uniforms.emissiveStrength * (0.5 + noise * 0.5);

  return vec4<f32>(finalColor + emissive, 1.0);
}

// Simplified version without texture (procedural only)
fn flowingMaterialColorProcedural(
  worldPos: vec3<f32>,
  normal: vec3<f32>,
  time: f32,
  uniforms: FlowingMaterialUniforms
) -> vec4<f32> {
  let flowOffset = calculateFlowOffset(time, uniforms.flowSpeed);

  // Multi-octave procedural pattern
  let noise1 = fbmNoise(worldPos * uniforms.turbulence + flowOffset, 4);
  let noise2 = fbmNoise(worldPos * uniforms.turbulence * 2.0 - flowOffset * 1.5, 3);

  // Combine noises for organic pattern
  let pattern = noise1 * 0.6 + noise2 * 0.4;

  // Color gradient based on pattern
  let finalColor = mix(uniforms.baseColor * 0.5, uniforms.baseColor, pattern);

  // Emissive with pattern modulation
  let emissive = uniforms.emissive * uniforms.emissiveStrength * (0.3 + pattern * 0.7);

  return vec4<f32>(finalColor + emissive, 1.0);
}

// Get material properties for PBR
struct FlowingMaterialOutput {
  albedo: vec3<f32>,
  emissive: vec3<f32>,
  metallic: f32,
  roughness: f32,
  ao: f32,
}

fn getFlowingMaterialProperties(
  worldPos: vec3<f32>,
  normal: vec3<f32>,
  time: f32,
  baseTexture: texture_2d<f32>,
  baseSampler: sampler,
  uniforms: FlowingMaterialUniforms
) -> FlowingMaterialOutput {
  let flowOffset = calculateFlowOffset(time, uniforms.flowSpeed);

  let surfaceColor = triplanarSampleFlowing(
    baseTexture, baseSampler,
    worldPos, normal, flowOffset,
    uniforms.flowScale,
    uniforms.triplanarBlend
  );

  let noise = fbmNoise(worldPos * uniforms.turbulence + flowOffset, 4);

  var output: FlowingMaterialOutput;
  output.albedo = mix(surfaceColor.rgb, uniforms.baseColor, noise * 0.3);
  output.emissive = uniforms.emissive * uniforms.emissiveStrength * (0.5 + noise * 0.5);
  output.metallic = uniforms.metallic;
  output.roughness = uniforms.roughness * (0.8 + noise * 0.4); // Vary roughness with noise
  output.ao = 1.0; // No AO for flowing surfaces

  return output;
}
