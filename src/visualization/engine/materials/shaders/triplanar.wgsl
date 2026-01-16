/**
 * Tri-Planar Texture Projection
 *
 * Projects textures from three orthogonal directions and blends them
 * based on surface normal. This eliminates texture stretching on
 * surfaces that aren't aligned with the UV mapping.
 */

// Tri-planar texture sampling with flow animation
fn triplanarSample(
  tex: texture_2d<f32>,
  samp: sampler,
  worldPos: vec3<f32>,
  normal: vec3<f32>,
  flow: vec3<f32>,
  scale: f32,
  blendSharpness: f32
) -> vec4<f32> {
  // UV coordinates for each projection plane
  let uvX = worldPos.yz * scale + flow.yz;
  let uvY = worldPos.xz * scale + flow.xz;
  let uvZ = worldPos.xy * scale + flow.xy;

  // Sample from all three projections
  let texX = textureSample(tex, samp, uvX);
  let texY = textureSample(tex, samp, uvY);
  let texZ = textureSample(tex, samp, uvZ);

  // Blend weights based on surface normal
  // Higher blendSharpness = sharper transitions between projections
  let blending = pow(abs(normal), vec3<f32>(blendSharpness));
  let blendSum = blending.x + blending.y + blending.z;
  let normalizedBlend = blending / blendSum;

  // Final blended color
  return texX * normalizedBlend.x + texY * normalizedBlend.y + texZ * normalizedBlend.z;
}

// Simplified tri-planar for single-channel (e.g., noise)
fn triplanarSampleFloat(
  tex: texture_2d<f32>,
  samp: sampler,
  worldPos: vec3<f32>,
  normal: vec3<f32>,
  scale: f32,
  blendSharpness: f32
) -> f32 {
  let uvX = worldPos.yz * scale;
  let uvY = worldPos.xz * scale;
  let uvZ = worldPos.xy * scale;

  let texX = textureSample(tex, samp, uvX).r;
  let texY = textureSample(tex, samp, uvY).r;
  let texZ = textureSample(tex, samp, uvZ).r;

  let blending = pow(abs(normal), vec3<f32>(blendSharpness));
  let blendSum = blending.x + blending.y + blending.z;
  let normalizedBlend = blending / blendSum;

  return texX * normalizedBlend.x + texY * normalizedBlend.y + texZ * normalizedBlend.z;
}

// Calculate blend weights without sampling (for custom compositing)
fn triplanarWeights(normal: vec3<f32>, blendSharpness: f32) -> vec3<f32> {
  let blending = pow(abs(normal), vec3<f32>(blendSharpness));
  let blendSum = blending.x + blending.y + blending.z;
  return blending / blendSum;
}

// Tri-planar normal mapping
fn triplanarNormal(
  normalMap: texture_2d<f32>,
  samp: sampler,
  worldPos: vec3<f32>,
  normal: vec3<f32>,
  tangent: vec3<f32>,
  bitangent: vec3<f32>,
  scale: f32,
  blendSharpness: f32
) -> vec3<f32> {
  let uvX = worldPos.yz * scale;
  let uvY = worldPos.xz * scale;
  let uvZ = worldPos.xy * scale;

  // Sample normal maps (convert from 0-1 to -1-1)
  let normX = textureSample(normalMap, samp, uvX).xyz * 2.0 - 1.0;
  let normY = textureSample(normalMap, samp, uvY).xyz * 2.0 - 1.0;
  let normZ = textureSample(normalMap, samp, uvZ).xyz * 2.0 - 1.0;

  // Swizzle normals to world space for each projection
  let worldNormX = vec3<f32>(0.0, normX.y, normX.x) * sign(normal.x);
  let worldNormY = vec3<f32>(normY.x, 0.0, normY.y) * sign(normal.y);
  let worldNormZ = vec3<f32>(normZ.x, normZ.y, 0.0) * sign(normal.z);

  // Blend
  let weights = triplanarWeights(normal, blendSharpness);
  let blendedNorm = worldNormX * weights.x + worldNormY * weights.y + worldNormZ * weights.z;

  return normalize(normal + blendedNorm);
}
