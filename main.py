import subprocess
import os
import sys
import threading
import time
import re
import io
from logger import sys_logger


_ERROR_KEYWORDS = {"traceback", "error:", "exception:", "failed", "fatal", "critical"}
_INFO_KEYWORDS = {"info:", "started", "startup", "running on", "waiting for", "complete", "ready"}


import socket
import urllib.request

def _is_port_in_use(port: int) -> bool:
    """Check if a TCP port is currently accepting connections."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            return s.connect_ex(("127.0.0.1", port)) == 0
    except Exception:
        return False


def _is_service_healthy(url: str) -> bool:
    """Check if an HTTP service responds with a successful status."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "RekovLauncher"})
        with urllib.request.urlopen(req, timeout=1.5) as res:
            return res.status in (200, 304, 307, 308)
    except Exception:
        return False


def _kill_port(port: int):
    """Kill any process listening on the given port (Windows only)."""
    try:
        result = subprocess.run(
            ["netstat", "-ano"], capture_output=True, text=True, timeout=5
        )
        for line in result.stdout.splitlines():
            if f":{port}" in line and "LISTENING" in line:
                parts = line.split()
                pid = parts[-1]
                if pid.isdigit() and int(pid) > 0:
                    subprocess.run(
                        ["taskkill", "/F", "/T", "/PID", pid],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                    )
                    sys_logger.warning(f"[CLEANUP] Killed stale process PID {pid} on port {port}")
    except Exception:
        pass


def read_stream(stream, name, is_stderr=False):
    """Read output from a subprocess stream and route it to the correct log level."""
    for raw_line in iter(stream.readline, b""):
        line = raw_line.decode("utf-8", errors="replace").strip()
        if not line:
            continue
        lower = line.lower()
        if any(kw in lower for kw in _ERROR_KEYWORDS):
            sys_logger.error(f"[{name}] {line}")
        elif is_stderr and not any(kw in lower for kw in _INFO_KEYWORDS):
            sys_logger.warning(f"[{name}] {line}")
        else:
            sys_logger.info(f"[{name}] {line}")
    stream.close()


def run_process(cmd, cwd, name, shell=False):
    """Launch a subprocess and stream its output to the logger."""
    cmd_str = cmd if isinstance(cmd, str) else ' '.join(cmd)
    sys_logger.info(f"[{name}] Spawning: {cmd_str}")
    try:
        env = os.environ.copy()
        env["PYTHONUNBUFFERED"] = "1"
        process = subprocess.Popen(
            cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            env=env, shell=shell
        )
        threading.Thread(target=read_stream, args=(process.stdout, name, False), daemon=True).start()
        threading.Thread(target=read_stream, args=(process.stderr, name, True), daemon=True).start()
        return process
    except Exception as e:
        sys_logger.error(f"[{name}] Failed to start: {e}")
        return None


def main():
    sys_logger.success("==================================================")
    sys_logger.success("  REKOV -- Unified System Launcher")
    sys_logger.success("==================================================")
    sys_logger.info("")
    sys_logger.info("  Single process managing all services.")
    sys_logger.info("  Backend + Frontend launched together.")
    sys_logger.info("")

    # ---- 0. Check if services are already up and running ----
    api_alive = _is_service_healthy("http://127.0.0.1:4040/api/v1/health") or _is_service_healthy("http://127.0.0.1:4040/")
    ui_alive = _is_service_healthy("http://127.0.0.1:3000/")

    if api_alive and ui_alive:
        sys_logger.success("[ONLINE] Services are ALREADY online and healthy on ports 3000 & 4040!")
        sys_logger.info("")
        sys_logger.info("  -> http://localhost:3000         (Application)")
        sys_logger.info("  -> http://localhost:3000/kiosk    (Self-Service)")
        sys_logger.info("  -> http://localhost:4040/docs     (API Docs)")
        sys_logger.info("")
        sys_logger.info("  Keeping existing instances running. Press Ctrl+C to exit launcher.")
        try:
            while True:
                time.sleep(2)
        except KeyboardInterrupt:
            sys_logger.info("Launcher stopped (services remain active in background).")
        return

    # Clean up only unresponsive ports
    if not ui_alive and _is_port_in_use(3000):
        _kill_port(3000)
    if not api_alive and _is_port_in_use(4040):
        _kill_port(4040)
    time.sleep(0.5)

    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "rekov")
    frontend_dir = os.path.join(root_dir, "rekoviu")

    is_win = sys.platform == "win32"

    # ---- 1. Backend dependencies ----
    sys_logger.info("[SETUP] Checking backend dependencies...")
    try:
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "-r", "requirements.txt", "--quiet"],
            cwd=backend_dir, check=True,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        sys_logger.success("[SETUP] Backend dependencies ready.")
    except subprocess.CalledProcessError as e:
        sys_logger.error(f"[SETUP] Backend dependencies failed: {e}")
        sys.exit(1)

    # ---- 2. Frontend dependencies ----
    sys_logger.info("[SETUP] Checking frontend dependencies...")
    try:
        npm_cmd = "npm.cmd" if is_win else "npm"
        subprocess.run([npm_cmd, "install", "--silent"], cwd=frontend_dir, check=True, shell=is_win)
        sys_logger.success("[SETUP] Frontend dependencies ready.")
    except subprocess.CalledProcessError as e:
        sys_logger.error(f"[SETUP] Frontend dependencies failed: {e}")
        sys.exit(1)

    # ---- 3. Launch both services with --reload for instant updates ----
    backend_cmd = [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "4040", "--reload"]
    frontend_cmd = "npm run dev" if is_win else ["npm", "run", "dev"]

    backend_process = run_process(backend_cmd, backend_dir, "API") if not api_alive else None
    frontend_process = run_process(frontend_cmd, frontend_dir, "UI", shell=is_win) if not ui_alive else None

    sys_logger.success("==================================================")
    sys_logger.success("  ALL SYSTEMS ONLINE")
    sys_logger.success("==================================================")
    sys_logger.info("")
    sys_logger.info("  -> http://localhost:3000         (Application)")
    sys_logger.info("  -> http://localhost:3000/kiosk    (Self-Service)")
    sys_logger.info("  -> http://localhost:4040/docs     (API Docs)")
    sys_logger.info("")
    sys_logger.info("  Press Ctrl+C to stop.")
    sys_logger.info("")

    # ---- 4. Keep-alive loop ----
    try:
        while True:
            if backend_process and backend_process.poll() is not None:
                if backend_process.returncode != 0:
                    sys_logger.error(f"API process exited (code {backend_process.returncode})")
                    break
            if frontend_process and frontend_process.poll() is not None:
                # If node continues listening on port 3000, don't crash the system
                if not _is_port_in_use(3000):
                    sys_logger.error(f"UI process exited (code {frontend_process.returncode})")
                    break
            time.sleep(1)
    except KeyboardInterrupt:
        sys_logger.warning("Shutting down...")
    finally:
        sys_logger.info("Terminating child processes...")
        if backend_process and backend_process.poll() is None:
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(backend_process.pid)],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
        if frontend_process and frontend_process.poll() is None:
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(frontend_process.pid)],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
        sys_logger.success("System shutdown complete.")


if __name__ == "__main__":
    main()
