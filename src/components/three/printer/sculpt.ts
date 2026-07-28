import { Box3, BufferGeometry, Mesh, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Loading a real sculpted mesh into the hero printer.
 *
 * The other pieces in the queue are written as code — a lamp, a gear, a tower
 * are all things a few dozen lines of primitives can describe convincingly.
 * A devotional sculpt is not: the crown, the jewellery, the drapery folds and
 * the face carry the entire likeness, and every one of them is hand-sculpted
 * detail that has no procedural shorthand. Approximating it in primitives can
 * only ever produce a figure-shaped object.
 *
 * So the studio's own mesh gets loaded instead. Drop an STL or GLB at
 * `public/models/hanuman.stl` (or `.glb`) and the printer prints that, with
 * the same layer-by-layer reveal as everything else. Until then the
 * procedural stand-in is used, so the page never depends on the file being
 * there.
 */

/** Attributes the merge and the layer shader rely on; anything else is dropped. */
const KEPT_ATTRIBUTES = ['position', 'normal', 'uv'] as const;

function stripToCommonAttributes(geometry: BufferGeometry): BufferGeometry {
  const clean = new BufferGeometry();

  for (const name of KEPT_ATTRIBUTES) {
    const attribute = geometry.getAttribute(name);
    if (attribute) clean.setAttribute(name, attribute);
  }

  // `mergeGeometries` refuses a mix of indexed and non-indexed inputs.
  if (geometry.index) clean.setIndex(geometry.index);
  if (!clean.getAttribute('normal')) clean.computeVertexNormals();

  return clean;
}

/**
 * Sits the mesh on the build plate, centres it over the origin, and scales it
 * to the height the choreography expects. Exported models arrive in whatever
 * units and origin the sculptor happened to use — millimetres, Z-up, centred
 * on the model's middle — so none of this can be assumed.
 */
function normalise(geometry: BufferGeometry, targetHeight: number): BufferGeometry {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox ?? new Box3();
  const size = box.getSize(new Vector3());

  // Z-up exports (most CAD, and STL from some sculpting tools) come in lying
  // on their back. If the mesh is deeper than it is tall, stand it up.
  if (size.z > size.y * 1.35) {
    geometry.rotateX(-Math.PI / 2);
    geometry.computeBoundingBox();
    box.copy(geometry.boundingBox ?? box);
    box.getSize(size);
  }

  const scale = size.y > 0 ? targetHeight / size.y : 1;
  geometry.scale(scale, scale, scale);

  geometry.computeBoundingBox();
  const scaled = geometry.boundingBox ?? new Box3();
  const centre = scaled.getCenter(new Vector3());
  geometry.translate(-centre.x, -scaled.min.y, -centre.z);

  geometry.computeVertexNormals();
  return geometry;
}

async function loadStl(url: string): Promise<BufferGeometry> {
  const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
  return new STLLoader().loadAsync(url);
}

async function loadGltf(url: string): Promise<BufferGeometry> {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const gltf = await new GLTFLoader().loadAsync(url);

  // The part is printed in one filament colour, so the scene's separate
  // meshes and materials collapse into a single geometry. Each mesh's world
  // transform has to be baked in first or the pieces land on top of each
  // other at the origin.
  const parts: BufferGeometry[] = [];
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((node) => {
    if (!(node instanceof Mesh) || !node.geometry) return;
    const geometry = stripToCommonAttributes(node.geometry.clone());
    geometry.applyMatrix4(node.matrixWorld);
    parts.push(geometry);
  });

  if (parts.length === 0) throw new Error('That model contains no meshes.');

  const merged = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
  if (!merged) throw new Error('That model could not be merged into one mesh.');

  if (parts.length > 1) parts.forEach((p) => p.dispose());
  return merged;
}

/**
 * Loads and normalises a sculpt. Resolves to `null` rather than throwing —
 * a missing or malformed model must degrade to the procedural stand-in, never
 * take the hero down with it.
 */
export async function loadSculpt(
  url: string,
  targetHeight: number,
): Promise<BufferGeometry | null> {
  try {
    const lower = url.toLowerCase();
    const raw = lower.endsWith('.stl') ? await loadStl(url) : await loadGltf(url);
    return normalise(stripToCommonAttributes(raw), targetHeight);
  } catch (error) {
    console.error(`[drs] could not load the hero model at ${url}`, error);
    return null;
  }
}
