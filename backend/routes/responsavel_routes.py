from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core import require_admin, get_current_user
from database import get_db
from schemas import ResponsavelCreate, ResponsavelUpdate
from services import (
    create_responsavel_service,
    list_responsaveis_service,
    get_responsavel_service,
    update_responsavel_service,
    delete_responsavel_service,
)

router = APIRouter(prefix="/responsaveis", tags=["responsaveis"])


@router.post("")
def create_responsavel(
    data: ResponsavelCreate,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    return create_responsavel_service(data, db)


@router.get("")
def get_responsaveis(
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    return list_responsaveis_service(db)


@router.get("/{responsavel_id}")
def get_responsavel(
    responsavel_id: int,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    return get_responsavel_service(responsavel_id, db)


@router.put("/{responsavel_id}")
def update_responsavel(
    responsavel_id: int,
    data: ResponsavelUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    return update_responsavel_service(responsavel_id, data, db)


@router.delete("/{responsavel_id}")
def delete_responsavel(
    responsavel_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    return delete_responsavel_service(responsavel_id, db)
