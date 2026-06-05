from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from core import get_current_user
from database import get_db
from schemas import OcorrenciaCreate
from services import (
    create_ocorrencia_service,
    list_ocorrencias_service,
    get_ocorrencia_service,
)

router = APIRouter(prefix="/ocorrencias", tags=["ocorrencias"])


@router.post("")
def create_ocorrencia(
    data: OcorrenciaCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return create_ocorrencia_service(data, current_user, db)


@router.get("")
def list_ocorrencias(
    turma_id: int | None = Query(default=None),
    aluno_id: int | None = Query(default=None),
    semestre: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return list_ocorrencias_service(
        db,
        current_user,
        turma_id=turma_id,
        aluno_id=aluno_id,
        semestre=semestre,
    )


@router.get("/{ocorrencia_id}")
def get_ocorrencia(
    ocorrencia_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_ocorrencia_service(ocorrencia_id, current_user, db)
