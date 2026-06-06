from datetime import date

from sqlalchemy.orm import Session

from models import Aluno, Atendimento, Cargo, StatusAluno, Usuario
from core.dependencies import ids_alunos_visiveis_usuario
from schemas import AtendimentoCreate, AtendimentoUpdate
from utils import error_message, success_message


def _usuario_resumo(usuario_id: int, db: Session | None = None, usuario: Usuario | None = None) -> dict:
    resolved = usuario if usuario and usuario.id == usuario_id else None
    if resolved is None and db is not None:
        resolved = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not resolved:
        return {}
    cargo = resolved.cargo.value if hasattr(resolved.cargo, "value") else resolved.cargo
    return {"usuario_nome": resolved.nome, "usuario_cargo": cargo}


def _atendimento_data(
    atendimento: Atendimento,
    db: Session | None = None,
    usuario: Usuario | None = None,
) -> dict:
    return {
        "id": atendimento.id,
        "aluno_id": atendimento.aluno_id,
        "usuario_id": atendimento.usuario_id,
        "tipo": atendimento.tipo,
        "descricao": atendimento.descricao,
        "data_atendimento": atendimento.data_solicitacao,
        **_usuario_resumo(atendimento.usuario_id, db, usuario),
    }


def _aluno_acessivel_por_usuario(aluno: Aluno, usuario: Usuario) -> bool:
    if usuario.cargo == Cargo.COORDENADOR:
        return True
    if usuario.cargo == Cargo.ACOMPANHANTE:
        return aluno.acompanhante_id == usuario.id
    return False


def _resolver_responsavel_id(
    data: AtendimentoCreate, usuario: Usuario, db: Session
) -> int | dict:
    if usuario.cargo == Cargo.ACOMPANHANTE:
        return usuario.id

    responsavel_id = data.responsavel_id or usuario.id
    responsavel = db.query(Usuario).filter(Usuario.id == responsavel_id).first()
    if not responsavel:
        return error_message("Responsável não encontrado", 404)
    if responsavel.cargo not in (Cargo.COORDENADOR, Cargo.ACOMPANHANTE):
        return error_message("O responsável deve ser coordenador ou acompanhante", 400)
    return responsavel_id


def create_atendimento_service(
    data: AtendimentoCreate, usuario: Usuario, db: Session
):
    aluno = db.query(Aluno).filter(Aluno.id == data.aluno_id).first()
    if not aluno:
        return error_message("Aluno não encontrado", 404)

    if aluno.status != StatusAluno.ATIVO:
        return error_message("Aluno inativo", 400)

    if not _aluno_acessivel_por_usuario(aluno, usuario):
        return error_message("Sem permissão para registrar atendimento deste aluno", 403)

    responsavel_id = _resolver_responsavel_id(data, usuario, db)
    if isinstance(responsavel_id, dict):
        return responsavel_id

    responsavel = db.query(Usuario).filter(Usuario.id == responsavel_id).first()

    atendimento = Atendimento(
        aluno_id=data.aluno_id,
        usuario_id=responsavel_id,
        tipo=data.tipo,
        descricao=data.descricao,
        data_solicitacao=data.data_atendimento or date.today(),
    )
    db.add(atendimento)
    db.commit()
    db.refresh(atendimento)
    return success_message(
        data=_atendimento_data(atendimento, db=db, usuario=responsavel),
        message="Atendimento registrado com sucesso",
    )


def list_atendimentos_service(
    db: Session,
    usuario: Usuario | None = None,
    aluno_id: int | None = None,
    data_inicial: date | None = None,
    data_final: date | None = None,
):
    query = db.query(Atendimento)

    if usuario is not None:
        ids_visiveis = ids_alunos_visiveis_usuario(usuario, db)
        if ids_visiveis is not None:
            if not ids_visiveis:
                return success_message(data=[], message="Atendimentos listados com sucesso")
            query = query.filter(Atendimento.aluno_id.in_(ids_visiveis))

    if aluno_id is not None:
        query = query.filter(Atendimento.aluno_id == aluno_id)
    if data_inicial is not None:
        query = query.filter(Atendimento.data_solicitacao >= data_inicial)
    if data_final is not None:
        query = query.filter(Atendimento.data_solicitacao <= data_final)
    atendimentos = query.order_by(Atendimento.data_solicitacao.desc()).all()
    return success_message(
        data=[_atendimento_data(a, db=db) for a in atendimentos],
        message="Atendimentos listados com sucesso",
    )


def get_atendimento_service(atendimento_id: int, db: Session):
    atendimento = db.query(Atendimento).filter(Atendimento.id == atendimento_id).first()
    if not atendimento:
        return error_message("Atendimento não encontrado", 404)
    return success_message(
        data=_atendimento_data(atendimento, db=db),
        message="Atendimento encontrado",
    )


def update_atendimento_service(
    atendimento_id: int, data: AtendimentoUpdate, db: Session
):
    atendimento = db.query(Atendimento).filter(Atendimento.id == atendimento_id).first()
    if not atendimento:
        return error_message("Atendimento não encontrado", 404)

    updates = data.model_dump(exclude_unset=True)
    if "data_atendimento" in updates:
        updates["data_solicitacao"] = updates.pop("data_atendimento")

    for field, value in updates.items():
        setattr(atendimento, field, value)

    db.commit()
    db.refresh(atendimento)
    return success_message(
        data=_atendimento_data(atendimento, db=db),
        message="Atendimento atualizado com sucesso",
    )
