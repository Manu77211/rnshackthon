from app.models.order import is_high_value
from app.repositories.order_repo import OrderRepository
from app.repositories.user_repo import UserRepository


class BillingService:
    def compute_balance(self, user_id: str) -> float:
        user = UserRepository().find_user(user_id)
        orders = OrderRepository().for_user(user)
        return sum(order.amount * (0.95 if is_high_value(order) else 1.0) for order in orders)
