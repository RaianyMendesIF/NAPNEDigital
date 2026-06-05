from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core import get_current_user, require_admin
from database import get_db
from schemas import SolicitacaoCreate, SolicitacaoStatusUpdate
from services import create_solicitacao_service, update_status_service

router = APIRouter(prefix="/solicitacoes", tags=["solicitacoes"])


@router.post("")
def create_solicitacao(
    data: SolicitacaoCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return create_solicitacao_service(data, current_user, db)


@router.patch("/{solicitacao_id}/status")
def update_solicitacao_status(
    solicitacao_id: int,
    data: SolicitacaoStatusUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    return update_status_service(solicitacao_id, data, db)
