from app.models.user import User, is_premium
from app.repositories.order_repo import OrderRepository


class RecommendationService:
    def recommend(self, user: User) -> list[str]:
        orders = OrderRepository().for_user(user)
        if is_premium(user) and len(orders) > 1:
            return ["bundle_plus", "priority_delivery"]
        return ["starter_bundle"]
