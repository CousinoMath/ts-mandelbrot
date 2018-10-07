// /// <reference path="react.d.ts" />

import { MandelbrotVP, Viewport2D } from "./MandelbrotSet";

interface RGB {
    red: number;
    green: number;
    blue: number;
}

function HSVtoRGB(h: number, s: number, v: number): RGB {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;
    if (0 <= h && h < 60) {
        r = c; g = x;
    } else if (60 <= h && h < 120) {
        r = x; g = c;
    } else if (120 <= h && h < 180) {
        g = c; b = x;
    } else if (180 <= h && h < 240) {
        g = x; b = c;
    } else if (240 <= h && h < 300) {
        r = x; b = c;
    } else if (300 <= h && h < 360) {
        r = c; b = x;
    }
    return {
        red: Math.floor((r + m) * 255),
        green: Math.floor((g + m) * 255),
        blue: Math.floor((b + m) * 255)
    }
}

function assignColor(cumFreq: number, isBlack: boolean): RGB {
    if (isBlack) {
        return { red: 0, green: 0, blue: 0 };
    }
    return HSVtoRGB(Math.floor(cumFreq * 360), 1, 1);
}

function drawPixel(c: RGB): [number, number, number, number] {
    return [c.red, c.green, c.blue, 255];
}

function array<T, S>(nil: S, f: (x: T, y: S) => S): (xs: Array<T>) => S {
    return xs => xs.length == 0 ? nil : array(f(xs[0], nil), f)(xs.slice(1));
}

function reduce<T, S>(xs: Array<T>, f: (accum: S, value: T) => S, init: S): S {
    return array(init, (x: T, y: S) => f(y, x))(xs);
}

const cumSum =
    (xs: Array<number>) =>
        array([0],
            (value: number, accum) => accum.concat(value + accum[accum.length - 1]))(xs).slice(1);

function flatMap<T, S>(f: (x: T) => Array<S>): (xs: Array<T>) => Array<S> {
    return array([], (x: T, ys: Array<S>) => ys.concat(f(x)));
}

function flatten<T>(xss: Array<Array<T>>): Array<T> {
    return flatMap((x: Array<T>) => x)(xss);
}

function from<T>(len: number, f: (idx: number) => T): Array<T> {
    return (new Array(len)).map((_, idx: number) => f(idx));
}

function range(start = 0, stop: number, delta = 1): Array<number> {
    const len = delta != 0 ? Math.floor((stop - start) / delta) : 0;
    return from(len, (idx: number) => start + idx * delta);
}

function linearInterpolate<T>(x1: { [K in keyof T]: number }, x2: { [K in keyof T]: number }, alpha: number): { [K in keyof T]: number } {
    let y = x1;
    for (let key in y) {
        y[key] = alpha * x1[key] + (1 - alpha) * x2[key];
    }
    return y;
}

function drawMandelbrot(vp: Viewport2D, escapeR: number, maxIters: number, palette: Array<RGB>, imgData: ImageData): ImageData {
    const logEscape = Math.log(escapeR);
    const paletteMax = palette.length;
    let pointData = MandelbrotVP(escapeR, maxIters)(vp);
    let colorHist = (new Array<number>(paletteMax)).fill(0);
    // let imgData = new ImageData(vp.width, vp.height);

    for (let idx in pointData) {
        const [iters, modulus] = pointData[idx];
        if (iters < maxIters) {
            const phi = iters + 1 - Math.log2(Math.log(modulus) / logEscape)
            pointData[idx] = [phi, modulus];
            colorHist[Math.floor(phi / maxIters * paletteMax)]++;
        } else {
            colorHist[paletteMax]++;
        }
    }
    const cumHist = cumSum(colorHist);
    const sum = vp.width * vp.height;
    for (let idx in pointData) {
        const [iters, _] = pointData[idx];
        let color = assignColor(1, true);
        if (iters == maxIters) {
            const idx = Math.floor(iters);
            const color1 = assignColor(cumHist[idx] / sum, false);
            const color2 = assignColor(cumHist[idx + 1] / sum, false);
            color = linearInterpolate(color1, color2, iters % 1);
        }
        const idIdx = 4 * parseInt(idx);
        imgData[idIdx] = color.red;
        imgData[idIdx + 1] = color.green;
        imgData[idIdx + 2] = color.blue;
        imgData[idIdx + 3] = 255; 
    }
    return imgData;
}

let canvas = document.getElementById("mandelbrot") as HTMLCanvasElement;
let cntxt = canvas.getContext("2d", { alpha: false });
let vp: Viewport2D = {
    width: canvas.width,
    height: canvas.height,
    xmin: -2.5,
    xmax: 1,
    ymin: -1,
    ymax: 1
};
if (cntxt == null) {
    throw new Error();
}
let imgData = cntxt.createImageData(vp.width, vp.height);
let maxIters = 1000;
let escapeR = 256;
let paletteMax = 360;
let palette = from(paletteMax, (idx) => HSVtoRGB(Math.floor(idx/paletteMax * 360), 1, 1));
cntxt.putImageData(drawMandelbrot(vp, escapeR, maxIters, palette, imgData), 0, 0);

// React.render("<Mandelbrot />", document.getElementById("Mandelbrot"));