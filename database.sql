CREATE DATABASE IF NOT EXISTS napne_digital;
USE napne_digital;

-- 0. Tabela de Usuários e Autenticação
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    siape VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password VARCHAR(255) NOT NULL, -- Idealmente usar hash bcrypt
    role ENUM('Acompanhadora', 'Coordenadora', 'Admin') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 1. Tabela de Professores/Servidores (Evita redundância de nomes)
CREATE TABLE IF NOT EXISTS teachers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    user_id INT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 2. TABELA: RESPONSÁVEL (Pais ou tutores dos alunos)
CREATE TABLE Responsavel (
    id_responsavel SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    contato VARCHAR(20) NOT NULL,
    email VARCHAR(100)
);

-- 3. Tabela de Acompanhadoras (muitos para muitos com Alunos)
CREATE TABLE IF NOT EXISTS acompanhadoras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    teacher_id INT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

-- 4. Tabela de Relacionamento Acompanhadora x Aluno (Muitos para Muitos)
CREATE TABLE IF NOT EXISTS acompanhadora_students (
    acompanhadora_id INT NOT NULL,
    student_id INT NOT NULL,
    PRIMARY KEY (acompanhadora_id, student_id),
    FOREIGN KEY (acompanhadora_id) REFERENCES acompanhadoras(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 5. Tabela de Relacionamento Aluno x Professor (Muitos para Muitos)
CREATE TABLE IF NOT EXISTS student_teachers (
    student_id INT,
    teacher_id INT,
    PRIMARY KEY (student_id, teacher_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

-- 6. Tabela de Atendimentos (CareLog / TimelineEvents)
CREATE TABLE IF NOT EXISTS care_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    type VARCHAR(100) NOT NULL,
    staff_id INT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES teachers(id)
);

-- 7. Tabela de Reuniões (Meetings) - ATUALIZADA COM STATUS
CREATE TABLE IF NOT EXISTS meetings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    meeting_date DATE NOT NULL,
    meeting_time TIME NOT NULL,
    type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('Agendada', 'Concluída', 'Pendente') NOT NULL DEFAULT 'Agendada',
    completed_at DATETIME,
    completed_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL
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

-- 8. Tabela de Ocorrências (Occurrences)
CREATE TABLE IF NOT EXISTS occurrences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    subject VARCHAR(150) NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    occurrence_date DATE NOT NULL,
    author_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES teachers(id)
);



-- Usuários do Sistema
INSERT INTO users (siape, name, email, password, role) VALUES 
('8472910', 'Rafael Mendes', 'rafael.mendes@ifms.edu.br', 'hashed_password_123', 'Coordenadora'),
('1029384', 'Camila Rocha', 'camila.rocha@ifms.edu.br', 'hashed_password_456', 'Acompanhadora'),
('2048593', 'Anderson Lima', 'anderson.lima@ifms.edu.br', 'hashed_password_789', 'Acompanhadora'),
('9384751', 'Juliana Castro', 'juliana.castro@ifms.edu.br', 'hashed_password_012', 'Acompanhadora'),
('5729481', 'Carlos Mendes', 'carlos.mendes@ifms.edu.br', 'hashed_password_345', 'Acompanhadora'),
('1234567', 'Renata Souza', 'renata.souza@ifms.edu.br', 'hashed_password_678', 'Acompanhadora'),
('9876543', 'Roberto Alves', 'roberto.alves@ifms.edu.br', 'hashed_password_901', 'Acompanhadora'),
('5555555', 'Fernanda Costa', 'fernanda.costa@ifms.edu.br', 'hashed_password_234', 'Acompanhadora'),
('6666666', 'Diego Faria', 'diego.faria@ifms.edu.br', 'hashed_password_567', 'Acompanhadora');

-- Professores / Equipe do Campus
INSERT INTO teachers (name, user_id) VALUES 
('Camila Rocha', 2),
('Anderson Lima', 3),
('Juliana Castro', 4),
('Carlos Mendes', 5),
('Renata Souza', 6),
('Roberto Alves', 7),
('Fernanda Costa', 8),
('Diego Faria', 9),
('Coord. Rafael Mendes', 1);

-- Acompanhadoras (criação de registros na tabela acompanhadoras)
INSERT INTO acompanhadoras (user_id, teacher_id) VALUES 
(2, 1),  -- Camila
(3, 2),  -- Anderson
(4, 3),  -- Juliana
(5, 4),  -- Carlos
(6, 5),  -- Renata
(7, 6),  -- Roberto
(8, 7),  -- Fernanda
(9, 8);  -- Diego

-- Relacionamento Acompanhadora x Aluno
-- Camila acompanha Lucas e Isabela
INSERT INTO acompanhadora_students (acompanhadora_id, student_id) VALUES
(1, 1),  -- Camila acompanha Lucas
(1, 4);  -- Camila acompanha Isabela

-- Anderson acompanha Lucas e Gabriel
INSERT INTO acompanhadora_students (acompanhadora_id, student_id) VALUES
(2, 1),  -- Anderson acompanha Lucas
(2, 5);  -- Anderson acompanha Gabriel

-- Juliana acompanha Lucas e Gabriel
INSERT INTO acompanhadora_students (acompanhadora_id, student_id) VALUES
(3, 1),  -- Juliana acompanha Lucas
(3, 5);  -- Juliana acompanha Gabriel

-- Carlos acompanha Ana e Vitória
INSERT INTO acompanhadora_students (acompanhadora_id, student_id) VALUES
(4, 2),  -- Carlos acompanha Ana
(4, 6);  -- Carlos acompanha Vitória

-- Renata acompanha Ana e Vitória
INSERT INTO acompanhadora_students (acompanhadora_id, student_id) VALUES
(5, 2),  -- Renata acompanha Ana
(5, 6);  -- Renata acompanha Vitória

-- Roberto acompanha Matheus
INSERT INTO acompanhadora_students (acompanhadora_id, student_id) VALUES
(6, 3);  -- Roberto acompanha Matheus

-- Fernanda acompanha Matheus
INSERT INTO acompanhadora_students (acompanhadora_id, student_id) VALUES
(7, 3);  -- Fernanda acompanha Matheus

-- Diego acompanha Isabela
INSERT INTO acompanhadora_students (acompanhadora_id, student_id) VALUES
(8, 4);  -- Diego acompanha Isabela

-- População de Alunos
INSERT INTO students (id, name, registration, need, need_color, course, year_group, status, alert) VALUES
(1, 'Lucas Henrique Moreira', '2023001', 'TEA', 'blue', 'Técnico em Informática', '3º Semestre/Matutino', 'Ativo', TRUE),
(2, 'Ana Clara Ferreira', '2023045', 'Deficiência Visual', 'purple', 'Técnico em Informática', '1º Semestre/Matutino', 'Ativo', FALSE),
(3, 'Matheus Souza Costa', '2022088', 'Altas Habilidades', 'teal', 'Técnico em Eletrotécnica', '3º Semestre/Vespertino', 'Acompanhamento', FALSE),
(4, 'Isabela Ramos Nunes', '2023112', 'TDAH', 'amber', 'Técnico em Química', '3º Semestre/Vespertino', 'Ativo', FALSE),
(5, 'Gabriel Pereira Lima', '2021034', 'Deficiência Auditiva', 'indigo', 'Técnico em Informática', '3º Semestre/Matutino', 'Ativo', FALSE),
(6, 'Vitória Almeida Santos', '2023078', 'Dislexia', 'rose', 'Técnico em Eletrotécnica', '1º Semestre/Vespertino', 'Acompanhamento', FALSE);

-- Vínculos de Professores aos seus respectivos Alunos
INSERT INTO student_teachers (student_id, teacher_id) VALUES
(1, 1), (1, 2), (1, 3), -- Lucas: Camila, Anderson, Juliana
(2, 4), (2, 5),         -- Ana Clara: Carlos, Renata
(3, 6), (3, 7),         -- Matheus: Roberto, Fernanda
(4, 1), (4, 8),         -- Isabela: Camila, Diego
(5, 2), (5, 3),         -- Gabriel: Anderson, Juliana
(6, 4), (6, 5);         -- Vitória: Carlos, Renata

-- Histórico de Atendimentos (CareLog / Timeline)
-- Nota: Datas convertidas do formato pt-BR para o padrão SQL YYYY-MM-DD
INSERT INTO care_logs (student_id, event_date, event_time, type, staff_id, description) VALUES
(1, '2026-05-22', '14:30:00', 'Atendimento Individual', 1, 'Conversa sobre adaptações nas avaliações de Matemática. Aluno demonstrou progresso significativo na comunicação verbal. Revisados recursos de apoio disponíveis.'),
(2, '2026-05-15', '10:00:00', 'Reunião com Pais', 9, 'Reunião com a mãe, Sra. Patrícia Moreira. Discutidas estratégias de rotina em casa para reforçar os trabalhos realizados no campus.'),
(1, '2026-05-08', '09:15:00', 'Ocorrência Comportamental', 3, 'Aluno apresentou dificuldade de integração em atividade de grupo na aula de P.O.O. Equipe notificada. Plano de intervenção revisado.'),
(3, '2026-04-28', '11:00:00', 'Solicitação de Prorrogação', 9, 'Prorrogação de 7 dias concedida para entrega do TCC semestral (Disciplina: Banco de Dados). Deferido conforme PEI vigente.'),
(4, '2026-04-10', '15:45:00', 'Atendimento Individual', 1, 'Sessão de acompanhamento pedagógico. Elaboração de mapa mental para organização dos conteúdos do semestre.'),
-- Dados de 2025 da lista secundária
(1, '2025-05-22', '14:30:00', 'Atendimento Individual', 1, 'Conversa sobre adaptações nas avaliações de Matemática. Aluno demonstrou progresso significativo na comunicação verbal. Revisados recursos de apoio disponíveis.'),
(2, '2025-05-15', '10:00:00', 'Reunião com Pais', 9, 'Reunião com a mãe, Sra. Patrícia Moreira. Discutidas estratégias de rotina em casa para reforçar os trabalhos realizados no campus.'),
(1, '2025-05-08', '09:15:00', 'Ocorrência Comportamental', 3, 'Aluno apresentou dificuldade de integração em atividade de grupo na aula de P.O.O. Equipe notificada. Plano de intervenção revisado.'),
(3, '2025-04-28', '11:00:00', 'Solicitação de Prorrogação', 9, 'Prorrogação de 7 dias concedida para entrega do TCC semestral (Disciplina: Banco de Dados). Deferido conforme PEI vigente.'),
(4, '2025-04-10', '15:45:00', 'Atendimento Individual', 1, 'Sessão de acompanhamento pedagógico. Elaboração de mapa mental para organização dos conteúdos do semestre.');

-- Reuniões Agendadas (Meetings) - ATUALIZADA COM STATUS
INSERT INTO meetings (id, student_id, meeting_date, meeting_time, type, description, status, completed_at, completed_by) VALUES
(1, 1, '2026-05-26', '14:00:00', 'Revisão de PEI', 'Revisão do PEI semestral com equipe docente.', 'Concluída', '2026-05-26 14:45:00', 1),
(2, 2, '2026-05-28', '09:30:00', 'Atendimento Pedagógico', 'Discussão sobre adaptação nas provas de Contabilidade.', 'Agendada', NULL, NULL),
(3, 5, '2026-05-30', '10:00:00', 'Reunião com Família', 'Reunião com os pais para alinhamento do plano de acompanhamento.', 'Pendente', NULL, NULL);

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