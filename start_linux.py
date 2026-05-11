#!/usr/bin/env python3
import os
import shutil
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SERVER_DIR = ROOT / "server"
PGDATA = SERVER_DIR / ".pgdata"
BACKEND_PORT = int(os.environ.get("PORT", "5001"))
FRONTEND_PORT = int(os.environ.get("FRONTEND_PORT", "8085"))
DB_PORT = os.environ.get("DB_PORT", "55432")


processes = []


def fail(message):
    print(f"ERROR: {message}", file=sys.stderr)
    stop_processes()
    sys.exit(1)


def run_check(command, cwd=ROOT):
    return subprocess.run(
        command,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )


def start_process(command, cwd, env=None, name="process"):
    print(f"Starting {name}: {' '.join(command)}")
    process = subprocess.Popen(command, cwd=cwd, env=env)
    processes.append((name, process))
    return process


def stop_processes():
    for name, process in reversed(processes):
        if process.poll() is None:
            print(f"Stopping {name}...")
            process.terminate()
            try:
                process.wait(timeout=8)
            except subprocess.TimeoutExpired:
                process.kill()


def wait_for_port(host, port, timeout=20):
    deadline = time.time() + timeout
    while time.time() < deadline:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(1)
            if sock.connect_ex((host, int(port))) == 0:
                return True
        time.sleep(0.5)
    return False


def require_command(command):
    if shutil.which(command) is None:
        fail(f"Missing command: {command}")


def ensure_env_file():
    env_file = SERVER_DIR / ".env"
    example_file = SERVER_DIR / ".env.example"
    if env_file.exists():
        return

    if example_file.exists():
        print("server/.env is missing. Creating it from server/.env.example.")
        env_file.write_text(example_file.read_text(), encoding="utf-8")
        print("Edit server/.env before using real accounts/passwords.")
    else:
        fail("server/.env is missing and server/.env.example was not found.")


def ensure_dependencies():
    require_command("node")
    require_command("npm")
    require_command("python3")

    if not (SERVER_DIR / "node_modules").exists():
        print("node_modules is missing. Running npm install...")
        result = subprocess.run(["npm", "install"], cwd=SERVER_DIR)
        if result.returncode != 0:
            fail("npm install failed.")


def start_postgres():
    pg_ctl = shutil.which("pg_ctl")
    if not PGDATA.exists():
        print("server/.pgdata not found. Assuming PostgreSQL is already running elsewhere.")
        print(f"Backend will use DB_HOST/DB_PORT from server/.env or DB_PORT={DB_PORT}.")
        return

    if pg_ctl is None:
        print("pg_ctl not found. Skipping local .pgdata startup.")
        print("Install postgresql-client/postgresql tools or start PostgreSQL manually.")
        return

    status = run_check([pg_ctl, "status", "-D", str(PGDATA)], cwd=SERVER_DIR)
    if status.returncode == 0:
        print("PostgreSQL is already running.")
        return

    log_file = SERVER_DIR / "postgres-local.log"
    result = run_check(
        [pg_ctl, "start", "-D", str(PGDATA), "-l", str(log_file), "-o", f"-p {DB_PORT}"],
        cwd=SERVER_DIR,
    )
    if result.returncode != 0:
        print(result.stdout)
        print(result.stderr, file=sys.stderr)
        fail("Could not start PostgreSQL.")

    if not wait_for_port("127.0.0.1", DB_PORT, timeout=20):
        fail(f"PostgreSQL did not open port {DB_PORT}.")

    print(f"PostgreSQL is running on localhost:{DB_PORT}.")


def start_backend():
    env = os.environ.copy()
    env["PORT"] = str(BACKEND_PORT)
    env["HOST"] = "0.0.0.0"
    env.setdefault("DB_HOST", "localhost")

    start_process(["npm", "start"], cwd=SERVER_DIR, env=env, name="backend")
    if not wait_for_port("127.0.0.1", BACKEND_PORT, timeout=25):
        fail(f"Backend did not open port {BACKEND_PORT}.")

    print(f"Backend: http://localhost:{BACKEND_PORT}")


def start_frontend():
    start_process(
        ["python3", "-m", "http.server", str(FRONTEND_PORT), "--bind", "0.0.0.0"],
        cwd=ROOT,
        name="frontend",
    )
    if not wait_for_port("127.0.0.1", FRONTEND_PORT, timeout=10):
        fail(f"Frontend did not open port {FRONTEND_PORT}.")

    print(f"Frontend: http://localhost:{FRONTEND_PORT}/frontend/login-signin.html")
    print(f"Leaderboard: http://localhost:{FRONTEND_PORT}/frontend/leaderboard.html")


def handle_exit(signum, frame):
    stop_processes()
    sys.exit(0)


def main():
    signal.signal(signal.SIGINT, handle_exit)
    signal.signal(signal.SIGTERM, handle_exit)

    ensure_env_file()
    ensure_dependencies()
    start_postgres()
    start_backend()
    start_frontend()

    print("\nAll services are running. Press Ctrl+C to stop backend/frontend.")
    for name, process in processes:
        print(f"{name} PID: {process.pid}")

    while True:
        for name, process in processes:
            if process.poll() is not None:
                fail(f"{name} stopped unexpectedly with exit code {process.returncode}.")
        time.sleep(1)


if __name__ == "__main__":
    main()
