async function initFlutedGlass() {
  const mountElement = document.querySelector("#paperGlassMount");
  const visuals = mountElement?.parentElement;
  if (!mountElement || !visuals) return;

  visuals.classList.remove("paper-glass-ready", "paper-glass-error");

  try {
    const {
      ShaderMount,
      flutedGlassFragmentShader,
      getShaderColorFromString
    } = await import("https://esm.sh/@paper-design/shaders@0.0.82?bundle");

    if (!("WebGL2RenderingContext" in window)) {
      throw new Error("Este navegador não oferece suporte a WebGL2.");
    }

    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = 1000;
    sourceCanvas.height = 625;

    const ctx = sourceCanvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D indisponível.");

    const drawFluidBackground = (time) => {
      const t = time * 0.00016;
      const w = sourceCanvas.width;
      const h = sourceCanvas.height;

      const base = ctx.createLinearGradient(0, 0, w, h);
      base.addColorStop(0, "#10070b");
      base.addColorStop(0.48, "#3a0813");
      base.addColorStop(1, "#16070c");
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);

      const drawGlow = (x, y, radius, color) => {
        const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
        glow.addColorStop(0, color);
        glow.addColorStop(1, "rgba(58,8,19,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);
      };

      drawGlow(
        w * (0.72 + Math.sin(t * 0.8) * 0.13),
        h * (0.28 + Math.cos(t) * 0.12),
        430,
        "rgba(255,218,218,0.72)"
      );
      drawGlow(
        w * (0.38 + Math.cos(t * 0.65) * 0.17),
        h * (0.72 + Math.sin(t * 0.9) * 0.12),
        390,
        "rgba(184,49,58,0.82)"
      );
      drawGlow(
        w * (0.86 + Math.sin(t * 0.55) * 0.08),
        h * (0.78 + Math.cos(t * 0.7) * 0.1),
        300,
        "rgba(255,244,240,0.52)"
      );

      drawGlow(
        w * (0.58 + Math.cos(t * 0.72) * 0.16),
        h * (0.48 + Math.sin(t * 0.82) * 0.2),
        245,
        "rgba(255,112,124,0.42)"
      );
      drawGlow(
        w * (0.94 + Math.sin(t * 0.48) * 0.04),
        h * (0.42 + Math.cos(t * 0.62) * 0.16),
        210,
        "rgba(255,230,226,0.48)"
      );

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.filter = "blur(42px)";

      for (let i = 0; i < 4; i++) {
        const phase = t + i * 1.7;
        const x = w * (0.2 + i * 0.2) + Math.sin(phase * 0.8) * 135;
        const y = h * (0.5 + Math.cos(phase * 0.65) * 0.28);
        const radiusX = 190 + Math.sin(phase) * 55;
        const radiusY = 105 + Math.cos(phase * 0.7) * 35;

        const fluid = ctx.createRadialGradient(x, y, 0, x, y, radiusX);
        fluid.addColorStop(0, i % 2
          ? "rgba(224,72,88,0.68)"
          : "rgba(255,224,222,0.62)");
        fluid.addColorStop(0.5, "rgba(140,21,27,0.34)");
        fluid.addColorStop(1, "rgba(58,8,19,0)");
        ctx.fillStyle = fluid;
        ctx.beginPath();
        ctx.ellipse(x, y, radiusX, radiusY, Math.sin(phase) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      const silhouette = ctx.createRadialGradient(w * 0.34, h * 0.5, 20, w * 0.34, h * 0.5, 300);
      silhouette.addColorStop(0, "rgba(2,1,2,0.92)");
      silhouette.addColorStop(0.48, "rgba(5,2,4,0.62)");
      silhouette.addColorStop(1, "rgba(5,2,4,0)");
      ctx.fillStyle = silhouette;
      ctx.fillRect(0, 0, w, h);

      const specular = ctx.createLinearGradient(w * 0.48, 0, w, 0);
      specular.addColorStop(0, "rgba(255,255,255,0)");
      specular.addColorStop(0.48, "rgba(255,220,220,0.1)");
      specular.addColorStop(0.72, "rgba(255,238,236,0.22)");
      specular.addColorStop(0.88, "rgba(255,250,248,0.48)");
      specular.addColorStop(1, "rgba(255,255,255,0.16)");
      ctx.fillStyle = specular;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.filter = "blur(24px)";
      const rimGlow = ctx.createRadialGradient(w * 0.82, h * 0.5, 8, w * 0.82, h * 0.5, 250);
      rimGlow.addColorStop(0, "rgba(255,238,236,0.42)");
      rimGlow.addColorStop(0.38, "rgba(184,49,58,0.24)");
      rimGlow.addColorStop(1, "rgba(184,49,58,0)");
      ctx.fillStyle = rimGlow;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    };

    const createFrameImage = (time, onLoad) => {
      drawFluidBackground(time);
      const frameImage = new Image();
      frameImage.onload = () => onLoad(frameImage);
      frameImage.onerror = () => console.error("Falha ao atualizar a textura fluida do vidro.");
      frameImage.src = sourceCanvas.toDataURL("image/jpeg", 0.88);
    };

    createFrameImage(performance.now(), (initialImage) => {
      try {
        const uniforms = {
          u_image: initialImage,
          u_colorBack: getShaderColorFromString("#00000000"),
          u_colorShadow: getShaderColorFromString("#16070b"),
          u_colorHighlight: getShaderColorFromString("#fffaf8"),
          u_shadows: 0.38,
          u_size: 0.72,
          u_angle: 0,
          u_distortion: 0.78,
          u_shift: 0,
          u_blur: 0.035,
          u_edges: 0.38,
          u_stretch: 0.08,
          u_distortionShape: 1,
          u_highlights: 0.7,
          u_shape: 1,
          u_marginLeft: 0,
          u_marginRight: 0,
          u_marginTop: 0,
          u_marginBottom: 0,
          u_grainMixer: 0.012,
          u_grainOverlay: 0.025,
          u_fit: 2,
          u_scale: 1,
          u_rotation: 0,
          u_offsetX: 0,
          u_offsetY: 0,
          u_originX: 0.5,
          u_originY: 0.5,
          u_worldWidth: 0,
          u_worldHeight: 0
        };

        const shaderMount = new ShaderMount(
          mountElement,
          flutedGlassFragmentShader,
          uniforms,
          { alpha: false, antialias: true, powerPreference: "high-performance" },
          0,
          0,
          1.5,
          3200000,
          ["u_image"]
        );

        if (!mountElement.querySelector("canvas")) {
          throw new Error("Paper Design não criou o canvas WebGL.");
        }

        visuals.classList.add("paper-glass-ready");

        let lastFrame = 0;
        let framePending = false;
        const animateFluid = (time) => {
          requestAnimationFrame(animateFluid);
          if (document.hidden || framePending || time - lastFrame < 120) return;

          lastFrame = time;
          framePending = true;
          createFrameImage(time, (nextImage) => {
            shaderMount.setUniforms({ u_image: nextImage });
            framePending = false;
          });
        };

        requestAnimationFrame(animateFluid);
      } catch (error) {
        visuals.classList.add("paper-glass-error");
        console.error("Falha ao inicializar Paper Design Fluted Glass:", error);
      }
    });
  } catch (error) {
    visuals.classList.add("paper-glass-error");
    console.error("Paper Design Fluted Glass indisponível:", error);
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
