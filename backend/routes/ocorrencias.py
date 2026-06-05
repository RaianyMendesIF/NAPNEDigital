from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.ocorrencia import Ocorrencia
from schemas.ocorrencia_schemas import OcorrenciaCreate, OcorrenciaUpdate, OcorrenciaResponse

router = APIRouter(prefix="/ocorrencias", tags=["ocorrencias"])

@router.get("/", response_model=list[OcorrenciaResponse])
def list_ocorrencias(db: Session = Depends(get_db)):
    ocorrencias = db.query(Ocorrencia).all()
    return ocorrencias

@router.get("/{ocorrencia_id}", response_model=OcorrenciaResponse)
def get_ocorrencia(ocorrencia_id: int, db: Session = Depends(get_db)):
    ocorrencia = db.query(Ocorrencia).filter(Ocorrencia.id == ocorrencia_id).first()
    if not ocorrencia:
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada")
    return ocorrencia

@router.post("/", response_model=OcorrenciaResponse)
def create_ocorrencia(ocorrencia_data: OcorrenciaCreate, db: Session = Depends(get_db)):
    nova_ocorrencia = Ocorrencia(**ocorrencia_data.dict())
    db.add(nova_ocorrencia)
    db.commit()
    db.refresh(nova_ocorrencia)
    return nova_ocorrencia

@router.put("/{ocorrencia_id}", response_model=OcorrenciaResponse)
def update_ocorrencia(ocorrencia_id: int, ocorrencia_data: OcorrenciaUpdate, db: Session = Depends(get_db)):
    ocorrencia = db.query(Ocorrencia).filter(Ocorrencia.id == ocorrencia_id).first()
    if not ocorrencia:
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada")
    
    for key, value in ocorrencia_data.dict(exclude_unset=True).items():
        setattr(ocorrencia, key, value)
    
    db.commit()
    db.refresh(ocorrencia)
    return ocorrencia

@router.delete("/{ocorrencia_id}")
def delete_ocorrencia(ocorrencia_id: int, db: Session = Depends(get_db)):
    ocorrencia = db.query(Ocorrencia).filter(Ocorrencia.id == ocorrencia_id).first()
    if not ocorrencia:
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada")
    
    db.delete(ocorrencia)
    db.commit()
    return {"message": "Ocorrência deletada com sucesso"}
