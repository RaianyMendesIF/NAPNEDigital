from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core import require_admin
from database import get_db
from schemas import ReuniaoCreate
from services import create_reuniao_service

router = APIRouter(prefix="/reunioes", tags=["reunioes"])


@router.post("")
def create_reuniao(
    data: ReuniaoCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    return create_reuniao_service(data, current_user, db)
