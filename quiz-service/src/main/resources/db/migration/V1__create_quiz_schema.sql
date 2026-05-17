-- 1. Table des Quizzes
CREATE TABLE quizzes (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    module_id BIGINT,
    category VARCHAR(255),
    difficulty VARCHAR(50),
    time_limit INT,
    max_attempts INT,
    passing_score DOUBLE PRECISION DEFAULT 60.0,
    status VARCHAR(50) DEFAULT 'DRAFT',
    shuffle_questions BOOLEAN DEFAULT FALSE,
    shuffle_answers BOOLEAN DEFAULT FALSE,
    show_correction_immediately BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- 2. Table des Questions
CREATE TABLE questions (
    id UUID PRIMARY KEY,
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type VARCHAR(50),
    points INT DEFAULT 1,
    order_index INT,
    explanation TEXT, -- ⭐ Ton champ d'explication globale
    hint TEXT,        -- ⭐ Ton indice
    time_limit_seconds INT
);

-- 3. Table des Réponses (Answers)
CREATE TABLE answers (
    id UUID PRIMARY KEY,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    answer_explanation TEXT -- ⭐ Explication spécifique à la réponse
);

-- 4. Table des Tentatives (Quiz Attempts)
CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    quiz_id UUID REFERENCES quizzes(id),
    status VARCHAR(50),
    attempt_number INT,
    started_at TIMESTAMP,
    submitted_at TIMESTAMP,
    time_spent_seconds BIGINT
);

-- 5. Table des Résultats globaux (Quiz Results)
CREATE TABLE quiz_results (
    id UUID PRIMARY KEY,
    attempt_id UUID UNIQUE REFERENCES quiz_attempts(id),
    total_points INT,
    earned_points INT,
    percentage DOUBLE PRECISION,
    passed BOOLEAN,
    time_spent_seconds BIGINT,
    correct_answers_count INT,
    total_questions_count INT,
    corrected_at TIMESTAMP
);

-- 6. Table des Détails par question (Question Results)
CREATE TABLE question_results (
    id UUID PRIMARY KEY,
    result_id UUID REFERENCES quiz_results(id),
    question_id UUID REFERENCES questions(id),
    explanation TEXT,
    is_correct BOOLEAN,
    earned_points INT
);

-- 7. Tables de jointure pour les choix de l'utilisateur
CREATE TABLE qr_user_answers (
    qr_id UUID REFERENCES question_results(id),
    answer_id UUID REFERENCES answers(id),
    PRIMARY KEY (qr_id, answer_id)
);

CREATE TABLE qr_correct_answers (
    qr_id UUID REFERENCES question_results(id),
    answer_id UUID REFERENCES answers(id),
    PRIMARY KEY (qr_id, answer_id)
);

-- 8. Table User Answers (Sélections brutes)
CREATE TABLE user_answers (
    id UUID PRIMARY KEY,
    attempt_id UUID REFERENCES quiz_attempts(id),
    question_id UUID REFERENCES questions(id),
    is_correct BOOLEAN
);

CREATE TABLE user_answer_selections (
    user_answer_id UUID REFERENCES user_answers(id),
    answer_id UUID REFERENCES answers(id),
    PRIMARY KEY (user_answer_id, answer_id)
);

-- 9. Statistiques et Leaderboard
CREATE TABLE leaderboard (
    id UUID PRIMARY KEY,
    user_id UUID,
    quiz_id UUID,
    best_score DOUBLE PRECISION,
    best_percentage INT,
    best_time BIGINT,
    total_attempts INT,
    achieved_at TIMESTAMP
);

CREATE TABLE quiz_statistics (
    id UUID PRIMARY KEY,
    quiz_id UUID UNIQUE REFERENCES quizzes(id),
    total_attempts INT,
    average_score DOUBLE PRECISION,
    average_time DOUBLE PRECISION,
    pass_count INT,
    fail_count INT,
    hardest_question_id UUID,
    easiest_question_id UUID,
    updated_at TIMESTAMP
);