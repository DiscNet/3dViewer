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

      const base = ctx.createRadialGradient(w * 0.58, h * 0.46, 20, w * 0.58, h * 0.46, w * 0.78);
      base.addColorStop(0, "#6c141c");
      base.addColorStop(0.42, "#3a0813");
      base.addColorStop(1, "#080306");
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);

      const drawGlow = (x, y, radius, color, coreColor = "rgba(255,255,255,0.92)") => {
        const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
        glow.addColorStop(0, coreColor);
        glow.addColorStop(0.1, color);
        glow.addColorStop(0.42, color.replace(/,\s*[\d.]+\)$/, ",0.28)"));
        glow.addColorStop(1, "rgba(58,8,19,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);
      };

      const lights = [
        {
          x: w * (0.27 + Math.sin(t * 0.72) * 0.13),
          y: h * (0.43 + Math.cos(t * 0.86) * 0.17),
          radius: 300,
          color: "rgba(184,49,58,0.92)",
          core: "rgba(255,247,245,0.98)"
        },
        {
          x: w * (0.72 + Math.cos(t * 0.58) * 0.12),
          y: h * (0.57 + Math.sin(t * 0.74) * 0.18),
          radius: 360,
          color: "rgba(140,21,27,0.96)",
          core: "rgba(255,229,226,0.94)"
        },
        {
          x: w * (0.52 + Math.sin(t * 0.46 + 1.8) * 0.2),
          y: h * (0.22 + Math.cos(t * 0.62 + 1.8) * 0.12),
          radius: 245,
          color: "rgba(108,20,28,0.88)",
          core: "rgba(255,239,236,0.88)"
        }
      ];

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (const light of lights) {
        drawGlow(light.x, light.y, light.radius, light.color, light.core);

        const orbit = 42;
        const satelliteX = light.x + Math.cos(t * 1.1) * orbit;
        const satelliteY = light.y + Math.sin(t * 1.1) * orbit * 0.6;
        drawGlow(
          satelliteX,
          satelliteY,
          105,
          "rgba(184,49,58,0.62)",
          "rgba(255,255,255,0.96)"
        );
      }
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.filter = "blur(54px)";
      for (let i = 0; i < 4; i++) {
        const phase = t * 0.7 + i * 1.7;
        const x = w * (0.16 + i * 0.22) + Math.sin(phase) * 125;
        const y = h * (0.52 + Math.cos(phase * 0.8) * 0.28);
        const radiusX = 205 + Math.sin(phase) * 48;
        const radiusY = 118 + Math.cos(phase * 0.7) * 30;
        const fluid = ctx.createRadialGradient(x, y, 0, x, y, radiusX);
        fluid.addColorStop(0, i % 2
          ? "rgba(184,49,58,0.54)"
          : "rgba(255,224,222,0.42)");
        fluid.addColorStop(0.5, "rgba(140,21,27,0.3)");
        fluid.addColorStop(1, "rgba(58,8,19,0)");
        ctx.fillStyle = fluid;
        ctx.beginPath();
        ctx.ellipse(x, y, radiusX, radiusY, Math.sin(phase) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      const silhouette = ctx.createRadialGradient(w * 0.34, h * 0.5, 20, w * 0.34, h * 0.5, 300);
      silhouette.addColorStop(0, "rgba(2,1,2,0.78)");
      silhouette.addColorStop(0.48, "rgba(5,2,4,0.48)");
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
