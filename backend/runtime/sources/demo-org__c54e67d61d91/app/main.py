from app.api.routes.health import healthcheck
from app.api.routes.users import get_user_profile
from app.core.bootstrap import build_context
from app.workers.nightly_sync import run_nightly_sync


def run_demo() -> dict:
    context = build_context()
    user = get_user_profile("demo-user")
    health = healthcheck()
    nightly = run_nightly_sync()
    context.metrics.increment("demo.run")
    return {"health": health, "user": user, "nightly": nightly}
