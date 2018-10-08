import { MandelbrotVP, Viewport2D } from "./MandelbrotSet";

type RGB = {
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

function array<T, S>(nil: S, f: (x: T, y: S) => S): (xs: Array<T>) => S {
    return xs => xs.length == 0 ? nil : array(f(xs[0], nil), f)(xs.slice(1));
}

const cumSum =
    (xs: Array<number>) =>
        array([0],
            (value: number, accum) => accum.concat(value + accum[accum.length - 1]))(xs).slice(1);

function from<T>(len: number, f: (idx: number) => T): Array<T> {
    return (new Array(len)).map((_, idx: number) => f(idx));
}

function linearInterpolate<T>(x1: { [K in keyof T]: number }, x2: { [K in keyof T]: number }, alpha: number): { [K in keyof T]: number } {
    let y = x1;
    for (let key in y) {
        y[key] = alpha * x1[key] + (1 - alpha) * x2[key];
    }
    return y;
}

class MandelbrotApp {
    private viewport: Viewport2D;
    private escapeRadius: number;
    private maxIterations: number;
    private palette: Array<RGB>;
    private canvas: HTMLCanvasElement;
    private pointerState = { down: false, inside: false, panx: 0.0, pany: 0.0, zoom: 1.0 };

    constructor(canvasElt: HTMLCanvasElement) {
        this.canvas = canvasElt;
        this.viewport = {
            width: this.canvas.width, height: this.canvas.height,
            xmin: -2, xmax: 1, ymin: -1.5, ymax: 1.5
        };
        this.escapeRadius = 256;
        this.maxIterations = 350;
        this.palette = from(360, (idx) => HSVtoRGB(idx, 1, 1));
        this.canvas.addEventListener("pointerdown", this.handlePointerDown);
        this.canvas.addEventListener("pointerenter", this.handlePointerEnter);
        this.canvas.addEventListener("resize", this.handleResize);
        //DeviceOrientationEvent
        //DragEvent
        //PointerEvent
        //WheelEvent
    }

    public render(): void {
        const vp = this.viewport;
        const cntxt = this.canvas.getContext("2d");
        const imgData = cntxt.getImageData(0, 0, vp.width, vp.height);
        const radius = Math.max(4, this.escapeRadius);
        const logRadius = Math.log(radius);
        const colors = this.palette;
        const paletteMax = colors.length;
        const maxIters = this.maxIterations;
        let pointData = MandelbrotVP(radius, maxIters)(vp);
        let colorHist = (new Array<number>(paletteMax)).fill(0);

        for (let idx in pointData) {
            const [iters, modulus] = pointData[idx];
            if (iters < maxIters) {
                const phi = iters + 1 - Math.log2(Math.log(modulus) / logRadius)
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
        cntxt.putImageData(imgData, 0, 0);
    }

    private handlePointerDown(ev: PointerEvent): void {
        this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
        this.canvas.addEventListener("pointerup", this.handlePointerUp);
        this.pointerState.down = true;
    }

    private handlePointerUp(ev: PointerEvent): void {
        this.canvas.removeEventListener("pointerup", this.handlePointerUp);
        this.canvas.addEventListener("pointerdown", this.handlePointerDown);
        this.pointerState.down = false;
    }

    private handlePointerEnter(ev: PointerEvent): void {
        this.canvas.removeEventListener("pointerenter", this.handlePointerEnter);
        this.canvas.addEventListener("pointerleave", this.handlePointerLeave);
        this.canvas.addEventListener("wheel", this.handleWheel);
        this.pointerState.inside = true;
    }

    private handlePointerLeave(ev: PointerEvent): void {
        this.canvas.removeEventListener("pointerleave", this.handlePointerLeave);
        this.canvas.addEventListener("pointerenter", this.handlePointerEnter);
        this.canvas.removeEventListener("wheel", this.handleWheel);
        this.pointerState.inside = false;
    }

    private handleWheel(ev: WheelEvent): void {
    }

    private handleResize(ev: UIEvent): void {}
}

const canvas = <HTMLCanvasElement>document.getElementById("mandelbrot");
const MandelApp = new MandelbrotApp(canvas);