CREATE DATABASE IF NOT EXISTS napne_digital;
USE napne_digital;

-- 1. TABELA: USUÁRIO (Corpo Docente, Psicólogos, Coordenadores)
CREATE TABLE Usuario (
    id_usuario SERIAL PRIMARY KEY,
    siape VARCHAR(20) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    cargo VARCHAR(50) NOT NULL, -- 'Professor', 'Psicólogo', 'Coordenador SINAPNE', etc.
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL
);

-- 2. TABELA: RESPONSÁVEL (Pais ou tutores dos alunos)
CREATE TABLE Responsavel (
    id_responsavel SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    contato VARCHAR(20) NOT NULL,
    email VARCHAR(100)
);

-- 3. TABELA: ALUNO (Estudantes com necessidades específicas)
CREATE TABLE Aluno (
    id_aluno SERIAL PRIMARY KEY,
    matricula VARCHAR(20) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    data_nascimento DATE NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    curso VARCHAR(100) NOT NULL,
    ano VARCHAR(20) NOT NULL, -- '1º Ano', '3º Semestre', etc.
    necessidade_especial VARCHAR(100) NOT NULL, -- 'TEA', 'TDAH', etc.
    cid VARCHAR(10),
    observacao TEXT,
    id_responsavel INT,
    FOREIGN KEY (id_responsavel) REFERENCES Responsavel(id_responsavel) ON DELETE SET NULL
);

-- 4. TABELA: TURMA / CICLO SEMESTRAL
-- Vincula o aluno ao seu período letivo atual
CREATE TABLE Turma (
    id_turma SERIAL PRIMARY KEY,
    id_aluno INT NOT NULL,
    ano_letivo INT NOT NULL, -- Ex: 2026
    semestre INT NOT NULL,    -- Ex: 1 ou 2
    FOREIGN KEY (id_aluno) REFERENCES Aluno(id_aluno) ON DELETE CASCADE
);

-- 5. TABELA INTERMEDIÁRIA: VÍNCULO PROFESSOR-TURMA
-- Permite associar MÚLTIPLOS professores à "Turma/Ciclo" daquele aluno específico
CREATE TABLE Professor_Turma (
    id_turma INT NOT NULL,
    id_usuario INT NOT NULL, -- O Usuário aqui deve ser do cargo 'Professor'
    materia VARCHAR(100) NOT NULL,
    PRIMARY KEY (id_turma, id_usuario),
    FOREIGN KEY (id_turma) REFERENCES Turma(id_turma) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE CASCADE
);

-- 6. TABELA: DOCUMENTAÇÃO (Laudos, PEI, Relatórios)
CREATE TABLE Documentation (
    id_documento SERIAL PRIMARY KEY,
    id_aluno INT NOT NULL,
    id_usuario INT NOT NULL, -- Quem enviou/criou o documento
    nome VARCHAR(150) NOT NULL, -- Ex: 'Plano Educacional Individualizado'
    ano_letivo INT NOT NULL,
    semestre INT NOT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) DEFAULT 'Pendente', -- 'Pendente', 'Aprovado', 'Vencido'
    FOREIGN KEY (id_aluno) REFERENCES Aluno(id_aluno) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE RESTRICT
);

-- 7. TABELA: SOLICITAÇÕES (Prorrogações de prazos, adaptações de provas)
CREATE TABLE Solicitacoes (
    id_solicitacao SERIAL PRIMARY KEY,
    id_turma INT NOT NULL, -- Vincula ao contexto do aluno e professores do semestre
    descricao TEXT NOT NULL,
    data_solicitacao DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(30) DEFAULT 'Em Análise', -- 'Em Análise', 'Deferido', 'Indeferido'
    FOREIGN KEY (id_turma) REFERENCES Turma(id_turma) ON DELETE CASCADE
);

-- 8. TABELA: ATENDIMENTO (Registros de conversas e acompanhamentos individuais)
CREATE TABLE Atendimento (
    id_atendimento SERIAL PRIMARY KEY,
    id_aluno INT NOT NULL,
    id_usuario INT NOT NULL, -- Servidor (Psicólogo, Coordenador, etc.) que realizou o atendimento
    tipo VARCHAR(50) NOT NULL, -- 'Atendimento Individual', 'Reunião com Pais', etc.
    descricao TEXT NOT NULL,
    data TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_aluno) REFERENCES Aluno(id_aluno) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE RESTRICT
);

-- 9. TABELA: REUNIÃO (Conselhos de classe NAPNE, alinhamento pedagógico)
CREATE TABLE Reuniao (
    id_reuniao SERIAL PRIMARY KEY,
    id_turma INT NOT NULL, -- Puxa automaticamente o aluno e os professores daquele semestre
    data_hora TIMESTAMP NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    descricao TEXT,
    status VARCHAR(30) DEFAULT 'Agendada', -- 'Agendada', 'Realizada', 'Cancelada'
    FOREIGN KEY (id_turma) REFERENCES Turma(id_turma) ON DELETE CASCADE
);

-- 10. TABELA: OCORRÊNCIA (Dificuldades em sala de aula, crises, isolamento)
CREATE TABLE Ocorrencia (
    id_ocorrencia SERIAL PRIMARY KEY,
    id_turma INT NOT NULL,
    id_usuario INT NOT NULL, -- Professor ou Servidor que testemunhou/registrou
    titulo VARCHAR(150) NOT NULL,
    descricao TEXT NOT NULL,
    data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_turma) REFERENCES Turma(id_turma) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE RESTRICT
);