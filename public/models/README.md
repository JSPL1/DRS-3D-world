# Hero sculpt

Drop the Hanuman mesh in this folder and the hero printer prints it — the real
one, layer by layer, instead of the coded stand-in.

Name it exactly one of these (checked in this order):

| File            | Notes                                                  |
| --------------- | ------------------------------------------------------ |
| `hanuman.glb`   | **Preferred.** Binary glTF — smallest download.        |
| `hanuman.gltf`  | Only if the geometry is embedded in the file.          |
| `hanuman.stl`   | Works, but an STL is typically 5–20× larger than a GLB. |

Nothing else needs changing. The loader stands the model up if it was exported
Z-up, centres it over the build plate, and scales it to the plate height, so
the export units and origin don't matter.

## Keep it under about 8 MB

This downloads in the browser before the statue can print. A 200 MB ZBrush
export will work but will take a long time to arrive on a phone. Decimate to
roughly 150k–300k triangles before exporting — at hero scale nothing above that
is visible.

If the file is missing or fails to load, the hero silently falls back to the
procedural stand-in. Check the browser console for `[drs] could not load the
hero model` if the mesh does not appear.

## Draco and KTX2 are not supported

The loader is the plain glTF one. Export without Draco mesh compression and
without KTX2 textures — textures are ignored anyway, since the part is rendered
in a single filament colour.
