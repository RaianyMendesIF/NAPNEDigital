from .aluno import Aluno, StatusAluno
from .atendimento import Atendimento
from .documentacao import Documentacao, StatusDocumentacao
from .ocorrencia import Ocorrencia
from .professorTurma import ProfessorTurma, StatusProfessorTurma
from .responsavel import Responsavel
from .reuniao import Reuniao, StatusReuniao
from .solicitacao import Solicitacao, StatusSolicitacao
from .turma import Semestre, Turma
from .usuario import Cargo, StatusUsuario, Usuario

__all__ = [
    "Aluno",
    "StatusAluno",
    "Atendimento",
    "Documentacao",
    "StatusDocumentacao",
    "Ocorrencia",
    "ProfessorTurma",
    "StatusProfessorTurma",
    "Responsavel",
    "Reuniao",
    "StatusReuniao",
    "Solicitacao",
    "StatusSolicitacao",
    "Semestre",
    "Turma",
    "Cargo",
    "StatusUsuario",
    "Usuario",
]
