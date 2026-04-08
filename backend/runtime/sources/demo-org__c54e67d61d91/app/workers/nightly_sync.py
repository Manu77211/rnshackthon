from app.core.logger import get_logger
from app.services.orchestrator import Orchestrator


def run_nightly_sync() -> dict:
    get_logger().info("nightly_sync.start")
    return Orchestrator().profile("night-user")
