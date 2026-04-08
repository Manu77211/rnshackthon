from app.core.events import event_bus
from app.models.order import Order
from app.models.user import User


class OrderRepository:
    def for_user(self, user: User) -> list[Order]:
        event_bus().publish("order.list")
        return [
            Order(order_id="ord-1", owner=user, amount=250),
            Order(order_id="ord-2", owner=user, amount=850),
        ]
