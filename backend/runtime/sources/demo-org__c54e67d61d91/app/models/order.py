from app.models.user import User


class Order:
    def __init__(self, order_id: str, owner: User, amount: float) -> None:
        self.order_id = order_id
        self.owner = owner
        self.amount = amount


def is_high_value(order: Order) -> bool:
    return order.amount >= 500
