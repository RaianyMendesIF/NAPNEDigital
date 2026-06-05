from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core import hash_password
from database import get_db
from models import Usuario
from schemas.usuario_schemas import UsuarioCreate, UsuarioResponse, UsuarioUpdate


router = APIRouter(prefix="/usuarios", tags=["usuarios"])


@router.get("/", response_model=list[UsuarioResponse])
def list_usuarios(db: Session = Depends(get_db)):
    return db.query(Usuario).all()


@router.post("/", response_model=UsuarioResponse)
def create_usuario(usuario_data: UsuarioCreate, db: Session = Depends(get_db)):
    existing = (
        db.query(Usuario)
        .filter((Usuario.siape == usuario_data.siape) | (Usuario.email == usuario_data.email))
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Usuário já cadastrado")

    data = usuario_data.dict()
    data["senha"] = hash_password(data["senha"])
    usuario = Usuario(**data)
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.put("/{usuario_id}", response_model=UsuarioResponse)
def update_usuario(usuario_id: int, usuario_data: UsuarioUpdate, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    data = usuario_data.dict(exclude_unset=True)
    if "senha" in data and data["senha"]:
        data["senha"] = hash_password(data["senha"])

    for key, value in data.items():
        setattr(usuario, key, value)

    db.commit()
    db.refresh(usuario)
    return usuario


@router.delete("/{usuario_id}")
def delete_usuario(usuario_id: int, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if usuario.cargo == "Coordenador":
        raise HTTPException(status_code=400, detail="A coordenadora inicial não pode ser removida")

    db.delete(usuario)
    db.commit()
    return {"message": "Usuário deletado com sucesso"}
