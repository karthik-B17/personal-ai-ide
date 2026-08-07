import time
import openai
import google.generativeai as genai
from app.config import ACTIVE_PROVIDERS
from app.database import get_all_api_keys

class ProviderManager:
    def __init__(self):
        self.providers = ACTIVE_PROVIDERS
        self.active_provider = self.providers[0] if self.providers else None
        self.clients = {}
        self.db_keys = {}
        self.refresh_keys()  # load from DB on startup

    def refresh_keys(self):
        """Reload API keys from the database."""
        self.db_keys = get_all_api_keys()
        # Also clear clients so they get re-created with new keys
        self.clients = {}

    def get_client(self, provider_name: str, api_key: str, base_url: str):
        # Override api_key if we have a DB key for this provider
        if provider_name in self.db_keys and self.db_keys[provider_name]:
            api_key = self.db_keys[provider_name]

        if provider_name == "gemini":
            genai.configure(api_key=api_key)
            return genai
        else:
            # Use provider_name as key for client cache (so different keys don't conflict)
            cache_key = f"{provider_name}_{api_key[:8]}"  # simple cache key
            if cache_key not in self.clients:
                self.clients[cache_key] = openai.OpenAI(
                    base_url=base_url,
                    api_key=api_key,
                )
            return self.clients[cache_key]

    def set_active_provider(self, provider_name: str, model_name: str) -> bool:
        for p in self.providers:
            if p["name"] == provider_name and p["model"] == model_name:
                self.active_provider = p
                return True
        return False

    def get_active_provider(self):
        return self.active_provider

    def get_all_providers(self):
        return self.providers

    def try_providers(self, create_func, *args, **kwargs):
        if not self.providers:
            raise Exception("No providers configured.")
        if self.active_provider is None:
            self.active_provider = self.providers[0]

        ordered = [self.active_provider] + [p for p in self.providers if p != self.active_provider]
        last_error = None

        for provider in ordered:
            try:
                client = self.get_client(provider["name"], provider["api_key"], provider["base_url"])
                response = create_func(client, provider["model"], provider["name"], *args, **kwargs)
                print(f"[ProviderManager] Using {provider['name']}:{provider['model']}")
                return response, provider
            except Exception as e:
                status = getattr(e, 'status_code', None)
                if status == 429:
                    print(f"[ProviderManager] {provider['name']} rate limited (429). Waiting 5s...")
                    time.sleep(5)
                else:
                    print(f"[ProviderManager] {provider['name']} failed: {e}")
                last_error = e
                continue

        raise Exception(f"All providers exhausted. Last error: {last_error}")

# Singleton instance
manager = ProviderManager()