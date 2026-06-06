from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from core import require_admin, require_gestor, get_current_user
from database import get_db
from schemas import ReuniaoCreate, ReuniaoUpdate
from services import (
    create_reuniao_service,
    update_reuniao_service,
    list_reunioes_service,
    get_reuniao_service,
)

router = APIRouter(prefix="/reunioes", tags=["reunioes"])


@router.post("")
def create_reuniao(
    data: ReuniaoCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_gestor),
):
    return create_reuniao_service(data, current_user, db)


@router.get("")
def list_reunioes(
    turma_id: int | None = Query(default=None),
    semestre: str | None = Query(default=None),
    ano_letivo: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return list_reunioes_service(
        db,
        current_user,
        turma_id=turma_id,
        semestre=semestre,
        ano_letivo=ano_letivo,
    )


@router.get("/{reuniao_id}")
def get_reuniao(
    reuniao_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_reuniao_service(reuniao_id, current_user, db)


@router.patch("/{reuniao_id}")
def update_reuniao(
    reuniao_id: int,
    data: ReuniaoUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    return update_reuniao_service(reuniao_id, data, db)
