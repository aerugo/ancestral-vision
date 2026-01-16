/**
 * Cluster Bounds Compute Shader
 *
 * Computes AABB bounds for each cluster in view space.
 * Uses logarithmic depth slicing for better distribution.
 */

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

struct ClusterBounds {
  minPoint: vec4<f32>,
  maxPoint: vec4<f32>,
}

struct ClusterConfig {
  tileCount: vec3<u32>,
  _pad0: u32,
  viewportSize: vec2<f32>,
  near: f32,
  far: f32,
}

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> config: ClusterConfig;
@group(1) @binding(0) var<storage, read_write> clusterBounds: array<ClusterBounds>;

// Convert screen position to view space
fn screenToView(screenPos: vec2<f32>, depth: f32) -> vec3<f32> {
  let ndc = vec4<f32>(
    (screenPos.x / config.viewportSize.x) * 2.0 - 1.0,
    1.0 - (screenPos.y / config.viewportSize.y) * 2.0,
    depth,
    1.0
  );
  let viewPos = camera.inverseProjection * ndc;
  return viewPos.xyz / viewPos.w;
}

// Get depth value for a given slice (logarithmic distribution)
fn getDepthSlice(slice: u32) -> f32 {
  let nearLog = log(config.near);
  let farLog = log(config.far);
  let t = f32(slice) / f32(config.tileCount.z);
  return exp(nearLog + t * (farLog - nearLog));
}

@compute @workgroup_size(4, 4, 4)
fn main(@builtin(global_invocation_id) globalId: vec3<u32>) {
  // Calculate linear index
  let tileIndex = globalId.x +
                  globalId.y * config.tileCount.x +
                  globalId.z * config.tileCount.x * config.tileCount.y;

  // Bounds check
  if (globalId.x >= config.tileCount.x ||
      globalId.y >= config.tileCount.y ||
      globalId.z >= config.tileCount.z) {
    return;
  }

  // Calculate tile size in pixels
  let tileSize = config.viewportSize / vec2<f32>(config.tileCount.xy);

  // Calculate screen-space tile bounds
  let tileMin = vec2<f32>(globalId.xy) * tileSize;
  let tileMax = tileMin + tileSize;

  // Calculate depth bounds (logarithmic)
  let zNear = getDepthSlice(globalId.z);
  let zFar = getDepthSlice(globalId.z + 1u);

  // Convert all 4 corners to view space at both depths
  let minNear = screenToView(tileMin, zNear);
  let maxNear = screenToView(tileMax, zNear);
  let minFar = screenToView(tileMin, zFar);
  let maxFar = screenToView(tileMax, zFar);

  // Compute AABB in view space
  var minPoint = min(min(minNear, maxNear), min(minFar, maxFar));
  var maxPoint = max(max(minNear, maxNear), max(minFar, maxFar));

  // Store bounds
  clusterBounds[tileIndex].minPoint = vec4<f32>(minPoint, 0.0);
  clusterBounds[tileIndex].maxPoint = vec4<f32>(maxPoint, 0.0);
}
