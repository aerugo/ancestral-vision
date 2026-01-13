/**
 * Visualization module exports
 */

export { createRenderer, isWebGPUSupported, isWebGPURenderer, disposeRenderer } from './renderer';
export { createScene, createCamera, createControls, disposeScene } from './scene';
export {
  createConstellationMesh,
  updateConstellation,
  generatePlaceholderPeople,
  disposeConstellation,
  type PlaceholderPerson,
} from './constellation';
