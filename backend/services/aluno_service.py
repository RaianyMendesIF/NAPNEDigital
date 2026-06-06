from sqlalchemy import or_
from sqlalchemy.orm import Session

from core.dependencies import ids_alunos_visiveis_usuario
from models import Aluno, Cargo, Responsavel, StatusAluno, Usuario
from schemas import AlunoCreate, AlunoUpdate
from utils import error_message, success_message


def _aluno_data(aluno: Aluno, db: Session | None = None) -> dict:
    acompanhante_nome = None
    if aluno.acompanhante_id and db is not None:
        acompanhante = (
            db.query(Usuario)
            .filter(Usuario.id == aluno.acompanhante_id)
            .first()
        )
        if acompanhante:
            acompanhante_nome = acompanhante.nome

    return {
        "id": aluno.id,
        "matricula": aluno.matricula,
        "nome": aluno.nome,
        "data_nascimento": aluno.data_nascimento,
        "cpf": aluno.cpf,
        "telefone": aluno.telefone,
        "curso": aluno.curso,
        "ano": aluno.ano,
        "necessidade_especial": aluno.necessidade_especial,
        "cid": aluno.cid,
        "observacao": aluno.observacao,
        "responsavel_id": aluno.responsavel_id,
        "acompanhante_id": aluno.acompanhante_id,
        "acompanhante_nome": acompanhante_nome,
        "status": aluno.status.value if hasattr(aluno.status, "value") else aluno.status,
        "ativo": aluno.status == StatusAluno.ATIVO,
    }


def _validate_responsavel(responsavel_id: int | None, db: Session):
    if responsavel_id is None:
        return None
    responsavel = db.query(Responsavel).filter(Responsavel.id == responsavel_id).first()
    if not responsavel:
        return error_message("Responsável não encontrado", 404)
    return None


def _validate_acompanhante(acompanhante_id: int | None, db: Session):
    if acompanhante_id is None:
        return None
    acompanhante = db.query(Usuario).filter(Usuario.id == acompanhante_id).first()
    if not acompanhante:
        return error_message("Acompanhante não encontrado", 404)
    if acompanhante.cargo != Cargo.ACOMPANHANTE:
        return error_message("O usuário informado não é um acompanhante", 400)
    return None


def create_aluno_service(data: AlunoCreate, db: Session):
    responsavel_error = _validate_responsavel(data.responsavel_id, db)
    if responsavel_error:
        return responsavel_error

    acompanhante_error = _validate_acompanhante(data.acompanhante_id, db)
    if acompanhante_error:
        return acompanhante_error

    existing = (
        db.query(Aluno)
        .filter((Aluno.cpf == data.cpf) | (Aluno.matricula == data.matricula))
        .first()
    )
    if existing:
        if existing.cpf == data.cpf:
            return error_message("CPF já cadastrado", 400)
        return error_message("Matrícula já cadastrada", 400)

    aluno = Aluno(
        matricula=data.matricula,
        nome=data.nome,
        data_nascimento=data.data_nascimento,
        cpf=data.cpf,
        telefone=data.telefone,
        curso=data.curso,
        ano=data.ano,
        necessidade_especial=data.necessidade_especial,
        cid=data.cid,
        observacao=data.observacao,
        responsavel_id=data.responsavel_id,
        acompanhante_id=data.acompanhante_id,
        status=StatusAluno.ATIVO,
    )
    db.add(aluno)
    db.commit()
    db.refresh(aluno)
    return success_message(
        data=_aluno_data(aluno, db),
        message="Aluno criado com sucesso",
    )


def list_alunos_service(
    db: Session,
    usuario: Usuario | None = None,
    apenas_ativos: bool = False,
    busca: str | None = None,
):
    query = db.query(Aluno)

    if usuario is not None:
        ids_visiveis = ids_alunos_visiveis_usuario(usuario, db)
        if ids_visiveis is not None:
            if not ids_visiveis:
                return success_message(data=[], message="Alunos listados com sucesso")
            query = query.filter(Aluno.id.in_(ids_visiveis))

    if apenas_ativos:
        query = query.filter(Aluno.status == StatusAluno.ATIVO)
    if busca:
        termo = f"%{busca.strip()}%"
        query = query.filter(
            or_(
                Aluno.nome.ilike(termo),
                Aluno.cpf.ilike(termo),
                Aluno.matricula.ilike(termo),
            )
        )
    alunos = query.order_by(Aluno.nome).all()
    return success_message(
        data=[_aluno_data(a, db) for a in alunos],
        message="Alunos listados com sucesso",
    )


def get_aluno_service(aluno_id: int, db: Session, usuario: Usuario | None = None):
    aluno = db.query(Aluno).filter(Aluno.id == aluno_id).first()
    if not aluno:
        return error_message("Aluno não encontrado", 404)

    if usuario is not None:
        ids_visiveis = ids_alunos_visiveis_usuario(usuario, db)
        if ids_visiveis is not None and aluno_id not in ids_visiveis:
            return error_message("Sem permissão para visualizar este aluno", 403)
    return success_message(
        data=_aluno_data(aluno, db),
        message="Aluno encontrado",
    )


def update_aluno_service(aluno_id: int, data: AlunoUpdate, db: Session):
    aluno = db.query(Aluno).filter(Aluno.id == aluno_id).first()
    if not aluno:
        return error_message("Aluno não encontrado", 404)

    updates = data.model_dump(exclude_unset=True)

    if "responsavel_id" in updates:
        responsavel_error = _validate_responsavel(updates["responsavel_id"], db)
        if responsavel_error:
            return responsavel_error

    if "acompanhante_id" in updates:
        acompanhante_error = _validate_acompanhante(updates["acompanhante_id"], db)
        if acompanhante_error:
            return acompanhante_error

    if "cpf" in updates and updates["cpf"] != aluno.cpf:
        cpf_exists = (
            db.query(Aluno).filter(Aluno.cpf == updates["cpf"], Aluno.id != aluno_id).first()
        )
        if cpf_exists:
            return error_message("CPF já cadastrado", 400)

    if "matricula" in updates and updates["matricula"] != aluno.matricula:
        matricula_exists = (
            db.query(Aluno)
            .filter(Aluno.matricula == updates["matricula"], Aluno.id != aluno_id)
            .first()
        )
        if matricula_exists:
            return error_message("Matrícula já cadastrada", 400)

    if "status" in updates:
        try:
            updates["status"] = StatusAluno(updates["status"])
        except ValueError:
            return error_message("Status inválido. Use 'Ativo' ou 'Inativo'", 400)

    for field, value in updates.items():
        setattr(aluno, field, value)

    db.commit()
    db.refresh(aluno)
    return success_message(
        data=_aluno_data(aluno, db),
        message="Aluno atualizado com sucesso",
    )


def deactivate_aluno_service(aluno_id: int, db: Session):
    aluno = db.query(Aluno).filter(Aluno.id == aluno_id).first()
    if not aluno:
        return error_message("Aluno não encontrado", 404)

    if aluno.status == StatusAluno.INATIVO:
        return error_message("Aluno já está inativo", 400)

    aluno.status = StatusAluno.INATIVO
    db.commit()
    db.refresh(aluno)
    return success_message(
        data=_aluno_data(aluno, db),
        message="Aluno desativado com sucesso",
    )
