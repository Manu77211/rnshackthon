from app.core.config import load_settings
from app.metrics.registry import metrics


def healthcheck() -> dict:
    settings = load_settings()
    metrics().increment("health.ping")
    return {"service": settings.service_name, "ok": True}
