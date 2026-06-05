from fastapi.security import OAuth2PasswordBearer
from core import verify_token
from fastapi import Depends, HTTPException
from models import Usuario, StatusUsuario
from database import get_db
from sqlalchemy.orm import Session

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    
    try:
        payload = verify_token(token)
    except ValueError as error:
        raise HTTPException(status_code=401, detail=str(error))

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token inválido")

    user = db.query(Usuario).filter(Usuario.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if user.status == StatusUsuario.INATIVO:
        raise HTTPException(status_code=403, detail="Usuário inativo")

    return user

def require_admin(current_user: dict = Depends(get_current_user)):

    if current_user.cargo != "Coordenador":
        raise HTTPException(status_code=403, detail="Usuário não autorizado")
    
    return current_user




