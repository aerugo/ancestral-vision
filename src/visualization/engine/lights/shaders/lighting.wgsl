/**
 * Clustered Lighting Utilities
 *
 * Fragment shader utilities for accessing clustered light data
 * and computing PBR lighting.
 */

// Constants
const PI: f32 = 3.14159265359;

struct PointLight {
  position: vec4<f32>,       // xyz = position, w = padding
  colorIntensity: vec4<f32>, // xyz = color, w = intensity
  rangeData: vec4<f32>,      // x = range, yzw = padding
}

struct ClusterLightData {
  count: u32,
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
}

struct ClusterConfig {
  tileCount: vec3<u32>,
  maxLightsPerCluster: u32,
  viewportSize: vec2<f32>,
  near: f32,
  far: f32,
}

// External bindings (must be provided by the material shader)
// @group(X) @binding(Y) var<storage, read> lights: array<PointLight>;
// @group(X) @binding(Y) var<storage, read> clusterLights: array<ClusterLightData>;
// @group(X) @binding(Y) var<storage, read> clusterIndices: array<u32>;
// @group(X) @binding(Y) var<uniform> clusterConfig: ClusterConfig;

// Calculate cluster index from fragment coordinates
fn getClusterIndex(fragCoord: vec2<f32>, linearDepth: f32, config: ClusterConfig) -> u32 {
  // Calculate tile position
  let tileX = u32(fragCoord.x / config.viewportSize.x * f32(config.tileCount.x));
  let tileY = u32(fragCoord.y / config.viewportSize.y * f32(config.tileCount.y));

  // Logarithmic depth slice
  let logDepth = log(linearDepth / config.near) / log(config.far / config.near);
  let tileZ = u32(clamp(logDepth, 0.0, 1.0) * f32(config.tileCount.z));

  // Clamp to valid range
  let clampedX = min(tileX, config.tileCount.x - 1u);
  let clampedY = min(tileY, config.tileCount.y - 1u);
  let clampedZ = min(tileZ, config.tileCount.z - 1u);

  return clampedX + clampedY * config.tileCount.x +
         clampedZ * config.tileCount.x * config.tileCount.y;
}

// Smooth attenuation function (webgpu-metaballs style)
fn getAttenuation(distance: f32, range: f32) -> f32 {
  let d = distance / range;
  let d2 = d * d;
  let d4 = d2 * d2;
  // Smooth falloff: (1 - d^4)^2
  let factor = max(1.0 - d4, 0.0);
  return factor * factor;
}

// Evaluate a single point light (Lambertian + Blinn-Phong)
fn evaluatePointLight(
  light: PointLight,
  position: vec3<f32>,
  normal: vec3<f32>,
  viewDir: vec3<f32>,
  albedo: vec3<f32>,
  roughness: f32
) -> vec3<f32> {
  let lightPos = light.position.xyz;
  let lightColor = light.colorIntensity.xyz;
  let lightIntensity = light.colorIntensity.w;
  let lightRange = light.rangeData.x;

  // Direction and distance to light
  let lightVec = lightPos - position;
  let distance = length(lightVec);
  let lightDir = lightVec / distance;

  // Attenuation
  let attenuation = getAttenuation(distance, lightRange);
  if (attenuation <= 0.0) {
    return vec3<f32>(0.0);
  }

  // Diffuse (Lambertian)
  let NdotL = max(dot(normal, lightDir), 0.0);
  let diffuse = albedo * NdotL;

  // Specular (Blinn-Phong)
  let halfVec = normalize(lightDir + viewDir);
  let NdotH = max(dot(normal, halfVec), 0.0);
  let shininess = mix(8.0, 256.0, 1.0 - roughness);
  let specular = pow(NdotH, shininess) * (1.0 - roughness);

  // Final contribution
  let radiance = lightColor * lightIntensity * attenuation;
  return (diffuse + specular) * radiance;
}

// Compute total lighting from clustered lights
fn computeClusteredLighting(
  fragCoord: vec2<f32>,
  position: vec3<f32>,
  normal: vec3<f32>,
  viewDir: vec3<f32>,
  albedo: vec3<f32>,
  roughness: f32,
  linearDepth: f32,
  lights: ptr<storage, array<PointLight>, read>,
  clusterLights: ptr<storage, array<ClusterLightData>, read>,
  clusterIndices: ptr<storage, array<u32>, read>,
  config: ClusterConfig
) -> vec3<f32> {
  // Get cluster index
  let clusterIdx = getClusterIndex(fragCoord, linearDepth, config);

  // Get light count for this cluster
  let cluster = (*clusterLights)[clusterIdx];
  let numLights = min(cluster.count, config.maxLightsPerCluster);

  // Accumulate lighting
  var totalLight = vec3<f32>(0.0);

  for (var i = 0u; i < numLights; i++) {
    let lightIdx = (*clusterIndices)[clusterIdx * config.maxLightsPerCluster + i];
    let light = (*lights)[lightIdx];

    totalLight += evaluatePointLight(
      light,
      position,
      normal,
      viewDir,
      albedo,
      roughness
    );
  }

  return totalLight;
}

// Ambient occlusion estimation based on cluster light density
fn estimateAO(clusterIdx: u32, clusterLights: ptr<storage, array<ClusterLightData>, read>, maxLights: u32) -> f32 {
  let lightCount = (*clusterLights)[clusterIdx].count;
  // More lights = less ambient needed
  let density = f32(min(lightCount, maxLights)) / f32(maxLights);
  return mix(1.0, 0.5, density);
}
