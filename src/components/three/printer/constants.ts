/**
 * Scene geometry constants shared between the printer, the printed part and
 * the animation controller.
 *
 * The key idea: the nozzle never moves vertically. The bed descends as the
 * part grows, and a fixed world-space clipping plane sits exactly at the
 * nozzle tip. Everything below the plane is printed; everything above is
 * hidden. That's how a real bed-drop printer works, and it means the layer
 * reveal needs no per-frame geometry rebuilding.
 */

/** World Y of the nozzle tip — and therefore of the clipping plane. */
export const PRINT_PLANE_Y = 2.0;

/** Local Y of the build plate's top surface, inside the bed group. */
export const PLATE_TOP_LOCAL = 0.7;

/** Bed group Y offset that puts the plate exactly at the nozzle. */
export const BED_REST_Y = PRINT_PLANE_Y - PLATE_TOP_LOCAL;

/** Bands per scene unit for the printed-layer shading. */
export const LAYER_FREQUENCY = 105;
