CREATE DATABASE IF NOT EXISTS napne_digital;
USE napne_digital;

-- 1. Tabela de Professores/Servidores (Evita redundância de nomes)
CREATE TABLE IF NOT EXISTS teachers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE
);

-- 2. Tabela de Alunos
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    registration VARCHAR(20) NOT NULL UNIQUE,
    need VARCHAR(100) NOT NULL,
    need_color VARCHAR(30) NOT NULL,
    course VARCHAR(150) NOT NULL,
    year_group VARCHAR(50) NOT NULL, -- 'year' é palavra reservada no MySQL
    status ENUM('Ativo', 'Acompanhamento', 'Inativo') NOT NULL DEFAULT 'Ativo',
    alert BOOLEAN DEFAULT FALSE
);

-- 3. Tabela de Relacionamento Aluno x Professor (Muitos para Muitos)
CREATE TABLE IF NOT EXISTS student_teachers (
    student_id INT,
    teacher_id INT,
    PRIMARY KEY (student_id, teacher_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

-- 4. Tabela de Atendimentos (CareLog / TimelineEvents)
CREATE TABLE IF NOT EXISTS care_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    type VARCHAR(100) NOT NULL,
    staff_id INT NOT NULL,
    description TEXT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES teachers(id)
);

-- 5. Tabela de Reuniões (Meetings)
CREATE TABLE IF NOT EXISTS meetings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    meeting_date DATE NOT NULL,
    meeting_time TIME NOT NULL,
    type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 6. Tabela de Relacionamento Reunião x Professores Convidados (Muitos para Muitos)
CREATE TABLE IF NOT EXISTS meeting_teachers (
    meeting_id INT,
    teacher_id INT,
    PRIMARY KEY (meeting_id, teacher_id),
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

-- 7. Tabela de Ocorrências (Occurrences)
CREATE TABLE IF NOT EXISTS occurrences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    subject VARCHAR(150) NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    occurrence_date DATE NOT NULL,
    author_id INT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES teachers(id)
);

-- População de Professores / Equipe do Campus
INSERT INTO teachers (name) VALUES 
('Profa. Camila Rocha'),
('Prof. Anderson Lima'),
('Profa. Juliana Castro'),
('Prof. Carlos Mendes'),
('Profa. Renata Souza'),
('Prof. Roberto Alves'),
('Profa. Fernanda Costa'),
('Prof. Diego Faria'),
('Coord. Rafael Mendes');

-- População de Alunos
INSERT INTO students (id, name, registration, need, need_color, course, year_group, status, alert) VALUES
(1, 'Lucas Henrique Moreira', '2023001', 'TEA', 'blue', 'Técnico em Informática', '2º Ano', 'Ativo', TRUE),
(2, 'Ana Clara Ferreira', '2023045', 'Deficiência Visual', 'purple', 'Técnico em Administração', '1º Ano', 'Ativo', FALSE),
(3, 'Matheus Souza Costa', '2022088', 'Altas Habilidades', 'teal', 'Técnico em Eletrotécnica', '3º Ano', 'Acompanhamento', FALSE),
(4, 'Isabela Ramos Nunes', '2023112', 'TDAH', 'amber', 'Técnico em Química', '2º Ano', 'Ativo', FALSE),
(5, 'Gabriel Pereira Lima', '2021034', 'Deficiência Auditiva', 'indigo', 'Técnico em Informática', '3º Ano', 'Ativo', FALSE),
(6, 'Vitória Almeida Santos', '2023078', 'Dislexia', 'rose', 'Técnico em Administração', '1º Ano', 'Acompanhamento', FALSE);

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

-- Reuniões Agendadas (Meetings)
INSERT INTO meetings (id, student_id, meeting_date, meeting_time, type, description) VALUES
(1, 1, '2025-05-26', '14:00:00', 'Revisão de PEI', 'Revisão do PEI semestral com equipe docente.'),
(2, 2, '2025-05-28', '09:30:00', 'Atendimento Pedagógico', 'Discussão sobre adaptação nas provas de Contabilidade.'),
(3, 5, '2025-05-30', '10:00:00', 'Reunião com Família', 'Reunião com os pais para alinhamento do plano de acompanhamento.');

-- Professores vinculados às Reuniões
INSERT INTO meeting_teachers (meeting_id, teacher_id) VALUES
(1, 1), (1, 9), -- Reunião 1: Camila, Rafael
(2, 4),         -- Reunião 2: Carlos
(3, 2), (3, 9); -- Reunião 3: Anderson, Rafael

-- Ocorrências Registradas
INSERT INTO occurrences (student_id, subject, title, description, occurrence_date, author_id) VALUES
(1, 'Programação Orientada a Objetos', 'Dificuldade em atividade em grupo', 'Aluno apresentou dificuldade de integração durante atividade colaborativa. Isolou-se do grupo e não concluiu a tarefa.', '2025-05-08', 3),
(4, 'Química Orgânica', 'Distração recorrente em aula', 'Aluna demonstrou dificuldade em manter o foco durante a explicação da aula prática, levantando-se repetidas vezes da bancada.', '2025-05-14', 8);