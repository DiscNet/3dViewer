function initFlutedGlass() {
  const canvas = document.querySelector("#flutedGlassCanvas");
  if (!canvas) return;

  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance"
  });
  if (!gl) return;

  const vertexSource = `
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
      vUv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const fragmentSource = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D scene;
    uniform vec2 resolution;
    uniform float grooveSize;
    uniform float refractionPower;

    const float PI = 3.14159265359;

    void main() {
      vec2 uv = vUv;
      float aspect = resolution.x / resolution.y;
      vec2 centered = uv - 0.5;
      float angle = radians(0.0);
      float axis = (centered.x * cos(angle) + centered.y * sin(angle)) * aspect;
      float phase = axis * grooveSize * 2.0 * PI;
      float rib = sin(phase);
      float curvature = cos(phase);

      float displacement = rib * refractionPower;
      vec2 refracted = uv;
      refracted.x += displacement / max(aspect, 0.1);
      refracted.y += curvature * refractionPower * 0.12;
      refracted = (refracted - 0.5) / 1.12 + 0.5;
      refracted = clamp(refracted, 0.001, 0.999);

      vec4 color = texture2D(scene, refracted);
      float edgeLight = pow(max(curvature, 0.0), 9.0);
      float edgeShade = pow(max(-curvature, 0.0), 2.0);
      float verticalFalloff = smoothstep(0.0, 0.08, uv.y) * (1.0 - smoothstep(0.9, 1.0, uv.y));

      color.rgb *= 1.0 - edgeShade * 0.24;
      color.rgb += vec3(0.82, 0.72, 0.70) * edgeLight * 0.23;
      color.rgb += vec3(0.12, 0.015, 0.025) * edgeShade * 0.08;
      color.rgb *= 0.92 + verticalFalloff * 0.08;

      float vignette = smoothstep(0.0, 0.18, uv.x) * (1.0 - smoothstep(0.82, 1.0, uv.x));
      color.rgb *= 0.84 + vignette * 0.16;
      gl_FragColor = vec4(color.rgb, 1.0);
    }
  `;

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      throw new Error("Falha ao compilar shader de vidro.");
    }
    return shader;
  }

  try {
    const program = gl.createProgram();
    gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error("Falha ao vincular shader de vidro.");
    }

    const vertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);

    gl.useProgram(program);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const sourceCanvas = document.createElement("canvas");
    const sourceContext = sourceCanvas.getContext("2d", { alpha: false });
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const resolutionLocation = gl.getUniformLocation(program, "resolution");
    const sizeLocation = gl.getUniformLocation(program, "grooveSize");
    const powerLocation = gl.getUniformLocation(program, "refractionPower");
    gl.uniform1i(gl.getUniformLocation(program, "scene"), 0);
    gl.uniform1f(sizeLocation, 34.0);
    gl.uniform1f(powerLocation, 0.018);

    function render() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        sourceCanvas.width = width;
        sourceCanvas.height = height;
      }

      const ctx = sourceContext;
      const w = width;
      const h = height;
      const background = ctx.createLinearGradient(0, 0, w, h);
      background.addColorStop(0, "#16070b");
      background.addColorStop(0.52, "#3a1018");
      background.addColorStop(1, "#17070b");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, w, h);

      const glow = ctx.createRadialGradient(w * 0.82, h * 0.24, 0, w * 0.82, h * 0.24, w * 0.58);
      glow.addColorStop(0, "rgba(255,226,224,0.7)");
      glow.addColorStop(0.24, "rgba(184,49,58,0.2)");
      glow.addColorStop(1, "rgba(58,8,19,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.filter = `blur(${Math.max(18, w * 0.025)}px)`;
      ctx.fillStyle = "#030203";
      ctx.beginPath();
      ctx.ellipse(w * 0.35, h * 0.49, w * 0.105, h * 0.39, -0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(w * 0.39, h * 0.26, w * 0.13, h * 0.14, 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const sideLight = ctx.createLinearGradient(w * 0.58, 0, w, 0);
      sideLight.addColorStop(0, "rgba(255,255,255,0)");
      sideLight.addColorStop(0.7, "rgba(255,232,230,0.12)");
      sideLight.addColorStop(1, "rgba(255,255,255,0.2)");
      ctx.fillStyle = sideLight;
      ctx.fillRect(0, 0, w, h);

      gl.viewport(0, 0, width, height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
      gl.uniform2f(resolutionLocation, width, height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    render();
  } catch (error) {
    console.error("Fluted glass:", error);
  }
}

initFlutedGlass();

const API_BASE = "https://api.frankfurter.dev/v2";
const amountInput = document.querySelector("#amount");
const resultOutput = document.querySelector("#result");
const rateText = document.querySelector("#rateText");
const rateDate = document.querySelector("#rateDate");
const rateStatus = document.querySelector("#rateStatus");
const refreshButton = document.querySelector("#refreshButton");
const swapButton = document.querySelector("#swapButton");

const currencies = {
  USD: { name: "Dólar americano", flag: "US" },
  BRL: { name: "Real brasileiro", flag: "BR" }
};

let baseCurrency = "USD";
let quoteCurrency = "BRL";
let currentRate = null;
let currentRateDate = null;

function parseAmount(value) {
  const normalized = value.trim().replace(/\s/g, "");
  if (!normalized) return 0;

  const parsed = normalized.includes(",")
    ? Number(normalized.replace(/\./g, "").replace(",", "."))
    : Number(normalized);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function formatCurrency(value, currency) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(value);
}

function updateResult() {
  const amount = parseAmount(amountInput.value);

  if (amount === null) {
    resultOutput.textContent = "Valor inválido";
    return;
  }

  if (currentRate === null) {
    resultOutput.textContent = "—";
    return;
  }

  resultOutput.textContent = formatCurrency(amount * currentRate, quoteCurrency);
}

function updateCurrencyLabels() {
  document.querySelector("#baseCode").textContent = baseCurrency;
  document.querySelector("#quoteCode").textContent = quoteCurrency;
  document.querySelector("#quoteName").textContent = currencies[quoteCurrency].name;
  document.querySelector("#quoteFlag").textContent = currencies[quoteCurrency].flag;
  document.querySelector("#amount").setAttribute("aria-label", `Valor em ${currencies[baseCurrency].name}`);
}

function setStatus(message, state = "") {
  rateStatus.className = `rate-status ${state}`;
  rateStatus.lastChild.textContent = message;
}

async function loadRate() {
  refreshButton.disabled = true;
  refreshButton.classList.add("loading");
  setStatus("Consultando fonte de referência");

  try {
    const response = await fetch(`${API_BASE}/rate/${baseCurrency.toLowerCase()}/${quoteCurrency.toLowerCase()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });

    if (!response.ok) throw new Error("A cotação não está disponível no momento.");

    const data = await response.json();
    if (!Number.isFinite(data.rate) || data.rate <= 0) {
      throw new Error("A fonte retornou uma cotação inválida.");
    }

    currentRate = data.rate;
    currentRateDate = data.date;
    rateText.textContent = `1 ${baseCurrency} = ${formatCurrency(currentRate, quoteCurrency)}`;
    rateDate.textContent = `Referência: ${new Intl.DateTimeFormat("pt-BR").format(new Date(`${currentRateDate}T12:00:00`))}`;
    setStatus("Cotação carregada com sucesso", "success");
    updateResult();
  } catch (error) {
    currentRate = null;
    currentRateDate = null;
    rateText.textContent = "Não foi possível obter a cotação";
    rateDate.textContent = "";
    resultOutput.textContent = "Indisponível";
    setStatus(error.message || "Erro ao consultar a cotação", "error");
  } finally {
    refreshButton.disabled = false;
    refreshButton.classList.remove("loading");
  }
}

amountInput.addEventListener("input", updateResult);
refreshButton.addEventListener("click", loadRate);

swapButton.addEventListener("click", () => {
  [baseCurrency, quoteCurrency] = [quoteCurrency, baseCurrency];
  updateCurrencyLabels();
  loadRate();
});

document.querySelectorAll(".quick-value").forEach((button) => {
  button.addEventListener("click", () => {
    amountInput.value = button.dataset.amount;
    updateResult();
    amountInput.focus();
  });
});

document.querySelector("#year").textContent = new Date().getFullYear();
updateCurrencyLabels();
loadRate();
