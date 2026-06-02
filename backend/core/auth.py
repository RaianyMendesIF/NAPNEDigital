import jwt 
from jwt import InvalidTokenError, ExpiredSignatureError
from config import ( SECRET_KEY, ALGORITHM )
from datetime import datetime, timedelta, UTC

def create_access_token(
    payload_data: dict,
    expires_minutes: int = 60
) -> str:

    payload = payload_data.copy()

    payload["exp"] = (
        datetime.now(UTC)
        + timedelta(minutes=expires_minutes)
    )

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

def verify_token(token: str):

    try:
        return jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

    except ExpiredSignatureError:
        raise ValueError("Token expirado")

    except InvalidTokenError:
        raise ValueError("Token inválido")