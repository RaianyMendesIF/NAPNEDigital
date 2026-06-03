def error_message(message: str, error_code: int):
    return {
        "success": False,
        "message": message,
        "error_code": error_code
    }

def success_message(data: dict | None, message: str):
    return {
        "success": True,
        "message": message,
        "data": data
    }