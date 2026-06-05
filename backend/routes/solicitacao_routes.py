from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from core import get_current_user, require_admin
from database import get_db
from schemas import SolicitacaoCreate, SolicitacaoStatusUpdate
from services import (
    create_solicitacao_service,
    update_status_service,
    list_solicitacoes_service,
    get_solicitacao_service,
)

router = APIRouter(prefix="/solicitacoes", tags=["solicitacoes"])


@router.post("")
def create_solicitacao(
    data: SolicitacaoCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return create_solicitacao_service(data, current_user, db)


@router.get("")
def list_solicitacoes(
    turma_id: int | None = Query(default=None),
    aluno_id: int | None = Query(default=None),
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return list_solicitacoes_service(
        db,
        current_user,
        turma_id=turma_id,
        status=status,
        aluno_id=aluno_id,
    )


@router.get("/{solicitacao_id}")
def get_solicitacao(
    solicitacao_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_solicitacao_service(solicitacao_id, current_user, db)


@router.patch("/{solicitacao_id}/status")
def update_solicitacao_status(
    solicitacao_id: int,
    data: SolicitacaoStatusUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    return update_status_service(solicitacao_id, data, db)
