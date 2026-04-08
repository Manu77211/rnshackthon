class Settings:
    def __init__(self) -> None:
        self.service_name = "graph-test"
        self.region = "us-east-1"


def load_settings() -> Settings:
    return Settings()
