"""
REKOV — Unified System Launcher

Terminal Color Legend:
  DARK GREEN  = Service working / healthy / compiled
  RED         = Service dead / crashed / failed
  YELLOW      = Unknown / port stale / retry
  BLUE        = Update / compiling / progress
"""

import subprocess
import os
import sys
import shutil
import threading
import time
import socket
import urllib.request
from logger import sys_logger, UPDATE_LEVEL


# ── Log Classification ────────────────────────────────────────────────────────
# Lines that mean SUCCESS (dark green) from subprocess output
_SUCCESS_PATTERNS = {
    "compiled successfully",
    "ready in",
    "ready started",
    "application startup complete",
    "uvicorn running",
    "started server",
    "[success]",
    "loaded env",
    "200 ok",
    "starting...",
    "[ok]",
    "compiled /",
}

# Lines that mean an UPDATE/progress (blue)
_UPDATE_PATTERNS = {
    "compiling",
    "hmr",
    "hot update",
    "webpack",
    "rebuilding",
    "reloading",
    "reloaded",
    "module reload",
    "- compiled",
    "updated",
    "installing",
    "fetching",
    "resolving",
    "downloading",
    "bundling",
    "built",
    "building",
}

# Lines that definitely mean ERROR (red)
_ERROR_PATTERNS = {
    "error:",
    "error\n",
    "syntaxerror",
    "traceback",
    "exception:",
    "failed to compile",
    "module not found",
    "cannot find module",
    "typeerror",
    "referenceerror",
    "exit code",
    "eaddrinuse",
    "econnrefused",
    "fatal:",
    "critical:",
    "[failed]",
    "unhandledrejection",
    "uncaughtexception",
}

# Next.js noise lines to completely suppress (they are not real issues)
_SUPPRESS_PATTERNS = {
    "node_modules/next/dist/server/",
    "node_modules/next/dist/build/",
    "at module.<anonymous>",
    "at wrapmoduleload",
    "at module._compile",
    "at object.<anonymous>",
    "at module.load",
    "at module._load",
    "at wraptransition",
    "at object..js",
    "requirestack",
    "require stack",
    "warn - next.js",
    "(node:internal/modules",
    "at c:\\users\\",
    "at async",
    "},",
    "]",
    "webpack-runtime.js",
    "react-dom/cjs",
    "react-server-dom-webpack",
}

# Lines that should just be INFO (cyan, neutral)
_INFO_PATTERNS = {
    "get /",
    "post /",
    "put /",
    "delete /",
    " 200 in",
    " 304 in",
    " 307 in",
    " 404 in",
    " 500 in",
    "info:",
    "started",
    "startup",
    "running on",
    "waiting for",
    "ready",
    "listening",
    "connected",
    "startup sequence",
    "database initialized",
    "sync service",
    "backupverifier",
    "purge daemon",
    "application startup",
    "127.0.0.1",
    "0.0.0.0",
    "next.js",
    "environments:",
    ".env.local",
    "local:",
    "network:",
    "rekoviu@",
    "next dev",
}


def _classify_and_log(line: str, name: str):
    """
    Route subprocess output lines to correct color level:
      DARK GREEN  = compiled OK / service healthy
      BLUE        = compiling / updating / progress
      YELLOW      = warnings / unknowns
      RED         = real errors / crashes
      (suppressed) = Next.js internal stack frames
    """
    lower = line.lower()

    # Hard suppress Next.js internal stack noise
    if any(p in lower for p in _SUPPRESS_PATTERNS):
        return

    # Empty or cosmetic separators
    stripped = line.strip("-=* \t")
    if not stripped:
        return

    # Classify
    if any(p in lower for p in _ERROR_PATTERNS):
        sys_logger.error(f"  [ERR]  [{name}]  {line}")
    elif any(p in lower for p in _SUCCESS_PATTERNS):
        sys_logger.success(f"  [OK]   [{name}]  {line}")
    elif any(p in lower for p in _UPDATE_PATTERNS):
        sys_logger.update(f"  [UPD]  [{name}]  {line}")
    elif any(p in lower for p in _INFO_PATTERNS):
        sys_logger.info(f"  [INF]  [{name}]  {line}")
    else:
        # Everything else that doesn't match known patterns -> yellow
        sys_logger.warning(f"  [WRN]  [{name}]  {line}")


