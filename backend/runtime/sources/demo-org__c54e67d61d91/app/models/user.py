class User:
    def __init__(self, user_id: str, tier: str) -> None:
        self.user_id = user_id
        self.tier = tier


def is_premium(user: User) -> bool:
    return user.tier == "premium"
