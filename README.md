# fshader-widget

A `<shader-widget>` custom element. The widget shows a GLSL fragment shader editor next to a live
WebGL canvas. The canvas recompiles the shader on each edit.

The editor uses [CodeJar](https://github.com/antonmedv/codejar) with line numbers and
[Prism](https://prismjs.com/) highlighting. The element renders in a shadow root, so page styles do
not affect it.

## Install

```sh
npm install
```

## Build

```sh
npx webpack
```

Webpack writes an ES module to `dist/main.js`. The CSS is inlined in the bundle.

## Usage

Load the bundle as a module. Put the shader source in the element content.

```html
<shader-widget canvas-width="320" canvas-height="320">
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0, 2, 4));
    fragColor = vec4(col, 1.0);
}
</shader-widget>

<script type="module" src="./main.js"></script>
```

`dist/index.html` is a demo page. Serve the `dist` folder over HTTP to open it:

```sh
npx http-server dist
```

## Attributes

| Attribute       | Default | Description                  |
| --------------- | ------- | ---------------------------- |
| `canvas-width`  | `320`   | Canvas width in pixels.      |
| `canvas-height` | `320`   | Canvas height in pixels.     |

Both values are pixel counts. The element reads them one time, when it connects to the document.

## Methods

| Method          | Description                                     |
| --------------- | ----------------------------------------------- |
| `getCode()`     | Returns the current editor text.                |
| `setCode(code)` | Replaces the editor text and recompiles.        |

```js
const widget = document.querySelector('shader-widget');
widget.setCode(source);
```

## Shader contract

Write one function with this signature:

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord)
```

The widget adds the vertex shader, the `precision mediump float` line, and the `main` function.
Two uniforms are available:

| Uniform       | Type    | Value                                          |
| ------------- | ------- | ---------------------------------------------- |
| `iResolution` | `vec3`  | Canvas width, canvas height, `0.0`.            |
| `iTime`       | `float` | Seconds since the last successful compilation. |

The names match Shadertoy, so many Shadertoy shaders run without a change.

## Errors

A compilation error or a link error does not stop the page. The widget writes the driver log to the
console and keeps the last good frame on the canvas.

## Requirements

A browser with WebGL 1 and custom elements. The widget reports a console error if the canvas gives
no WebGL context.

## Theme

`src/styles.css` follows `prefers-color-scheme`. The editor uses a dark palette in dark mode and a
light palette in light mode.

## License

MIT. See [LICENSE](LICENSE).
