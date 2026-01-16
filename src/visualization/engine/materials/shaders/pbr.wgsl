/**
 * PBR (Physically Based Rendering) Utilities
 *
 * Lighting functions for realistic surface rendering including
 * Lambertian diffuse, GGX specular, and Fresnel effects.
 */

const PI: f32 = 3.14159265359;

// ============================================================================
// Fresnel
// ============================================================================

// Schlick's Fresnel approximation
fn fresnelSchlick(cosTheta: f32, F0: vec3<f32>) -> vec3<f32> {
  return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

// Fresnel with roughness (for IBL)
fn fresnelSchlickRoughness(cosTheta: f32, F0: vec3<f32>, roughness: f32) -> vec3<f32> {
  return F0 + (max(vec3<f32>(1.0 - roughness), F0) - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

// ============================================================================
// Distribution functions
// ============================================================================

// GGX/Trowbridge-Reitz normal distribution function
fn distributionGGX(N: vec3<f32>, H: vec3<f32>, roughness: f32) -> f32 {
  let a = roughness * roughness;
  let a2 = a * a;
  let NdotH = max(dot(N, H), 0.0);
  let NdotH2 = NdotH * NdotH;

  let nom = a2;
  var denom = NdotH2 * (a2 - 1.0) + 1.0;
  denom = PI * denom * denom;

  return nom / denom;
}

// Smith's geometry function (single direction)
fn geometrySchlickGGX(NdotV: f32, roughness: f32) -> f32 {
  let r = roughness + 1.0;
  let k = (r * r) / 8.0;

  let nom = NdotV;
  let denom = NdotV * (1.0 - k) + k;

  return nom / denom;
}

// Smith's geometry function (combined view and light)
fn geometrySmith(N: vec3<f32>, V: vec3<f32>, L: vec3<f32>, roughness: f32) -> f32 {
  let NdotV = max(dot(N, V), 0.0);
  let NdotL = max(dot(N, L), 0.0);
  let ggx2 = geometrySchlickGGX(NdotV, roughness);
  let ggx1 = geometrySchlickGGX(NdotL, roughness);

  return ggx1 * ggx2;
}

// ============================================================================
// Light attenuation
// ============================================================================

// Smooth attenuation (webgpu-metaballs style)
fn smoothAttenuation(distance: f32, range: f32) -> f32 {
  let d = distance / range;
  let d2 = d * d;
  let d4 = d2 * d2;
  // (1 - d^4)^2 - smooth falloff to zero at range
  let factor = max(1.0 - d4, 0.0);
  return factor * factor;
}

// Inverse square attenuation (physically accurate)
fn inverseSquareAttenuation(distance: f32, range: f32) -> f32 {
  let d = max(distance, 0.01);
  let attenuation = 1.0 / (d * d);
  // Windowed to avoid sharp cutoff
  let window = max(1.0 - pow(distance / range, 4.0), 0.0);
  return attenuation * window * window;
}

// ============================================================================
// Point light evaluation
// ============================================================================

struct PointLightPBR {
  position: vec3<f32>,
  color: vec3<f32>,
  intensity: f32,
  range: f32,
}

// Evaluate a point light with full PBR
fn evaluatePointLightPBR(
  light: PointLightPBR,
  position: vec3<f32>,
  normal: vec3<f32>,
  viewDir: vec3<f32>,
  albedo: vec3<f32>,
  metallic: f32,
  roughness: f32
) -> vec3<f32> {
  // Light direction and distance
  let lightVec = light.position - position;
  let distance = length(lightVec);
  let L = lightVec / distance;

  // Attenuation
  let attenuation = smoothAttenuation(distance, light.range);
  if (attenuation <= 0.0) {
    return vec3<f32>(0.0);
  }

  // Half vector
  let H = normalize(viewDir + L);

  // Material F0 (reflectance at normal incidence)
  let F0 = mix(vec3<f32>(0.04), albedo, metallic);

  // Cook-Torrance BRDF
  let NDF = distributionGGX(normal, H, roughness);
  let G = geometrySmith(normal, viewDir, L, roughness);
  let F = fresnelSchlick(max(dot(H, viewDir), 0.0), F0);

  // Specular term
  let numerator = NDF * G * F;
  let NdotL = max(dot(normal, L), 0.0);
  let NdotV = max(dot(normal, viewDir), 0.0);
  let denominator = 4.0 * NdotV * NdotL + 0.0001;
  let specular = numerator / denominator;

  // Energy conservation
  let kS = F;
  var kD = vec3<f32>(1.0) - kS;
  kD *= 1.0 - metallic; // Metals don't have diffuse

  // Diffuse term (Lambertian)
  let diffuse = kD * albedo / PI;

  // Final radiance
  let radiance = light.color * light.intensity * attenuation;

  return (diffuse + specular) * radiance * NdotL;
}

// Simplified point light evaluation (Lambertian + Blinn-Phong)
fn evaluatePointLightSimple(
  light: PointLightPBR,
  position: vec3<f32>,
  normal: vec3<f32>,
  viewDir: vec3<f32>,
  albedo: vec3<f32>,
  roughness: f32
) -> vec3<f32> {
  let lightVec = light.position - position;
  let distance = length(lightVec);
  let L = lightVec / distance;

  let attenuation = smoothAttenuation(distance, light.range);
  if (attenuation <= 0.0) {
    return vec3<f32>(0.0);
  }

  // Diffuse (Lambertian)
  let NdotL = max(dot(normal, L), 0.0);
  let diffuse = albedo * NdotL;

  // Specular (Blinn-Phong)
  let H = normalize(L + viewDir);
  let NdotH = max(dot(normal, H), 0.0);
  let shininess = mix(8.0, 256.0, 1.0 - roughness);
  let specular = pow(NdotH, shininess) * (1.0 - roughness);

  let radiance = light.color * light.intensity * attenuation;
  return (diffuse + specular) * radiance;
}

// ============================================================================
// Ambient/environment lighting
// ============================================================================

// Simple ambient with hemisphere
fn hemisphereAmbient(
  normal: vec3<f32>,
  skyColor: vec3<f32>,
  groundColor: vec3<f32>,
  albedo: vec3<f32>
) -> vec3<f32> {
  let factor = normal.y * 0.5 + 0.5;
  let ambient = mix(groundColor, skyColor, factor);
  return ambient * albedo;
}

// Ambient occlusion factor
fn applyAO(color: vec3<f32>, ao: f32) -> vec3<f32> {
  return color * ao;
}

// ============================================================================
// Tone mapping
// ============================================================================

// Reinhard tone mapping
fn toneMapReinhard(color: vec3<f32>) -> vec3<f32> {
  return color / (color + vec3<f32>(1.0));
}

// ACES filmic tone mapping
fn toneMapACES(color: vec3<f32>) -> vec3<f32> {
  let a = 2.51;
  let b = 0.03;
  let c = 2.43;
  let d = 0.59;
  let e = 0.14;
  return clamp((color * (a * color + b)) / (color * (c * color + d) + e), vec3<f32>(0.0), vec3<f32>(1.0));
}

// Uncharted 2 tone mapping helper
fn uncharted2Helper(x: vec3<f32>) -> vec3<f32> {
  let A = 0.15;
  let B = 0.50;
  let C = 0.10;
  let D = 0.20;
  let E = 0.02;
  let F = 0.30;
  return ((x * (A * x + C * B) + D * E) / (x * (A * x + B) + D * F)) - E / F;
}

// Uncharted 2 tone mapping
fn toneMapUncharted2(color: vec3<f32>) -> vec3<f32> {
  let W = 11.2;
  let exposureBias = 2.0;
  let curr = uncharted2Helper(exposureBias * color);
  let whiteScale = 1.0 / uncharted2Helper(vec3<f32>(W));
  return curr * whiteScale;
}

// Gamma correction
fn gammaCorrect(color: vec3<f32>, gamma: f32) -> vec3<f32> {
  return pow(color, vec3<f32>(1.0 / gamma));
}

// sRGB to linear
fn sRGBToLinear(color: vec3<f32>) -> vec3<f32> {
  return pow(color, vec3<f32>(2.2));
}

// Linear to sRGB
fn linearToSRGB(color: vec3<f32>) -> vec3<f32> {
  return pow(color, vec3<f32>(1.0 / 2.2));
}
