from app.services.orchestrator import Orchestrator


def get_user_profile(user_id: str) -> dict:
    return Orchestrator().profile(user_id)
