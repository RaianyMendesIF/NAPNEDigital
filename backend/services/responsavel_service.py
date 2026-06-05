from sqlalchemy import or_
from sqlalchemy.orm import Session

from models import Responsavel, Aluno
from schemas import ResponsavelCreate, ResponsavelUpdate
from utils import error_message, success_message


def _responsavel_data(responsavel: Responsavel) -> dict:
    return {
        "id": responsavel.id,
        "nome": responsavel.nome,
        "telefone": responsavel.telefone,
        "email": responsavel.email,
    }


def create_responsavel_service(data: ResponsavelCreate, db: Session):
    responsavel = Responsavel(
        nome=data.nome,
        telefone=data.telefone,
        email=data.email,
    )
    db.add(responsavel)
    db.commit()
    db.refresh(responsavel)
    return success_message(
        data=_responsavel_data(responsavel),
        message="Responsável criado com sucesso",
    )


def list_responsaveis_service(db: Session, busca: str | None = None):
    query = db.query(Responsavel)
    if busca:
        termo = f"%{busca.strip()}%"
        query = query.filter(
            or_(
                Responsavel.nome.ilike(termo),
                Responsavel.email.ilike(termo),
                Responsavel.telefone.ilike(termo),
            )
        )
    responsaveis = query.order_by(Responsavel.nome).all()
    return success_message(
        data=[_responsavel_data(r) for r in responsaveis],
        message="Responsáveis listados com sucesso",
    )


def get_responsavel_service(responsavel_id: int, db: Session):
    responsavel = db.query(Responsavel).filter(Responsavel.id == responsavel_id).first()
    if not responsavel:
        return error_message("Responsável não encontrado", 404)
    return success_message(
        data=_responsavel_data(responsavel),
        message="Responsável encontrado",
    )


def update_responsavel_service(
    responsavel_id: int, data: ResponsavelUpdate, db: Session
):
    responsavel = db.query(Responsavel).filter(Responsavel.id == responsavel_id).first()
    if not responsavel:
        return error_message("Responsável não encontrado", 404)

    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(responsavel, field, value)

    db.commit()
    db.refresh(responsavel)
    return success_message(
        data=_responsavel_data(responsavel),
        message="Responsável atualizado com sucesso",
    )


def delete_responsavel_service(responsavel_id: int, db: Session):
    responsavel = db.query(Responsavel).filter(Responsavel.id == responsavel_id).first()
    if not responsavel:
        return error_message("Responsável não encontrado", 404)

    alunos_vinculados = (
        db.query(Aluno).filter(Aluno.responsavel_id == responsavel_id).count()
    )
    if alunos_vinculados > 0:
        return error_message(
            "Responsável possui alunos vinculados e não pode ser removido",
            400,
        )

    db.delete(responsavel)
    db.commit()
    return success_message(
        data=None,
        message="Responsável removido com sucesso",
    )
