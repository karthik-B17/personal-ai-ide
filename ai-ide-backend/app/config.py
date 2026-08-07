import os
from pathlib import Path
from dotenv import load_dotenv
from app.workspace_state import load_workspace_root, save_workspace_root

load_dotenv()

# ----- Provider definitions with their models -----
PROVIDER_CONFIGS = {
    "groq": {
        "api_key": os.getenv("GROQ_API_KEY", ""),
        "base_url": os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1"),
        "models": [
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b",
            "openai/gpt-oss-safeguard-20b",
            "qwen/qwen3.6-27b",
            "minimaxai/minimax-m2.7",
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
        ]
    },
    "gemini": {
        "api_key": os.getenv("GEMINI_API_KEY", ""),
        "base_url": os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta"),
        "models": [
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite",
        ]
    },
    "huggingface": {
        "api_key": os.getenv("HF_API_KEY", ""),
        "base_url": os.getenv("HF_BASE_URL", "https://api-inference.huggingface.co/v1"),
        "models": [
            "unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF",
            "moonshotai/Kimi-K3",
        ]
    }
}

# Build a flat list of all active providers (include ALL, regardless of API key)
ACTIVE_PROVIDERS = []
for provider, config in PROVIDER_CONFIGS.items():
    for model in config["models"]:
        ACTIVE_PROVIDERS.append({
            "name": provider,
            "api_key": config["api_key"],  # may be empty – manager will override with DB key
            "base_url": config["base_url"],
            "model": model,
            "display_name": f"{provider}: {model}"
        })

# Default provider: first active
DEFAULT_PROVIDER = ACTIVE_PROVIDERS[0] if ACTIVE_PROVIDERS else None
CURRENT_PROVIDER = DEFAULT_PROVIDER

# ----- Workspace root (loaded from saved state or .env) -----
WORKSPACE_ROOT = Path(load_workspace_root(os.getenv("WORKSPACE_ROOT", os.getcwd()))).resolve()

# ----- Agent settings -----
MAX_AGENT_ITERATIONS = 25
MAX_FILE_READ_BYTES = int(os.getenv("MAX_FILE_READ_BYTES", "200000"))
ALLOW_TERMINAL = os.getenv("ALLOW_TERMINAL", "true").lower() == "true"
IGNORED_DIR_NAMES = set(
    os.getenv("IGNORED_DIR_NAMES", ".git,node_modules,.venv,__pycache__,dist,build").split(",")
)

# ----- Function to update workspace root -----
def set_workspace_root(new_path: Path):
    """
    Update the global WORKSPACE_ROOT and persist it to disk.
    """
    global WORKSPACE_ROOT
    WORKSPACE_ROOT = new_path.resolve()
    save_workspace_root(str(WORKSPACE_ROOT))