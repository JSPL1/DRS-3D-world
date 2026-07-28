/**
 * Prepares a sculpted mesh for the hero printer.
 *
 * The studio's export is a production print file: 667k triangles and three
 * textures, 41 MB. That is the right file to send to a printer and the wrong
 * one to send to a phone over mobile data — it has to finish downloading
 * before the statue can appear, and it competes with everything else the
 * landing page is loading.
 *
 * The hero renders the part in a single filament colour under a clipping
 * plane, so of everything in that file only the silhouette and the surface
 * normals ever reach the screen. This strips it to exactly that:
 *
 *   weld      merge vertices split only by UV/normal seams, so the
 *             simplifier can actually collapse across them
 *   simplify  quadric decimation down to the target triangle count
 *   strip     drop UVs, textures, materials and unused nodes
 *   prune     remove whatever that orphaned
 *
 * Run: node scripts/optimise-hero-model.mjs <input.glb> [output.glb]
 */

import { NodeIO } from '@gltf-transform/core';
import { KHRMaterialsPBRSpecularGlossiness } from '@gltf-transform/extensions';
import { dedup, prune, simplify, weld } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import { statSync } from 'node:fs';

/** Above this the detail is smaller than a pixel at hero scale. */
const TARGET_TRIANGLES = 140_000;

const input = process.argv[2];
const output = process.argv[3] ?? input.replace(/\.glb$/i, '.optimised.glb');

if (!input) {
  console.error('Usage: node scripts/optimise-hero-model.mjs <input.glb> [output.glb]');
  process.exit(1);
}

const mb = (path) => (statSync(path).size / 1024 / 1024).toFixed(1);

function countTriangles(document) {
  let total = 0;
  for (const mesh of document.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      const indices = primitive.getIndices();
      const position = primitive.getAttribute('POSITION');
      total += indices ? indices.getCount() / 3 : (position?.getCount() ?? 0) / 3;
    }
  }
  return Math.round(total);
}

const io = new NodeIO().registerExtensions([KHRMaterialsPBRSpecularGlossiness]);
const document = await io.read(input);

const before = countTriangles(document);
console.log(`in   ${mb(input)} MB · ${before.toLocaleString()} triangles`);

await MeshoptSimplifier.ready;

// Ratio, not an absolute count — the simplifier works in proportions.
const ratio = Math.min(1, TARGET_TRIANGLES / before);

await document.transform(
  dedup(),
  weld(),
  // `error` is a fraction of the model's size; 1% is well below what is
  // visible at hero scale and lets the simplifier hit the ratio.
  simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.01, lockBorder: false }),
);

// Everything the single-colour render never reads.
for (const mesh of document.getRoot().listMeshes()) {
  for (const primitive of mesh.listPrimitives()) {
    for (const name of primitive.listSemantics()) {
      if (name !== 'POSITION' && name !== 'NORMAL') primitive.setAttribute(name, null);
    }
    primitive.setMaterial(null);
  }
}
for (const texture of document.getRoot().listTextures()) texture.dispose();
for (const material of document.getRoot().listMaterials()) material.dispose();

await document.transform(prune());

await io.write(output, document);

const after = countTriangles(document);
console.log(`out  ${mb(output)} MB · ${after.toLocaleString()} triangles`);
console.log(`     ${(100 - (statSync(output).size / statSync(input).size) * 100).toFixed(1)}% smaller`);
