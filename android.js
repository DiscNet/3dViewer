import React from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client?external=react";
import { Emulator } from "https://esm.sh/android-emulator-webrtc?external=react,react-dom";

const $ = (id) => document.getElementById(id);
const root = createRoot($("emulatorRoot"));
const emulatorRef = React.createRef();
let connected = false;
let selectedApk = null;
let toastTimer;

function toast(message) {
  const element = $("toast");
  element.textContent = message;
  element.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("visible"), 3500);
}

function normalizeUrl(value) {
  return value.trim().replace(/\/$/, "");
}

function setConnectionState(state, message = "") {
  connected = state === "connected";
  $("connectionStatus").textContent = connected ? "CONECTADO" : state === "connecting" ? "CONECTANDO" : "DESCONECTADO";
  $("liveIndicator").classList.toggle("connected", connected);
  $("deviceMessage").textContent = message || (connected ? "Emulador pronto para uso." : "Configure os endpoints para começar.");
  $("disconnectButton").disabled = !connected;
  document.querySelectorAll("[data-key]").forEach((button) => { button.disabled = !connected; });
  $("installButton").disabled = !connected || !selectedApk;
}

function renderEmulator() {
  const gateway = normalizeUrl($("gatewayUrl").value);
  root.render(React.createElement(Emulator, {
    key: gateway,
    ref: emulatorRef,
    uri: gateway,
    muted: false,
    volume: 1,
    onStateChange: (state) => setConnectionState(state),
    onError: (error) => {
      console.error(error);
      setConnectionState("disconnected", "Falha na conexão WebRTC.");
      toast("Não foi possível conectar ao emulador. Verifique o gateway.");
    }
  }));
}

$("connectButton").addEventListener("click", () => {
  const gateway = normalizeUrl($("gatewayUrl").value);
  const api = normalizeUrl($("apiUrl").value);
  if (!/^https?:\/\//i.test(gateway) || !/^https?:\/\//i.test(api)) {
    toast("Informe URLs HTTP(S) válidas para o gateway e a API.");
    return;
  }
  if (location.protocol === "https:" && gateway.startsWith("http://")) {
    toast("O gateway precisa usar HTTPS quando o site está em HTTPS.");
    return;
  }
  if (location.protocol === "https:" && api.startsWith("http://")) {
    toast("A API precisa usar HTTPS quando o site está em HTTPS.");
    return;
  }
  localStorage.setItem("androidGatewayUrl", gateway);
  localStorage.setItem("androidApiUrl", api);
  setConnectionState("connecting", "Negociando conexão WebRTC...");
  renderEmulator();
});

$("disconnectButton").addEventListener("click", () => {
  root.render(null);
  root.render(React.createElement("div", { className: "device-placeholder" },
    React.createElement("div", { className: "phone-outline" }, React.createElement("div"), React.createElement("span", null, "ANDROID")),
    React.createElement("h1", null, "Conexão encerrada."),
    React.createElement("p", null, "Conecte novamente para continuar.")
  ));
  setConnectionState("disconnected");
});

$("apkInput").addEventListener("change", (event) => {
  selectedApk = event.target.files?.[0] || null;
  if (selectedApk && !selectedApk.name.toLowerCase().endsWith(".apk")) {
    selectedApk = null;
    event.target.value = "";
    toast("Selecione um arquivo .apk válido.");
  }
  $("apkName").textContent = selectedApk ? selectedApk.name : "Selecionar arquivo APK";
  $("installButton").disabled = !connected || !selectedApk;
});

$("installButton").addEventListener("click", async () => {
  if (!selectedApk || !connected) return;
  const api = normalizeUrl($("apiUrl").value);
  const token = $("accessToken").value.trim();
  if (!token) {
    toast("Informe o token de acesso da API.");
    return;
  }
  if (selectedApk.size > 300 * 1024 * 1024) {
    toast("O APK excede o limite de 300 MB.");
    return;
  }

  const form = new FormData();
  form.append("file", selectedApk);
  const button = $("installButton");
  button.disabled = true;
  button.textContent = "Instalando...";
  try {
    const response = await fetch(api + "/api/apk/install", {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
      body: form
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.detail || "Falha ao instalar o APK.");
    toast(result.message || "APK instalado. Abra o aplicativo no Android.");
  } catch (error) {
    toast(error.message || "Erro ao enviar o APK.");
  } finally {
    button.textContent = "Instalar no emulador";
    button.disabled = !connected || !selectedApk;
  }
});

document.querySelectorAll("[data-key]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!emulatorRef?.current) {
      toast("O controle de hardware não está disponível nesta conexão.");
      return;
    }
    emulatorRef.current.sendKey(button.dataset.key);
  });
});

$("gatewayUrl").value = localStorage.getItem("androidGatewayUrl") || "";
$("apiUrl").value = localStorage.getItem("androidApiUrl") || "";
setConnectionState("disconnected");
