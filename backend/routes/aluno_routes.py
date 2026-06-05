from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from core import require_admin, get_current_user, apply_prontuario_permissions
from database import get_db
from schemas import AlunoCreate, AlunoUpdate
from services import (
    create_aluno_service,
    list_alunos_service,
    get_aluno_service,
    update_aluno_service,
    deactivate_aluno_service,
    get_prontuario_aluno,
)

router = APIRouter(prefix="/alunos", tags=["alunos"])


@router.post("")
def create_aluno(
    data: AlunoCreate,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    return create_aluno_service(data, db)


@router.get("")
def get_alunos(
    apenas_ativos: bool = Query(default=False),
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    return list_alunos_service(db, apenas_ativos=apenas_ativos)


@router.get("/{aluno_id}/prontuario")
def get_prontuario(
    aluno_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(apply_prontuario_permissions),
):
    return get_prontuario_aluno(aluno_id, current_user, db)


@router.get("/{aluno_id}")
def get_aluno(
    aluno_id: int,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    return get_aluno_service(aluno_id, db)


@router.put("/{aluno_id}")
def update_aluno(
    aluno_id: int,
    data: AlunoUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    return update_aluno_service(aluno_id, data, db)


@router.delete("/{aluno_id}")
def deactivate_aluno(
    aluno_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    return deactivate_aluno_service(aluno_id, db)
