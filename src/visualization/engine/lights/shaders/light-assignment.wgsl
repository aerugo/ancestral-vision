/**
 * Light Assignment Compute Shader
 *
 * Assigns lights to clusters by testing sphere-AABB intersection.
 * Each light is processed independently and added to all intersecting clusters.
 */

struct PointLight {
  position: vec4<f32>,      // xyz = position, w = padding
  colorIntensity: vec4<f32>, // xyz = color, w = intensity
  rangeData: vec4<f32>,      // x = range, yzw = padding
}

struct ClusterBounds {
  minPoint: vec4<f32>,
  maxPoint: vec4<f32>,
}

struct ClusterLightData {
  count: atomic<u32>,
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
}

struct CameraUniforms {
  projectionMatrix: mat4x4<f32>,
  viewMatrix: mat4x4<f32>,
  inverseProjection: mat4x4<f32>,
  position: vec3<f32>,
  _pad0: f32,
  near: f32,
  far: f32,
  time: f32,
  _pad1: f32,
}

struct LightCount {
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

// Bind groups
@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> lightCount: LightCount;
@group(0) @binding(2) var<storage, read> lights: array<PointLight>;

@group(1) @binding(0) var<storage, read> clusterBounds: array<ClusterBounds>;
@group(1) @binding(1) var<storage, read_write> clusterLights: array<ClusterLightData>;
@group(1) @binding(2) var<storage, read_write> clusterIndices: array<u32>;

@group(2) @binding(0) var<uniform> config: ClusterConfig;

// Test if a sphere intersects an AABB
fn sphereAABBIntersect(center: vec3<f32>, radius: f32, aabbMin: vec3<f32>, aabbMax: vec3<f32>) -> bool {
  // Find the closest point on the AABB to the sphere center
  let closest = clamp(center, aabbMin, aabbMax);
  // Check if the closest point is within the sphere radius
  let dist = distance(center, closest);
  return dist <= radius;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) globalId: vec3<u32>) {
  let lightIndex = globalId.x;

  // Bounds check
  if (lightIndex >= lightCount.count) {
    return;
  }

  // Get light data
  let light = lights[lightIndex];
  let lightPosWorld = light.position.xyz;
  let lightRange = light.rangeData.x;

  // Transform light position to view space
  let lightPosView = (camera.viewMatrix * vec4<f32>(lightPosWorld, 1.0)).xyz;

  // Calculate total cluster count
  let clusterCount = config.tileCount.x * config.tileCount.y * config.tileCount.z;

  // Test each cluster for intersection
  for (var i = 0u; i < clusterCount; i++) {
    let bounds = clusterBounds[i];

    // Test sphere-AABB intersection
    if (sphereAABBIntersect(lightPosView, lightRange, bounds.minPoint.xyz, bounds.maxPoint.xyz)) {
      // Atomically increment cluster light count
      let offset = atomicAdd(&clusterLights[i].count, 1u);

      // Add light index if we haven't exceeded the max
      if (offset < config.maxLightsPerCluster) {
        clusterIndices[i * config.maxLightsPerCluster + offset] = lightIndex;
      }
    }
  }
}
