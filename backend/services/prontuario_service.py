from sqlalchemy.orm import Session

from models import (
    Aluno,
    Atendimento,
    Cargo,
    Documentacao,
    Ocorrencia,
    ProfessorTurma,
    Responsavel,
    Reuniao,
    Solicitacao,
    Turma,
    Usuario,
)
from core.dependencies import usuario_pode_ver_prontuario
from services.aluno_service import _aluno_data
from services.documentacao_service import _documentacao_data
from services.atendimento_service import _atendimento_data
from services.ocorrencia_service import _ocorrencia_data
from services.reuniao_service import _reuniao_data
from services.solicitacao_service import _solicitacao_data
from services.turma_service import _turma_data, _professor_turma_data
from utils import error_message, success_message


def _responsavel_data(responsavel: Responsavel) -> dict:
    return {
        "id": responsavel.id,
        "nome": responsavel.nome,
        "telefone": responsavel.telefone,
        "email": responsavel.email,
    }


def _professor_info(vinculo: ProfessorTurma, db: Session) -> dict:
    data = _professor_turma_data(vinculo)
    professor = db.query(Usuario).filter(Usuario.id == vinculo.usuario_id).first()
    if professor:
        data["nome"] = professor.nome
        data["siape"] = professor.siape
    return data


def _montar_prontuario_completo(aluno: Aluno, db: Session) -> dict:
    turmas = db.query(Turma).filter(Turma.aluno_id == aluno.id).order_by(
        Turma.ano_letivo.desc()
    ).all()
    turma_ids = [t.id for t in turmas]

    responsavel = None
    if aluno.responsavel_id:
        resp = db.query(Responsavel).filter(Responsavel.id == aluno.responsavel_id).first()
        if resp:
            responsavel = _responsavel_data(resp)

    professores = []
    if turma_ids:
        vinculos = (
            db.query(ProfessorTurma)
            .filter(ProfessorTurma.turma_id.in_(turma_ids))
            .all()
        )
        professores = [_professor_info(v, db) for v in vinculos]

    documentacoes = (
        db.query(Documentacao)
        .filter(Documentacao.aluno_id == aluno.id)
        .order_by(Documentacao.data_criacao.desc())
        .all()
    )

    atendimentos = (
        db.query(Atendimento)
        .filter(Atendimento.aluno_id == aluno.id)
        .order_by(Atendimento.data_solicitacao.desc())
        .all()
    )

    ocorrencias = []
    reunioes = []
    solicitacoes = []
    if turma_ids:
        ocorrencias = (
            db.query(Ocorrencia)
            .filter(Ocorrencia.turma_id.in_(turma_ids))
            .order_by(Ocorrencia.data_registro.desc())
            .all()
        )
        reunioes = (
            db.query(Reuniao)
            .filter(Reuniao.turma_id.in_(turma_ids))
            .order_by(Reuniao.data.desc())
            .all()
        )
        solicitacoes = (
            db.query(Solicitacao)
            .filter(Solicitacao.turma_id.in_(turma_ids))
            .order_by(Solicitacao.data_solicitacao.desc())
            .all()
        )

    return {
        "aluno": _aluno_data(aluno),
        "responsavel": responsavel,
        "turmas": [_turma_data(t) for t in turmas],
        "professores": professores,
        "documentacoes": [_documentacao_data(d) for d in documentacoes],
        "atendimentos": [_atendimento_data(a, db=db) for a in atendimentos],
        "ocorrencias": [_ocorrencia_data(o, db=db) for o in ocorrencias],
        "reunioes": [_reuniao_data(r, db) for r in reunioes],
        "solicitacoes": [_solicitacao_data(s, db) for s in solicitacoes],
    }


def _filtrar_por_cargo(prontuario: dict, cargo: Cargo) -> dict:
    if cargo == Cargo.COORDENADOR:
        return prontuario

    if cargo == Cargo.ACOMPANHANTE:
        return prontuario

    return {
        "aluno": None,
        "responsavel": None,
        "turmas": [],
        "professores": [],
        "documentacoes": [],
        "atendimentos": [],
        "ocorrencias": [],
        "reunioes": [],
        "solicitacoes": [],
    }


def get_prontuario_aluno(aluno_id: int, usuario: Usuario, db: Session):
    aluno = db.query(Aluno).filter(Aluno.id == aluno_id).first()
    if not aluno:
        return error_message("Aluno não encontrado", 404)

    if not usuario_pode_ver_prontuario(usuario, aluno_id, db):
        return error_message("Sem permissão para visualizar este prontuário", 403)

    completo = _montar_prontuario_completo(aluno, db)
    filtrado = _filtrar_por_cargo(completo, usuario.cargo)

    return success_message(
        data=filtrado,
        message="Prontuário carregado com sucesso",
    )
