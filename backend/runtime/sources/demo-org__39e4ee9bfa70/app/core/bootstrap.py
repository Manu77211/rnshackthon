from app.core.config import load_settings
from app.core.logger import get_logger
from app.metrics.registry import metrics


class ApplicationContext:
    def __init__(self) -> None:
        self.settings = load_settings()
        self.logger = get_logger()
        self.metrics = metrics()


def build_context() -> ApplicationContext:
    return ApplicationContext()
