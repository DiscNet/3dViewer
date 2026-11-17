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
    sourceCanvas.width = 1600;
    sourceCanvas.height = 1000;

    const ctx = sourceCanvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D indisponível.");

    const background = ctx.createLinearGradient(0, 0, 1600, 1000);
    background.addColorStop(0, "#100b0c");
    background.addColorStop(0.48, "#302326");
    background.addColorStop(1, "#10090b");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 1600, 1000);

    const ambientLight = ctx.createRadialGradient(1280, 230, 0, 1280, 230, 760);
    ambientLight.addColorStop(0, "rgba(255,240,235,.62)");
    ambientLight.addColorStop(.28, "rgba(184,49,58,.22)");
    ambientLight.addColorStop(1, "rgba(58,8,19,0)");
    ctx.fillStyle = ambientLight;
    ctx.fillRect(0, 0, 1600, 1000);

    ctx.save();
    ctx.filter = "blur(42px)";
    ctx.fillStyle = "#030203";
    ctx.beginPath();
    ctx.ellipse(570, 520, 155, 390, -.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(600, 220, 145, 165, .06, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const sideLight = ctx.createLinearGradient(760, 0, 1600, 0);
    sideLight.addColorStop(0, "rgba(255,255,255,0)");
    sideLight.addColorStop(.65, "rgba(255,235,232,.08)");
    sideLight.addColorStop(1, "rgba(255,245,240,.2)");
    ctx.fillStyle = sideLight;
    ctx.fillRect(0, 0, 1600, 1000);

    const image = new Image();
    image.onload = () => {
      try {
        const uniforms = {
          u_image: image,
          u_colorBack: getShaderColorFromString("#00000000"),
          u_colorShadow: getShaderColorFromString("#16070b"),
          u_colorHighlight: getShaderColorFromString("#fff4f0"),
          u_shadows: 0.42,
          u_size: 0.72,
          u_angle: 0,
          u_distortion: 0.72,
          u_shift: 0,
          u_blur: 0.06,
          u_edges: 0.3,
          u_stretch: 0.08,
          u_distortionShape: 1,
          u_highlights: 0.24,
          u_shape: 1,
          u_marginLeft: 0,
          u_marginRight: 0,
          u_marginTop: 0,
          u_marginBottom: 0,
          u_grainMixer: 0.015,
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

        new ShaderMount(
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

        const canvas = mountElement.querySelector("canvas");
        if (!canvas) throw new Error("Paper Design não criou o canvas WebGL.");

        visuals.classList.add("paper-glass-ready");
      } catch (error) {
        visuals.classList.add("paper-glass-error");
        console.error("Falha ao inicializar Paper Design Fluted Glass:", error);
      }
    };

    image.onerror = () => {
      visuals.classList.add("paper-glass-error");
      console.error("Não foi possível carregar a textura do Fluted Glass.");
    };
    image.src = sourceCanvas.toDataURL("image/png");
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
