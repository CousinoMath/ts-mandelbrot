type Complex = {
  real: number;
  imag: number;
};

function complex(re: number, im: number): Complex {
  return { real: re, imag: im };
}

function complexPlus(x: Complex, y: Complex): Complex {
  return complex(x.real + y.real, x.imag + y.imag);
}

function complexMinus(x: Complex, y: Complex): Complex {
  return complex(x.real - y.real, x.imag - y.imag);
}

// function complexSquare(x: Complex): Complex {
//   return complex(x.real * x.real - x.imag * x.imag, 2 * x.real * x.imag);
// }

type Viewport2D = {
  height: number;
  width: number;
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
};

type PointerCache = {
  movement: Complex;
  pointerId: number;
  position: Complex;
};

function convertPointerEvent(ev: PointerEvent): PointerCache {
  return {
    movement: complex(ev.movementX, ev.movementY),
    pointerId: ev.pointerId,
    position: complex(ev.clientX, ev.clientY)
  };
}

class MandelbrotApp {
  private viewport: Viewport2D = {
    height: 0,
    width: 0,
    xmax: 2,
    xmin: -3,
    ymax: 2.5,
    ymin: -2.5
  };
  private escapeRadius = 10;
  private maxIterations = 85;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D | null = null;
  private imageData: ImageData | null = null;
  private pointerState = new Array<PointerCache>();
  private zoom = 0.0;
  private redraw = false;
  private worker = new Worker("mandelbrotWorker.ts");

  constructor(canvasElt: HTMLCanvasElement) {
    this.canvas = canvasElt;
    this.viewport.width = this.canvas.width;
    this.viewport.height = this.canvas.height;
    const cntxt = this.canvas.getContext("2d", { alpha: false });

    if (cntxt == null) {
      console.log("Could not create a 2D rendering context from the canvas.");
      return;
    }
    this.context = cntxt;
    this.imageData = this.context.getImageData(
      0,
      0,
      this.viewport.width,
      this.viewport.height
    );
    const that = this;
    this.canvas.addEventListener("pointerenter", ev =>
      that.handlePointerEnter(ev)
    );
    this.canvas.addEventListener("pointerleave", ev =>
      that.handlePointerLeave(ev)
    );
    this.canvas.addEventListener("pointerdown", ev =>
      that.handlePointerDown(ev)
    );
    document.addEventListener("pointerup", ev => that.handlePointerUp(ev));
    document.addEventListener("pointermove", ev => that.handlePointerMove(ev));
    this.worker.addEventListener("message", ev => that.handleMessage(ev));
    this.render();
  }

  private modulusSqr(z: Complex): number {
    return z.real * z.real + z.imag * z.imag;
  }

  private render(): void {
    const width = this.viewport.width;
    const height = this.viewport.height;
    const xmin = this.viewport.xmin;
    const ymin = this.viewport.ymin;
    const xdelta = (this.viewport.xmax - xmin) / width;
    const ydelta = (this.viewport.ymax - ymin) / height;
    const size = width * height;
    const reals = new Float32Array(size);
    const imags = new Float32Array(size);

    for (let yidx = 0; yidx < height; yidx++) {
      for (let xidx = 0; xidx < width; xidx++) {
        const pntIdx = xidx + yidx * width;
        reals[pntIdx] = xmin + xidx * xdelta;
        imags[pntIdx] = ymin + yidx * ydelta;
      }
    }
    this.worker.postMessage([
      [reals, imags],
      [this.maxIterations, this.escapeRadius],
      this.imageData
    ]);
    this.zoom = 0;
    this.redraw = false;
  }

  private handlePointerDown: (ev: PointerEvent) => void = ev => {
    this.pointerState.push(convertPointerEvent(ev));
    if (this.redraw && this.pointerState.length > 1) {
      this.render();
    }

    console.groupCollapsed(`Pointer down at (${ev.clientX}, ${ev.clientY})`);
    console.log(`tracking ${this.pointerState.length} pointer events`);
  };

  private handlePointerUp: (ev: PointerEvent) => void = ev => {
    this.pointerState = this.pointerState.filter(
      x => x.pointerId !== ev.pointerId
    );
    if (this.redraw) {
      this.render();
      this.zoom = 0;
    }
    console.log(`tracking ${this.pointerState.length} pointer events`);
    console.log(`Pointer up at (${ev.clientX}, ${ev.clientY})`);
    console.groupEnd();
  };

  private handlePointerEnter: (ev: PointerEvent) => void = ev => {
    const that = this;
    that.canvas.addEventListener("wheel", e => that.handleWheel(e));

    console.groupCollapsed(`Pointer entered at (${ev.clientX}, ${ev.clientY})`);
    console.log(`tracking ${this.pointerState.length} pointer events`);
  };

  private handlePointerLeave: (ev: PointerEvent) => void = ev => {
    const that = this;
    that.canvas.removeEventListener("wheel", e => that.handleWheel(e));

    console.log(`tracking ${this.pointerState.length} pointer events`);
    console.log(`Pointer left at (${ev.clientX}, ${ev.clientY})`);
    console.groupEnd();
  };

