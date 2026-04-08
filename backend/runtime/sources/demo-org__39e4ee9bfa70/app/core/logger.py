class Logger:
    def info(self, message: str) -> None:
        _ = message


def get_logger() -> Logger:
    return Logger()
