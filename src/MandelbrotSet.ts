export interface Complex {
  real: number;
  imag: number;
}

export interface Viewport2D {
  height: number;
  width: number;
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
}

function MandelbrotIter(z: Complex, c: Complex): Complex {
  return {
    real: z.real * z.real - z.imag * z.imag + c.real,
    imag: 2 * z.real * z.imag + c.imag
  };
}

function modulusSqr(z: Complex): number {
  return (z.real * z.real + z.imag * z.imag);
}

export function Mandelbrot(escapeR: number, maxIters: number): (c: Complex) => [number, number] {
  const rsqr = Math.max(escapeR * escapeR, 4);
  return c => {
    let z = c;
    let i = 1;
    while (i++ < maxIters && modulusSqr(z) <= rsqr) {
      z = MandelbrotIter(z, c);
    }
    return [i, Math.sqrt(modulusSqr(z))];
  }
}

export function MandelbrotVP(escapeR: number, maxIters: number): (vp: Viewport2D) => Array<[number, number]> {
  const mandelbrot = Mandelbrot(escapeR, maxIters);
  return vp => {
    const size = vp.width * vp.height;
    const xDelta = (vp.xmax - vp.xmin) / vp.width;
    const yDelta = (vp.ymax - vp.ymin) / vp.height;
    let arr = new Array<[number, number]>();
    if (size >= (1 << 32)) {
      return arr;
    }
    for(let yi = 0; yi < vp.height; yi++) {
      for(let xi = 0; xi < vp.width; xi++) {
        arr.push(mandelbrot({ real: vp.xmin + xi * xDelta, imag: vp.ymin + yi * yDelta }));
      }
    }
    return arr;
  }
}