from app.core.logger import get_logger


class MetricRegistry:
    def __init__(self) -> None:
        self.metrics: dict[str, int] = {}

    def increment(self, key: str) -> None:
        self.metrics[key] = self.metrics.get(key, 0) + 1
        get_logger().info(f"metric:{key}")


def metrics() -> MetricRegistry:
    return MetricRegistry()
