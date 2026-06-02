from enum import auto
from warnings import deprecated
from passlib.context import CryptContext

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

def hash_password(senha: str):
    return pwd_context.hash(senha)

def verify_password(senha: str, senha_hash: str):
    return pwd_context.verify(senha, senha_hash)