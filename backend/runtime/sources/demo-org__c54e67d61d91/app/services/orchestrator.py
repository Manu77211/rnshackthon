from app.metrics.registry import metrics
from app.repositories.user_repo import UserRepository
from app.services.billing import BillingService
from app.services.recommendation import RecommendationService


class Orchestrator:
    def profile(self, user_id: str) -> dict:
        user = UserRepository().find_user(user_id)
        recs = RecommendationService().recommend(user)
        balance = BillingService().compute_balance(user_id)
        metrics().increment("profile.requests")
        return {"user": user.user_id, "recommendations": recs, "balance": balance}
