// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles

// eslint-disable-next-line no-global-assign
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  for (var i = 0; i < entry.length; i++) {
    newRequire(entry[i]);
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  return newRequire;
})({"HSUn":[function(require,module,exports) {
"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

onmessage = function onmessage(evt) {
  var points = evt.data[0];

  var _evt$data$ = _slicedToArray(evt.data[1], 2),
      maxIters = _evt$data$[0],
      escapeR = _evt$data$[1];

  var imgData = evt.data[2];
  var newImgData = mandelbrot(points, maxIters, escapeR, imgData);
  postMessage([newImgData]);
};

function mandelbrot(points, maxIters, escapeR, imgData) {
  var _points = _slicedToArray(points, 2),
      reals = _points[0],
      imags = _points[1];

  var numPoints = reals.length;
  var iterations = new Float32Array(numPoints);
  var iterHistogram = new Array(maxIters);
  var rSqr = escapeR * escapeR;
  var logR = Math.log(escapeR);
  iterHistogram.fill(0);

  for (var pntIdx = 0; pntIdx < numPoints; pntIdx++) {
    var _ref = [reals[pntIdx], imags[pntIdx]],
        creal = _ref[0],
        cimag = _ref[1];
    var zreal = creal,
        zimag = cimag;
    var iter = 1;

    while (iter < maxIters && zreal * zreal + zimag * zimag < rSqr) {
      var _ref2 = [zreal * zreal - zimag * zimag + creal, 2 * zreal * zimag + cimag];
      zreal = _ref2[0];
      zimag = _ref2[1];
      iter++;
    }

    var modulus = Math.sqrt(zreal * zreal + zimag * zimag);

    if (iter < maxIters) {
      var nu = Math.log2(Math.log(modulus) / logR);
      iterations[pntIdx] = iter + 1 - nu;
    } else {
      iterations[pntIdx] = maxIters;
    }

    iterHistogram[iter - 1]++;
  }

  var sum = 0;

  for (var iterIdx = 0; iterIdx < maxIters; iterIdx++) {
    sum += iterHistogram[iterIdx];
    iterHistogram[iterIdx] = sum;
  }

  iterHistogram = iterHistogram.map(function (x) {
    return x / sum;
  });

  for (var _pntIdx = 0; _pntIdx < numPoints; _pntIdx++) {
    var _iter = iterations[_pntIdx];
    var color = {
      red: 0,
      green: 0,
      blue: 0
    };

    if (_iter < maxIters) {
      var histIdx = Math.floor(_iter);
      var color1 = assignColor(iterHistogram[histIdx]);
      var color2 = assignColor(iterHistogram[histIdx + 1]);
      color = linearInterpolate(color1, color2, _iter % 1);
    }

    var imgIdx = 4 * _pntIdx;
    imgData.data[imgIdx] = Math.floor(color.red);
    imgData.data[imgIdx + 1] = Math.floor(color.green);
    imgData.data[imgIdx + 2] = Math.floor(color.blue);
    imgData.data[imgIdx + 3] = 255;
  }

  return imgData;
}

function assignColor(c) {
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

function HSVtoRGB(h, s, v) {
  var c = v * s;
  var x = c * (1 - Math.abs(h / 60 % 2 - 1));
  var m = v - c;
  var r = 0;
  var g = 0;
  var b = 0;

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

function linearInterpolate(x, y, alpha) {
  var z = x;

  for (var key in y) {
    if (y.hasOwnProperty(key)) {
      z[key] = (1 - alpha) * z[key] + alpha * y[key];
    }
  }

  return z;
}
},{}]},{},["HSUn"], null)
//# sourceMappingURL=mandelbrotWorker.8aeddb4c.map