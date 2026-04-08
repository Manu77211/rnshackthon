from app.core.logger import get_logger


class EventBus:
    def publish(self, event_name: str) -> None:
        get_logger().info(f"event:{event_name}")


def event_bus() -> EventBus:
    return EventBus()
