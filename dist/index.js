"use strict";
function complex(re, imag) {
    return { real: re, imag: imag };
}
function complexPlus(x, y) {
    return complex(x.real + y.real, x.imag + y.imag);
}
function complexMinus(x, y) {
    return complex(x.real - y.real, x.imag - y.imag);
}
function complexSquare(x) {
    return complex(x.real * x.real - x.imag * x.imag, 2 * x.real * x.imag);
}
function convertPointerEvent(ev) {
    return {
        pointerId: ev.pointerId,
        movement: complex(ev.movementX, ev.movementY),
        position: complex(ev.clientX, ev.clientY)
    };
}
class MandelbrotApp {
    constructor(canvasElt) {
        this.viewport = { width: 0, height: 0, xmin: -3, xmax: 2, ymin: -2.5, ymax: 2.5 };
        this.escapeRadius = 10;
        this.maxIterations = 85;
        this.context = null;
        this.imageData = null;
        this.pointerState = new Array();
        this.pan = complex(0, 0);
        this.zoom = 0.0;
        this.redraw = false;
        this.worker = new Worker("mandelbrotWorker.js");
        this.handlePointerDown = (ev) => {
            const that = this;
            that.pointerState.push(convertPointerEvent(ev));
            if (that.redraw && that.pointerState.length > 1) {
                that.render();
            }
            console.groupCollapsed(`Pointer down at (${ev.clientX}, ${ev.clientY})`);
            console.log(`tracking ${that.pointerState.length} pointer events`);
        };
        this.handlePointerUp = (ev) => {
            const that = this;
            that.pointerState = that.pointerState.filter((x) => x.pointerId !== ev.pointerId);
            if (that.redraw) {
                that.render();
                that.zoom = 0;
            }
            console.log(`tracking ${that.pointerState.length} pointer events`);
            console.log(`Pointer up at (${ev.clientX}, ${ev.clientY})`);
            console.groupEnd();
        };
        this.handlePointerEnter = (ev) => {
            const that = this;
            that.canvas.addEventListener("wheel", (ev) => that.handleWheel(ev));
            console.groupCollapsed(`Pointer entered at (${ev.clientX}, ${ev.clientY})`);
            console.log(`tracking ${that.pointerState.length} pointer events`);
        };
        this.handlePointerLeave = (ev) => {
            const that = this;
            that.canvas.removeEventListener("wheel", (ev) => that.handleWheel(ev));
            console.log(`tracking ${that.pointerState.length} pointer events`);
            console.log(`Pointer left at (${ev.clientX}, ${ev.clientY})`);
            console.groupEnd();
        };
        this.handlePointerMove = (ev) => {
            const that = this;
            const ptrIdx = that.pointerState.findIndex((x) => x.pointerId === ev.pointerId);
            if (ptrIdx >= 0 && !that.redraw) {
                const ptr = that.pointerState[ptrIdx];
                ptr.movement = complexPlus(ptr.movement, complex(ev.movementX, ev.movementY));
                ptr.position = complex(ev.clientX, ev.clientY);
                switch (that.pointerState.length) {
                    case 1:
                        that.panning(ptr.movement);
                        that.render();
                        break;
                    case 2:
                        that.touchZooming(that.pointerState[0].position, that.pointerState[1].position);
                        that.render();
                        break;
                    default:
                        break;
                }
                console.log(`pointer moved by (${ev.movementX}, ${ev.movementY})`);
            }
        };
        this.canvas = canvasElt;
        this.viewport.width = this.canvas.width;
        this.viewport.height = this.canvas.height;
        let cntxt = this.canvas.getContext("2d", { alpha: false });
        if (cntxt == null) {
            console.log("Could not create a 2D rendering context from the canvas.");
            return;
        }
        this.context = cntxt;
        this.imageData = this.context.getImageData(0, 0, this.viewport.width, this.viewport.height);
        const that = this;
        this.canvas.addEventListener("pointerenter", (ev) => that.handlePointerEnter(ev));
        this.canvas.addEventListener("pointerleave", (ev) => that.handlePointerLeave(ev));
        this.canvas.addEventListener("pointerdown", (ev) => that.handlePointerDown(ev));
        document.addEventListener("pointerup", (ev) => that.handlePointerUp(ev));
        document.addEventListener("pointermove", (ev) => that.handlePointerMove(ev));
        this.worker.addEventListener("message", (ev) => that.handleMessage(ev));
        this.render();
    }
    modulusSqr(z) {
        return (z.real * z.real + z.imag * z.imag);
    }
    render() {
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
        this.worker.postMessage([[reals, imags],
            [this.maxIterations, this.escapeRadius],
            this.imageData]);
        this.zoom = 0;
        this.redraw = false;
    }
    handleWheel(ev) {
        // deltaY < 0 when pushing scroll wheel forward (zooming in)
        const that = this;
        console.log(`wheel rolled (${ev.deltaX}, ${ev.deltaY}, ${ev.deltaZ})`);
        if (ev.deltaY !== 0 && !that.redraw) {
            const ptrCenter = complex(ev.clientX, ev.clientY);
            const [vpCenter] = this.convertFromScreenCoords([ptrCenter]);
            that.zoom = 1;
            that.wheelZooming(vpCenter, ev.deltaY < 0 ? Math.SQRT1_2 : Math.SQRT2);
            that.render();
        }
    }
    handleMessage(ev) {
        const that = this;
        const cntxt = that.context;
        if (cntxt != null) {
            cntxt.putImageData(ev.data[0], 0, 0);
        }
        else {
            console.log("Canvas 2D rendering context is null.");
        }
    }
    panning(mv) {
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
    touchZooming(z1, z2) {
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
    wheelZooming(center, scale) {
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
                console.log(`Zooming out by ${scale} at (${center.real}, ${center.imag}) from [${xmin}, ${xmax}]x[${ymin},${ymax}] to [${this.viewport.xmin}, ${this.viewport.xmax}]x[${this.viewport.ymin},${this.viewport.ymax}]`);
            }
            else {
                console.log(`Zooming in by ${scale} at (${center.real}, ${center.imag}) from [${xmin}, ${xmax}]x[${ymin},${ymax}] to [${this.viewport.xmin}, ${this.viewport.xmax}]x[${this.viewport.ymin},${this.viewport.ymax}]`);
            }
        }
        this.redraw = true;
    }
    convertFromScreenCoords(zs) {
        const xmin = this.viewport.xmin;
        const xmax = this.viewport.xmax;
        const xrange = xmax - xmin;
        const xscale = xrange / this.viewport.width;
        const ymin = this.viewport.ymin;
        const ymax = this.viewport.ymax;
        const yrange = ymax - ymin;
        const yscale = yrange / this.viewport.height;
        const len = zs.length;
        const arr = new Array(len);
        for (let idx = 0; idx < len; idx++) {
            const z = zs[idx];
            arr[idx] = complex(xmin + z.real * xscale, ymin + z.imag * yscale);
        }
        return arr;
    }
}
//# sourceMappingURL=index.js.map