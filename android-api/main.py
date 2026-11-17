import hmac
import os
import subprocess
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

TOKEN = os.environ.get("ANDROID_API_TOKEN", "")
ADB_HOST = os.environ.get("ADB_HOST", "emulator")
ADB_PORT = os.environ.get("ADB_PORT", "5555")
MAX_APK_SIZE = 300 * 1024 * 1024

if not TOKEN:
    raise RuntimeError("ANDROID_API_TOKEN must be configured")

app = FastAPI(title="DiscNet Android API", docs_url=None, redoc_url=None)
origins = [value.strip() for value in os.environ.get("ALLOWED_ORIGINS", "").split(",") if value.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


def require_token(authorization: str | None) -> None:
    expected = f"Bearer {TOKEN}"
    if not authorization or not hmac.compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="Token inválido.")


def adb(*args: str, timeout: int = 30) -> subprocess.CompletedProcess:
    try:
        return subprocess.run(
            ["adb", *args],
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(status_code=504, detail="O comando ADB excedeu o tempo limite.") from exc


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/apk/install")
async def install_apk(
    file: UploadFile = File(...),
    authorization: str | None = Header(default=None),
):
    require_token(authorization)

    filename = Path(file.filename or "").name
    if not filename.lower().endswith(".apk"):
        raise HTTPException(status_code=415, detail="Envie um arquivo .apk.")

    descriptor, temporary_path = tempfile.mkstemp(prefix="discnet-", suffix=".apk")
    size = 0
    try:
        with os.fdopen(descriptor, "wb") as temporary_file:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_APK_SIZE:
                    raise HTTPException(status_code=413, detail="O APK excede o limite de 300 MB.")
                temporary_file.write(chunk)

        if size == 0:
            raise HTTPException(status_code=400, detail="O arquivo está vazio.")

        device = f"{ADB_HOST}:{ADB_PORT}"
        connection = adb("connect", device)
        if connection.returncode != 0 and "already connected" not in connection.stdout.lower():
            raise HTTPException(status_code=502, detail="Não foi possível conectar ao dispositivo Android.")

        installation = adb("-s", device, "install", "-r", temporary_path, timeout=240)
        if installation.returncode != 0:
            detail = (installation.stderr or installation.stdout or "Falha na instalação.").strip()
            raise HTTPException(status_code=422, detail=detail[-1200:])

        return {"status": "installed", "message": "APK instalado com sucesso."}
    finally:
        await file.close()
        try:
            os.unlink(temporary_path)
        except FileNotFoundError:
            pass
