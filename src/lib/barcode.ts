/**
 * Code 128-B barcode, rendered as bar geometry.
 *
 * Written out rather than pulled from a package on purpose: this runs on a
 * 256MB shared host where adding a dependency means an `npm install` that has
 * already been OOM-killed once. It is ~100 lines, has no runtime cost worth
 * measuring, and a delivery label that cannot be scanned is not worth
 * printing — so the bars are real Code 128, not decoration.
 */

/** The 107 standard Code 128 element-width patterns, indexed by symbol value. */
const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

const START_B = 104;
const STOP = 106;

export type Bar = { x: number; width: number };

export type Barcode = {
  bars: Bar[];
  /** Total width in modules — use as the SVG viewBox width. */
  modules: number;
};

/**
 * Encodes `value` as Code 128-B bars measured in modules (the narrowest bar
 * is 1). Characters outside the printable ASCII range Code 128-B covers are
 * dropped rather than silently mis-encoded into a barcode that scans as
 * something else.
 */
export function code128(value: string): Barcode {
  const chars = [...value].filter((c) => {
    const code = c.charCodeAt(0);
    return code >= 32 && code <= 126;
  });

  const values = chars.map((c) => c.charCodeAt(0) - 32);

  // Checksum: start value, plus each symbol weighted by its 1-based position.
  let checksum = START_B;
  values.forEach((v, i) => {
    checksum += v * (i + 1);
  });
  checksum %= 103;

  const sequence = [START_B, ...values, checksum, STOP];

  const bars: Bar[] = [];
  let x = 0;

  for (const symbol of sequence) {
    const pattern = PATTERNS[symbol];
    // Widths alternate bar, space, bar, space… always starting on a bar.
    for (let i = 0; i < pattern.length; i++) {
      const width = Number(pattern[i]);
      if (i % 2 === 0) bars.push({ x, width });
      x += width;
    }
  }

  return { bars, modules: x };
}
