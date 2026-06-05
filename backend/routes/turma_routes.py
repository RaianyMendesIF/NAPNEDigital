from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core import require_gestor, require_professor_in_turma, get_current_user
from database import get_db
from schemas import TurmaCreate, ProfessorTurmaCreate
from services import (
    create_turma_service,
    list_turmas_service,
    get_turma_service,
    vincular_professor_service,
    list_professores_turma_service,
)

router = APIRouter(prefix="/turmas", tags=["turmas"])


@router.post("")
def create_turma(
    data: TurmaCreate,
    db: Session = Depends(get_db),
    _gestor=Depends(require_gestor),
):
    return create_turma_service(data, db)


@router.get("")
def list_turmas(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return list_turmas_service(db, current_user)


@router.get("/{turma_id}")
def get_turma(
    turma_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_professor_in_turma),
):
    return get_turma_service(turma_id, db)


@router.post("/{turma_id}/professores")
def vincular_professor(
    turma_id: int,
    data: ProfessorTurmaCreate,
    db: Session = Depends(get_db),
    _gestor=Depends(require_gestor),
):
    return vincular_professor_service(turma_id, data, db)


@router.get("/{turma_id}/professores")
def list_professores_turma(
    turma_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_professor_in_turma),
):
    return list_professores_turma_service(turma_id, db)
