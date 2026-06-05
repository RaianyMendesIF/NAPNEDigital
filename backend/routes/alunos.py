from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.aluno import Aluno
from schemas.aluno_schemas import AlunoCreate, AlunoUpdate, AlunoResponse

router = APIRouter(prefix="/alunos", tags=["alunos"])

@router.get("/", response_model=list[AlunoResponse])
def list_alunos(db: Session = Depends(get_db)):
    alunos = db.query(Aluno).all()
    return alunos

@router.get("/{aluno_id}", response_model=AlunoResponse)
def get_aluno(aluno_id: int, db: Session = Depends(get_db)):
    aluno = db.query(Aluno).filter(Aluno.id == aluno_id).first()
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    return aluno

@router.post("/", response_model=AlunoResponse)
def create_aluno(aluno_data: AlunoCreate, db: Session = Depends(get_db)):
    novo_aluno = Aluno(**aluno_data.dict())
    db.add(novo_aluno)
    db.commit()
    db.refresh(novo_aluno)
    return novo_aluno

@router.put("/{aluno_id}", response_model=AlunoResponse)
def update_aluno(aluno_id: int, aluno_data: AlunoUpdate, db: Session = Depends(get_db)):
    aluno = db.query(Aluno).filter(Aluno.id == aluno_id).first()
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    
    for key, value in aluno_data.dict(exclude_unset=True).items():
        setattr(aluno, key, value)
    
    db.commit()
    db.refresh(aluno)
    return aluno

@router.delete("/{aluno_id}")
def delete_aluno(aluno_id: int, db: Session = Depends(get_db)):
    aluno = db.query(Aluno).filter(Aluno.id == aluno_id).first()
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    
    db.delete(aluno)
    db.commit()
    return {"message": "Aluno deletado com sucesso"}
