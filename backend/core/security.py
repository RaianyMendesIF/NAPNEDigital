import bcrypt


def hash_password(senha: str) -> str:
    hashed = bcrypt.hashpw(senha.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(senha: str, senha_hash: str) -> bool:
    if not senha_hash:
        return False
    try:
        return bcrypt.checkpw(
            senha.encode("utf-8"),
            senha_hash.encode("utf-8"),
        )
    except (ValueError, TypeError):
        return False
