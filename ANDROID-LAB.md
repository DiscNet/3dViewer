# Android Lab

The Android Lab is a separate page at `/android.html`. It streams a remote Android Emulator into the browser with WebRTC and installs APK files through a small authenticated API.

## Architecture

- GitHub Pages: static interface (`android.html`, `android.css`, `android.js`).
- Android Emulator: Google Android Emulator container, requiring Linux and KVM.
- Emulator Gateway: Google WebRTC gateway, responsible for signaling and media/input forwarding.
- APK API: FastAPI service in `android-api/`, which transfers APK files to the emulator using ADB.

Railway is not the recommended host for the emulator: its container runtime does not currently provide nested virtualization/KVM. Use a Linux VPS or cloud VM that explicitly exposes `/dev/kvm` and supports nested virtualization. The Google container project documents the requirements and supported cloud VM families:
- https://github.com/google/android-emulator-container-scripts
- https://github.com/google/android-emulator-container-scripts/blob/master/gateway/DEMO.md
- https://github.com/google/android-emulator-webrtc

## VPS requirements

- Linux (Ubuntu or Debian recommended).
- Docker Engine and Docker Compose.
- KVM exposed as `/dev/kvm`.
- A VM plan with nested virtualization enabled.
- Public HTTPS endpoints for the WebRTC gateway and APK API.
- TCP/UDP networking suitable for WebRTC. Configure firewall rules according to the gateway deployment and TURN requirements.

A low-cost shared/container-only host is not sufficient. Start with one emulator and a VM with at least 4 vCPU and 8 GB RAM as a practical baseline; actual performance depends on the Android image and workload. This is not a free-tier workload.

## Deploy the emulator and APK API

1. Create a Linux VPS with KVM/nested virtualization and verify `test -e /dev/kvm`.
2. Install Docker Engine and Docker Compose.
3. In `android-api/`, create an `.env` file:

```env
ADBKEY=<contents of your Android adb public key>
ANDROID_API_TOKEN=<long-random-secret>
ALLOWED_ORIGINS=https://discnet.github.io
```

4. Start the emulator and installer API:

```bash
docker compose --env-file .env up -d --build
```

5. Deploy the Google Emulator Gateway following its official gateway demo. The gateway must be reachable over HTTPS and connect to the emulator's gRPC/WebRTC service on port 8554. Do not expose ADB (5555) publicly.
6. Configure a reverse proxy with TLS for the APK API on port 8080. Keep the API token secret and restrict CORS to the GitHub Pages origin.

## Configure the website

Open `https://discnet.github.io/3dViewer/android.html` and enter:
- Gateway WebRTC: public HTTPS URL of the Google Emulator Gateway.
- API de instalação: public HTTPS URL of the APK API.
- Token de acesso: the same `ANDROID_API_TOKEN` configured on the VPS.

Choose an APK and install it. The emulator must be booted and connected before installation.

## Security

- Never expose ADB port 5555 to the public internet.
- Use HTTPS for both gateway and API.
- Use a strong random API token.
- Restrict CORS to the exact website origin.
- Treat APKs as untrusted software. Run the emulator in an isolated VM and do not mount sensitive host directories into the emulator.
- This initial deployment is single-user/single-emulator. Do not publish the endpoint as a public multi-user service without per-user authentication, session isolation, quotas, and cleanup.

## Limitations

The website UI and APK installation API are implemented in this repository. The Android emulator and Google WebRTC gateway must be deployed on a KVM-enabled host before the page can execute APKs. The gateway is intentionally not hosted on GitHub Pages or Railway.
