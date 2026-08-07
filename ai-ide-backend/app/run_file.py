import subprocess
import webbrowser
from pathlib import Path
from app.config import WORKSPACE_ROOT
from app.security import resolve_in_workspace

def run_file(file_path: str) -> dict:
    abs_path = resolve_in_workspace(file_path)
    if not abs_path.exists():
        return {"error": "File not found"}

    ext = abs_path.suffix.lower()
    command = None

    if ext == ".py":
        command = ["python", str(abs_path)]
    elif ext == ".js":
        command = ["node", str(abs_path)]
    elif ext == ".html":
        webbrowser.open(f"file://{abs_path}")
        return {"success": True, "message": "Opened in browser"}
    elif ext == ".sh":
        command = ["bash", str(abs_path)]
    elif ext == ".ps1":
        command = ["powershell", "-File", str(abs_path)]
    else:
        return {"error": f"Unsupported file type: {ext}"}

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            cwd=str(abs_path.parent),
            timeout=30
        )
        return {
            "success": True,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.returncode
        }
    except subprocess.TimeoutExpired:
        return {"error": "Command timed out after 30s"}
    except Exception as e:
        return {"error": str(e)}