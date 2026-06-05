from fastapi.security import OAuth2PasswordBearer
from core import verify_token
from fastapi import Depends, HTTPException
from models import Usuario, StatusUsuario, Cargo, ProfessorTurma, StatusProfessorTurma, Turma
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

def require_admin(current_user: Usuario = Depends(get_current_user)):
    if current_user.cargo != Cargo.COORDENADOR:
        raise HTTPException(status_code=403, detail="Usuário não autorizado")
    return current_user


def require_gestor(current_user: Usuario = Depends(get_current_user)):
    if current_user.cargo not in (Cargo.COORDENADOR, Cargo.AGENTE):
        raise HTTPException(status_code=403, detail="Usuário não autorizado")
    return current_user


def require_document_upload_permission(
    current_user: Usuario = Depends(get_current_user),
):
    if current_user.cargo not in (Cargo.COORDENADOR, Cargo.AGENTE):
        raise HTTPException(status_code=403, detail="Usuário não autorizado")
    return current_user


def require_atendimento_permission(
    current_user: Usuario = Depends(get_current_user),
):
    if current_user.cargo not in (Cargo.COORDENADOR, Cargo.PSICOLOGO):
        raise HTTPException(status_code=403, detail="Usuário não autorizado")
    return current_user


def usuario_tem_acesso_turma(usuario: Usuario, turma_id: int, db: Session) -> bool:
    if usuario.cargo == Cargo.COORDENADOR:
        return True

    if usuario.cargo == Cargo.AGENTE:
        return True

    if usuario.cargo != Cargo.PROFESSOR:
        return False

    vinculo = (
        db.query(ProfessorTurma)
        .filter(
            ProfessorTurma.turma_id == turma_id,
            ProfessorTurma.usuario_id == usuario.id,
            ProfessorTurma.status == StatusProfessorTurma.ATIVO,
        )
        .first()
    )
    return vinculo is not None


def require_professor_in_turma(
    turma_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if not usuario_tem_acesso_turma(current_user, turma_id, db):
        raise HTTPException(
            status_code=403,
            detail="Sem acesso a esta turma",
        )
    return current_user


def usuario_pode_ver_prontuario(usuario: Usuario, aluno_id: int, db: Session) -> bool:
    if usuario.cargo in (Cargo.COORDENADOR, Cargo.AGENTE, Cargo.PSICOLOGO):
        return True

    if usuario.cargo != Cargo.PROFESSOR:
        return False

    turma_ids = [
        row[0]
        for row in db.query(Turma.id).filter(Turma.aluno_id == aluno_id).all()
    ]
    if not turma_ids:
        return False

    vinculo = (
        db.query(ProfessorTurma)
        .filter(
            ProfessorTurma.usuario_id == usuario.id,
            ProfessorTurma.turma_id.in_(turma_ids),
            ProfessorTurma.status == StatusProfessorTurma.ATIVO,
        )
        .first()
    )
    return vinculo is not None


def apply_prontuario_permissions(
    aluno_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if not usuario_pode_ver_prontuario(current_user, aluno_id, db):
        raise HTTPException(
            status_code=403,
            detail="Sem permissão para visualizar este prontuário",
        )
    return current_user




