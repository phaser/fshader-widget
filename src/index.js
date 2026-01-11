import { CodeJar } from "codejar";
import { withLineNumbers } from "codejar-linenumbers";
import Prism from "prismjs";
import "prismjs/components/prism-clike";
import styles from "./styles.css";

class ShaderWidget extends HTMLElement {
  static get observedAttributes() {
    return ['width', 'height'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._animationId = null;
  }

  connectedCallback() {
    const width = parseInt(this.getAttribute('width')) || 320;
    const height = parseInt(this.getAttribute('height')) || 320;
    
    // Get initial code from element content
    const initialCode = this.textContent.trim();
    this.textContent = ''; // Clear original content

    // Build shadow DOM
    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="editor-container">
        <div><div class="editor-canvas" data-manual data-gramm="false"></div></div>
        <div><canvas class="shader-canvas" width="${width}" height="${height}"></canvas></div>
      </div>
    `;

    const editor = this.shadowRoot.querySelector('.editor-canvas');
    const canvas = this.shadowRoot.querySelector('.shader-canvas');

    // Set up syntax highlighting
    const highlight = (el) => {
      el.innerHTML = Prism.highlight(el.textContent, Prism.languages.clike, 'clike');
    };

    // Initialize CodeJar
    this._jar = CodeJar(editor, withLineNumbers(highlight), {
      tab: '    ',
    });

    this._canvas = canvas;

    // Handle code updates
    this._jar.onUpdate(code => {
      this._stopAnimation();
      try {
        this._renderShader(code, canvas);
      } catch (err) {
        console.error('Shader compilation error:', err.message);
      }
    });

    // Set initial code
    if (initialCode) {
      this._jar.updateCode(initialCode);
    }
  }

  disconnectedCallback() {
    this._stopAnimation();
  }

  _stopAnimation() {
    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }
  }

  _renderShader(program, canvas) {
    const gl = canvas.getContext("webgl");

    if (!gl) {
      console.error("Failed to get WebGL context");
      return;
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const vsSource = `
      attribute vec4 aVertexPosition;
      varying vec4 vVertexPosition;
      void main() {
        vVertexPosition = aVertexPosition;
        gl_Position = aVertexPosition;
      }
    `;

    const fsSource = `
      precision mediump float;
      varying vec4 vVertexPosition;
      uniform vec3 iResolution;
      uniform float iTime;

      ${program}

      void main() {
        vec2 fragCoord = (vVertexPosition.xy * 0.5 + 0.5) * iResolution.xy;
        mainImage(gl_FragColor, fragCoord);
      }
    `;

    const shaderProgram = this._initShaderProgram(gl, vsSource, fsSource);

    const programInfo = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
      },
      uniformLocations: {
        iResolution: gl.getUniformLocation(shaderProgram, "iResolution"),
        iTime: gl.getUniformLocation(shaderProgram, "iTime"),
      }
    };

    const positions = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
       1.0,  1.0,
      -1.0, -1.0,
       1.0,  1.0,
      -1.0,  1.0
    ]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    {
      const numComponents = 2;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        numComponents, type, normalize, stride, offset
      );
      gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    }

    gl.useProgram(shaderProgram);
    gl.uniform3f(programInfo.uniformLocations.iResolution, canvas.width, canvas.height, 0.0);

    const startTime = performance.now();

    const render = () => {
      const elapsedTime = (performance.now() - startTime) / 1000.0;
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniform1f(programInfo.uniformLocations.iTime, elapsedTime);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      this._animationId = requestAnimationFrame(render);
    };

    render();
  }

  _initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = this._loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this._loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      throw new Error(`Unable to initialize shader program: ${gl.getProgramInfoLog(shaderProgram)}`);
    }

    return shaderProgram;
  }

  _loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compilation error: ${error}`);
    }

    return shader;
  }

  // Public API
  getCode() {
    return this._jar?.toString() || '';
  }

  setCode(code) {
    this._jar?.updateCode(code);
  }
}

customElements.define('shader-widget', ShaderWidget);

export { ShaderWidget };