  private handlePointerMove: (ev: PointerEvent) => void = ev => {
    const ptrIdx = this.pointerState.findIndex(
      x => x.pointerId === ev.pointerId
    );

    if (ptrIdx >= 0 && !this.redraw) {
      const ptr = this.pointerState[ptrIdx];
      ptr.movement = complexPlus(
        ptr.movement,
        complex(ev.movementX, ev.movementY)
      );
      ptr.position = complex(ev.clientX, ev.clientY);

      switch (this.pointerState.length) {
        case 1:
          this.panning(ptr.movement);
          this.render();
          break;
        case 2:
          this.touchZooming(
            this.pointerState[0].position,
            this.pointerState[1].position
          );
          this.render();
          break;
        default:
          break;
      }
      console.log(`pointer moved by (${ev.movementX}, ${ev.movementY})`);
    }
  };

  private handleWheel(ev: WheelEvent): void {
    // deltaY < 0 when pushing scroll wheel forward (zooming in)
    console.log(`wheel rolled (${ev.deltaX}, ${ev.deltaY}, ${ev.deltaZ})`);
    if (ev.deltaY !== 0 && !this.redraw) {
      const ptrCenter = complex(ev.clientX, ev.clientY);
      const [vpCenter] = this.convertFromScreenCoords([ptrCenter]);
      this.zoom = 1;
      this.wheelZooming(vpCenter, ev.deltaY < 0 ? Math.SQRT1_2 : Math.SQRT2);
      this.render();
    }
  }

  private handleMessage(ev: MessageEvent): void {
    const cntxt = this.context;
    if (cntxt != null) {
      cntxt.putImageData(ev.data[0], 0, 0);
    } else {
      console.log("Canvas 2D rendering context is null.");
    }
  }

  private panning(mv: Complex): void {
    const cntxt = this.canvas.getContext("2d", { alpha: false });

    if (cntxt == null) {
      return;
    }
    this.viewport.xmin -= mv.real / this.viewport.width;
    this.viewport.xmax -= mv.real / this.viewport.width;
    this.viewport.ymin -= mv.imag / this.viewport.height;
    this.viewport.ymax -= mv.imag / this.viewport.height;
    this.redraw = true;
  }

  private touchZooming(z1: Complex, z2: Complex): void {
    if (this.context == null) {
      return;
    }
    const centerX = (z1.real + z2.real) / 2;
    const centerY = (z1.imag + z2.imag) / 2;
    const dist = Math.sqrt(this.modulusSqr(complexMinus(z1, z2))) / 2;
    const zoom = this.zoom;

    if (zoom !== 0) {
      this.wheelZooming(complex(centerX, centerY), zoom / dist);
    }
    this.zoom = dist;
  }

  private wheelZooming(center: Complex, scale: number): void {
    const xmin = this.viewport.xmin;
    const xmax = this.viewport.xmax;
    const xrange = xmax - xmin;
    const xscale = xrange / this.viewport.width;
    const ymin = this.viewport.ymin;
    const ymax = this.viewport.ymax;
    const yrange = ymax - ymin;
    const yscale = yrange / this.viewport.height;
    const epsilon = Number.EPSILON * scale;
    if (xscale > epsilon && yscale > epsilon) {
      this.viewport.xmax = center.real + scale * (xmax - center.real);
      this.viewport.xmin = center.real + scale * (xmin - center.real);
      this.viewport.ymax = center.imag + scale * (ymax - center.imag);
      this.viewport.ymin = center.imag + scale * (ymin - center.imag);
      this.redraw = true;
      if (scale > 1) {
        console.log(
          `Zooming out by ${scale} at (${center.real}, ${
            center.imag
          }) from [${xmin}, ${xmax}]x[${ymin},${ymax}] to [${
            this.viewport.xmin
          }, ${this.viewport.xmax}]x[${this.viewport.ymin},${
            this.viewport.ymax
          }]`
        );
      } else {
        console.log(
          `Zooming in by ${scale} at (${center.real}, ${
            center.imag
          }) from [${xmin}, ${xmax}]x[${ymin},${ymax}] to [${
            this.viewport.xmin
          }, ${this.viewport.xmax}]x[${this.viewport.ymin},${
            this.viewport.ymax
          }]`
        );
      }
    }
    this.redraw = true;
  }

  private convertFromScreenCoords(zs: Complex[]): Complex[] {
    const xmin = this.viewport.xmin;
    const xmax = this.viewport.xmax;
    const xrange = xmax - xmin;
    const xscale = xrange / this.viewport.width;
    const ymin = this.viewport.ymin;
    const ymax = this.viewport.ymax;
    const yrange = ymax - ymin;
    const yscale = yrange / this.viewport.height;
    const len = zs.length;
    const arr = new Array<Complex>(len);

    for (let idx = 0; idx < len; idx++) {
      const z = zs[idx];
      arr[idx] = complex(xmin + z.real * xscale, ymin + z.imag * yscale);
    }
    return arr;
  }
}

let canvas = document.getElementById("mandelbrot") as HTMLCanvasElement;
if (canvas != null) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const mandelbrot = new MandelbrotApp(canvas);
}  
