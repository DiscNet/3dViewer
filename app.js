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
