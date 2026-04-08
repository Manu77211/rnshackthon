from fastapi.responses import JSONResponse


def error_response(error: str, code: int, detail: str) -> JSONResponse:
    return JSONResponse(
        status_code=code,
        content={"error": error, "code": code, "detail": detail},
    )