def read_stream(stream, name: str, is_stderr: bool = False):
    """Read output from a subprocess stream and route to colored log levels."""
    for raw_line in iter(stream.readline, b""):
        line = raw_line.decode("utf-8", errors="replace").rstrip()
        if not line.strip():
            continue
        # Strip emojis requested by user
        line = line.replace("✓", "[OK]").replace("▲", "*").replace("🚨", "[!]").replace("✨", "*")
        _classify_and_log(line, name)
    stream.close()


# ── Network Helpers ───────────────────────────────────────────────────────────
def _is_port_in_use(port: int) -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            return s.connect_ex(("127.0.0.1", port)) == 0
    except Exception:
        return False


def _is_service_healthy(url: str) -> bool:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "RekovLauncher"})
        with urllib.request.urlopen(req, timeout=1.5) as res:
            return res.status in (200, 304, 307, 308)
    except Exception:
        return False


def _kill_port(port: int):
    """Kill any process holding a port (Windows)."""
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
                    sys_logger.warning(f"  [WRN]  [CLEANUP]  Killed stale PID {pid} on :{port}")
    except Exception:
        pass


# ── Process Launcher ──────────────────────────────────────────────────────────
def run_process(cmd, cwd: str, name: str, shell: bool = False):
    cmd_str = cmd if isinstance(cmd, str) else " ".join(cmd)
    sys_logger.update(f"  [UPD]  [{name}]  Spawning: {cmd_str}")
    try:
        env = os.environ.copy()
        env["PYTHONUNBUFFERED"]      = "1"
        env["NEXT_TELEMETRY_DISABLED"] = "1"   # Silence Next.js upgrade notices
        env["NO_COLOR"]              = "0"     # Keep colors
        process = subprocess.Popen(
            cmd, cwd=cwd,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            env=env, shell=shell,
        )
        threading.Thread(target=read_stream, args=(process.stdout, name, False), daemon=True).start()
        threading.Thread(target=read_stream, args=(process.stderr, name, True),  daemon=True).start()
        return process
    except Exception as e:
        sys_logger.error(f"  [ERR]  [{name}]  Failed to start: {e}")
        return None


# ── Banner Helper ─────────────────────────────────────────────────────────────
def _banner(text: str):
    sys_logger.success(f"  {'=' * 54}")
    sys_logger.success(f"  {text}")
    sys_logger.success(f"  {'=' * 54}")


