onmessage = (evt: MessageEvent) => {
  const points = evt.data[0] as [Float32Array, Float32Array];
  const [maxIters, escapeR] = evt.data[1] as [number, number];
  const imgData = evt.data[2] as ImageData;
  const newImgData = mandelbrot(points, maxIters, escapeR, imgData);
  (postMessage as any)([newImgData]);
};

function mandelbrot(
  points: [Float32Array, Float32Array],
  maxIters: number,
  escapeR: number,
  imgData: ImageData
): ImageData {
  const [reals, imags] = points;
  const numPoints = reals.length;
  const iterations = new Float32Array(numPoints);
  let iterHistogram = new Array<number>(maxIters);
  const rSqr = escapeR * escapeR;
  const logR = Math.log(escapeR);

  iterHistogram.fill(0);
  for (let pntIdx = 0; pntIdx < numPoints; pntIdx++) {
    const [creal, cimag] = [reals[pntIdx], imags[pntIdx]];
    let [zreal, zimag] = [creal, cimag];
    let iter = 1;
    let zresq = zreal * zreal;
    let zimsq = zimag * zimag;
    let modsq = zresq + zimsq;
    while (iter < maxIters && modsq < rSqr) {
      const tmp = zreal + zimag;
      const tmp2 = tmp * tmp;
      [zreal, zimag] = [
        zresq - zimsq + creal,
        tmp2 - modsq + cimag
      ];
      zresq = zreal * zreal;
      zimsq = zimag * zimag;
      modsq = zresq + zimsq;
      iter++;
    }
    const modulus = Math.sqrt(modsq);
    if (iter < maxIters) {
      const nu = Math.log2(Math.log(modulus) / logR);
      iterations[pntIdx] = iter + 1 - nu;
    } else {
      iterations[pntIdx] = maxIters;
    }
    iterHistogram[iter - 1]++;
  }
  let sum = 0;
  for (let iterIdx = 0; iterIdx < maxIters; iterIdx++) {
    sum += iterHistogram[iterIdx];
    iterHistogram[iterIdx] = sum;
  }
  iterHistogram = iterHistogram.map(x => x / sum);
  let imgIdx = 0;
  for (let pntIdx = 0; pntIdx < numPoints; pntIdx++) {
    const iter = iterations[pntIdx];
    let color = { red: 0, green: 0, blue: 0 };
    if (iter < maxIters) {
      const histIdx = Math.floor(iter);
      const color1 = assignColor(iterHistogram[histIdx]);
      const color2 = assignColor(iterHistogram[histIdx + 1]);
      color = linearInterpolate(color1, color2, iter % 1);
    }
    imgData.data[imgIdx++] = Math.floor(color.red);
    imgData.data[imgIdx++] = Math.floor(color.green);
    imgData.data[imgIdx++] = Math.floor(color.blue);
    imgData.data[imgIdx++] = 255;
  }
  return imgData;
}

function assignColor(c: number): { red: number; green: number; blue: number } {
  if (2 * c < 1) {
    return HSVtoRGB(240, 1, 1);
  } else if (3 * c < 2) {
    // 1/2 <= c < 2/3
    // 0 <= 2 c - 1 < 1/3
    // 0 <= 180 (2 c - 1) < 60
    // 180 < 240 - 180 (2 c - 1) = 420 - 360 c <= 240
    return HSVtoRGB(Math.round(420 - 360 * c), 1, 1);
  } else if (4 * c < 3) {
    // 2/3 <= c < 3/4
    // 0 <= 3 c - 2 < 1/4
    // 0 <= 240 (3 c - 2) < 60
    // 120 < 180 - 240 (3 c - 2) = 660 - 720 c <= 180
    return HSVtoRGB(Math.round(660 - 720 * c), 1, 1);
  } else if (5 * c < 4) {
    // 3/4 <= c < 4/5
    // 0 <= 4 c - 3 < 1/5
    // 0 <= 300 (4 c - 3) < 60
    // 60 < 120 - 300 (4 c - 3) = 1020 - 1200 c <= 120
    return HSVtoRGB(Math.round(1020 - 1200 * c), 1, 1);
  } else if (6 * c < 5) {
    // 4/5 <= c < 5/6
    // 0 <= 5 c - 4 < 1/6
    // 0 <= 360 (5 c - 4) < 60
    // 0 < 60 - 360 (5 c - 4) = 1500 - 1800 c <= 60
    return HSVtoRGB(Math.round(1500 - 1800 * c), 1, 1);
  } else {
    // 5/6 <= c <= 1
    // 0 <= 6 c - 5 <= 1
    // 0 <= 60 (6 c - 5) <= 60
    // 300 <= 360 - 60 (6 c - 5) = 660 - 360 c <= 360
    return HSVtoRGB(Math.round(660 - 360 * c), 1, 1);
  }
}

function HSVtoRGB(
  h: number,
  s: number,
  v: number
): { red: number; green: number; blue: number } {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (0 <= h && h < 60) {
    r = c;
    g = x;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
  } else if (120 <= h && h < 180) {
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    b = c;
    r = x;
  } else if (300 <= h && h < 360) {
    b = x;
    r = c;
  }
  return {
    blue: Math.floor((b + m) * 255),
    green: Math.floor((g + m) * 255),
    red: Math.floor((r + m) * 255)
  };
}

function linearInterpolate<T>(
  x: { [K in keyof T]: number },
  y: { [K in keyof T]: number },
  alpha: number
): { [K in keyof T]: number } {
  const z = x;
  for (const key in y) {
    if (y.hasOwnProperty(key)) {
      z[key] = (1 - alpha) * z[key] + alpha * y[key];
    }
  }
  return z;
}
