interface Complex {
  real: number;
  imag: number;
}

interface RGB {
  red: number;
  green: number;
  blue: number;
}

interface Viewport2D {
  height: number;
  width: number;
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
}

function iteration(z: Complex, c: Complex): Complex {
  return {
    real: z.real * z.real - z.imag * z.imag + c.real,
    imag: 2 * z.real * z.imag + c.imag
  };
}

function modulus(z: Complex): number {
  return (z.real * z.real + z.imag * z.imag);
}

function HSVtoRGB(h: number, s: number, v: number): RGB {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) -1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if(0 <= h && h < 60) {
    r = c; g = x;
  } else if(60 <= h && h < 120) {
    r = x; g = c;
  } else if(120 <= h && h < 180) {
    g = c; b = x;
  } else if(180 <= h && h < 240) {
    g = x; b = c;
  } else if(240 <= h && h < 300) {
    r = x; b = c;
  } else if(300 <= h && h < 360) {
    r = c; b = x;
  }
  return { red: Math.floor((r + m)*255),
    green: Math.floor((g + m)*255),
    blue: Math.floor((b + m)*255)
  }
}

function assignColor(cumFreq: number, isBlack: boolean): RGB {
  if(isBlack) {
    return { red: 0, green: 0, blue: 0 };
  }
  return HSVtoRGB(Math.floor(cumFreq * 360), 1, 1);
}

function drawPixel(i: number, c: RGB): void {
  const idx = 4 * i;
  imgData.data[idx] = c.red;
  imgData.data[idx + 1] = c.green;
  imgData.data[idx + 2] = c.blue;
  imgData.data[idx + 3] = 255;
}

function drawMandelbrot(vp: Viewport2D, escapeR: number, maxIters: number): void {
  const xDelta = (vp.xmax - vp.xmin) / vp.width;
  const yDelta = (vp.ymax - vp.ymin) / vp.height;
  const rsqr = Math.max(escapeR * escapeR, 4);
  let colorHist = new Array<number>(maxIters);
  let colorArr = new Array<Array<number>>(vp.width);

  colorHist.fill(0);
  let iterSaved = 0;
  for(let vpx = 0; vpx < vp.width; vpx++) {
    const x = vpx * xDelta + vp.xmin;
    colorArr[vpx] = new Array<number>(vp.height);
    colorArr[vpx].fill(0);
    for(let vpy = 0; vpy < vp.height; vpy++) {
      const y = vpy * yDelta + vp.ymin;
      const c = { real: x, imag: y };
      let z = c;
      let i = 1;
      while(i < maxIters && modulus(z) <= rsqr) {
        z = iteration(z, c);
        i++;
      }

      colorHist[i - 1] += 1;
      colorArr[vpx][vpy] = i;
    }
  }

  let cumHist = new Array<number>(maxIters);
  cumHist.fill(0);
  cumHist[0] = colorHist[0];
  for(let i = 1; i < maxIters; i++) {
    cumHist[i] = cumHist[i - 1] + colorHist[i];
  }
  for(let vpx = 0; vpx < vp.width; vpx++) {
    for(let vpy = 0; vpy < vp.height; vpy++) {
      const idx = vpy * vp.width + vpx;
      const iters = colorArr[vpx][vpy];
      const color = assignColor(cumHist[iters] / cumHist[maxIters - 1],
        iters >= maxIters - 1);
      drawPixel(idx, color);
    }
  }
  cntxt.putImageData(imgData, 0, 0);
}

let canvas = <HTMLCanvasElement>document.getElementById("mandelbrot");
let cntxt = canvas.getContext("2d", { alpha: false });
let vp: Viewport2D = {
  width: canvas.width,
  height: canvas.height,
  xmin: -2.5,
  xmax: 1,
  ymin: -1,
  ymax: 1
};
let imgData = cntxt.createImageData(vp.width, vp.height);
let maxIters = 1000;
let escapeR = 256;
drawMandelbrot(vp, escapeR, maxIters);