def _service_status(name: str, alive: bool):
    if alive:
        sys_logger.success(f"  [OK]   {name:<30}  ONLINE")
    else:
        sys_logger.error(f"  [ERR]  {name:<30}  OFFLINE / STARTING")


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    _banner("REKOV  *  Unified System Launcher")
    sys_logger.info("")

    # ── 0. Health-check existing services ────────────────────────────────────
    api_alive = _is_service_healthy("http://127.0.0.1:4040/api/v1/health") or \
                _is_service_healthy("http://127.0.0.1:4040/")
    ui_alive  = _is_service_healthy("http://127.0.0.1:3000/")

    if api_alive and ui_alive:
        sys_logger.success("  [OK]   All services already online — reusing existing instances.")
        sys_logger.info("")
        _service_status("API  (FastAPI)     :4040", api_alive)
        _service_status("UI   (Next.js)     :3000", ui_alive)
        sys_logger.info("")
        sys_logger.info("  ->  http://localhost:3000         (App)")
        sys_logger.info("  ->  http://localhost:3000/kiosk   (Kiosk)")
        sys_logger.info("  ->  http://localhost:4040/docs    (API Docs)")
        sys_logger.info("")
        sys_logger.info("  Press Ctrl+C to exit launcher (services stay running).")
        try:
            while True:
                time.sleep(2)
        except KeyboardInterrupt:
            sys_logger.warning("  [WRN]  Launcher stopped. Services remain active.")
        return

    # ── Kill stale zombie processes on our ports ──────────────────────────────
    if not ui_alive and _is_port_in_use(3000):
        sys_logger.warning("  [WRN]  [CLEANUP]  Port 3000 occupied — killing stale process...")
        _kill_port(3000)
    if not api_alive and _is_port_in_use(4040):
        sys_logger.warning("  [WRN]  [CLEANUP]  Port 4040 occupied — killing stale process...")
        _kill_port(4040)
    time.sleep(0.5)

    # ── Re-check health after cleanup ─────────────────────────────────────────
    api_alive = _is_service_healthy("http://127.0.0.1:4040/api/v1/health") or \
                _is_service_healthy("http://127.0.0.1:4040/")
    ui_alive  = _is_service_healthy("http://127.0.0.1:3000/")

    root_dir    = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "rekov")
    frontend_dir = os.path.join(root_dir, "rekoviu")
    is_win = sys.platform == "win32"

    # ── 1. Backend Python dependencies ───────────────────────────────────────
    sys_logger.update("  [UPD]  [SETUP]  Installing backend dependencies...")
    try:
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "-r", "requirements.txt", "--quiet"],
            cwd=backend_dir, check=True,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        sys_logger.success("  [OK]   [SETUP]  Backend dependencies ready.")
    except subprocess.CalledProcessError as e:
        sys_logger.error(f"  [ERR]  [SETUP]  Backend dependencies failed: {e}")
        sys.exit(1)

    # ── 2. Frontend Node dependencies ────────────────────────────────────────
    sys_logger.update("  [UPD]  [SETUP]  Installing frontend dependencies...")
    try:
        npm_cmd = "npm.cmd" if is_win else "npm"
        subprocess.run([npm_cmd, "install", "--silent"], cwd=frontend_dir, check=True, shell=is_win)
        sys_logger.success("  [OK]   [SETUP]  Frontend dependencies ready.")
    except subprocess.CalledProcessError as e:
        sys_logger.error(f"  [ERR]  [SETUP]  Frontend dependencies failed: {e}")
        sys.exit(1)

    # ── 3. Clear stale .next webpack cache ───────────────────────────────────
    if not ui_alive:
        next_cache = os.path.join(frontend_dir, ".next")
        if os.path.isdir(next_cache):
            try:
                shutil.rmtree(next_cache)
                sys_logger.success("  [OK]   [UI]     Cleared stale .next cache — fresh webpack build.")
            except Exception as _e:
                sys_logger.warning(f"  [WRN]  [UI]     Could not clear .next cache: {_e}")

    # ── 4. Launch services ───────────────────────────────────────────────────
    backend_cmd  = [sys.executable, "-m", "uvicorn", "main:app",
                    "--host", "0.0.0.0", "--port", "4040", "--reload"]
    frontend_cmd = "npm run dev" if is_win else ["npm", "run", "dev"]

    backend_process  = run_process(backend_cmd,  backend_dir,  "API") if not api_alive else None
    frontend_process = run_process(frontend_cmd, frontend_dir, "UI", shell=is_win) if not ui_alive else None

    # ── 5. Startup banner ────────────────────────────────────────────────────
    sys_logger.info("")
    _banner("ALL SYSTEMS LAUNCHING")
    sys_logger.info("")
    _service_status("API  (FastAPI + BackupVerifier) :4040", not not backend_process or api_alive)
    _service_status("UI   (Next.js)                  :3000", not not frontend_process or ui_alive)
    sys_logger.info("")
    sys_logger.info("  ->  http://localhost:3000         (App)")
    sys_logger.info("  ->  http://localhost:3000/kiosk   (Kiosk)")
    sys_logger.info("  ->  http://localhost:4040/docs    (API Docs)")
    sys_logger.info("")
    sys_logger.info("  BLUE = compiling/updating   GREEN = working   RED = error   YELLOW = unknown")
    sys_logger.info("  Press Ctrl+C to stop all services.")
    sys_logger.info("")

    # ── 6. Keep-alive loop ───────────────────────────────────────────────────
    try:
        while True:
            if backend_process and backend_process.poll() is not None:
                if backend_process.returncode != 0:
                    sys_logger.error(f"  [ERR]  [API]  Process exited (code {backend_process.returncode})")
                    break
            if frontend_process and frontend_process.poll() is not None:
                if not _is_port_in_use(3000):
                    sys_logger.error(f"  [ERR]  [UI]   Process exited (code {frontend_process.returncode})")
                    break
            time.sleep(1)
    except KeyboardInterrupt:
        sys_logger.warning("  [WRN]  Shutting down all services...")
    finally:
        sys_logger.info("  Terminating child processes...")
        for proc in [backend_process, frontend_process]:
            if proc and proc.poll() is None:
                subprocess.run(
                    ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                )
        sys_logger.success("  [OK]   System shutdown complete.")


if __name__ == "__main__":
    main()
