from app.core.events import event_bus
from app.core.logger import get_logger
from app.models.user import User


class UserRepository:
    def find_user(self, user_id: str) -> User:
        get_logger().info(f"user_lookup:{user_id}")
        event_bus().publish("user.read")
        return User(user_id=user_id, tier="premium")
