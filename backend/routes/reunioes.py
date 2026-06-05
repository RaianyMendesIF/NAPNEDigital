from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.reuniao import Reuniao
from schemas.reuniao_schemas import ReuniaoCreate, ReuniaoUpdate, ReuniaoResponse

router = APIRouter(prefix="/reunioes", tags=["reunioes"])

@router.get("/", response_model=list[ReuniaoResponse])
def list_reunioes(db: Session = Depends(get_db)):
    reunioes = db.query(Reuniao).all()
    return reunioes

@router.get("/{reuniao_id}", response_model=ReuniaoResponse)
def get_reuniao(reuniao_id: int, db: Session = Depends(get_db)):
    reuniao = db.query(Reuniao).filter(Reuniao.id == reuniao_id).first()
    if not reuniao:
        raise HTTPException(status_code=404, detail="Reunião não encontrada")
    return reuniao

@router.post("/", response_model=ReuniaoResponse)
def create_reuniao(reuniao_data: ReuniaoCreate, db: Session = Depends(get_db)):
    nova_reuniao = Reuniao(**reuniao_data.dict())
    db.add(nova_reuniao)
    db.commit()
    db.refresh(nova_reuniao)
    return nova_reuniao

@router.put("/{reuniao_id}", response_model=ReuniaoResponse)
def update_reuniao(reuniao_id: int, reuniao_data: ReuniaoUpdate, db: Session = Depends(get_db)):
    reuniao = db.query(Reuniao).filter(Reuniao.id == reuniao_id).first()
    if not reuniao:
        raise HTTPException(status_code=404, detail="Reunião não encontrada")
    
    for key, value in reuniao_data.dict(exclude_unset=True).items():
        setattr(reuniao, key, value)
    
    db.commit()
    db.refresh(reuniao)
    return reuniao

@router.delete("/{reuniao_id}")
def delete_reuniao(reuniao_id: int, db: Session = Depends(get_db)):
    reuniao = db.query(Reuniao).filter(Reuniao.id == reuniao_id).first()
    if not reuniao:
        raise HTTPException(status_code=404, detail="Reunião não encontrada")
    
    db.delete(reuniao)
    db.commit()
    return {"message": "Reunião deletada com sucesso"}
