ALTER TABLE live_interview_sessions
    ADD COLUMN IF NOT EXISTS phase                     VARCHAR(40) NOT NULL DEFAULT 'PRE_INTERVIEW',
    ADD COLUMN IF NOT EXISTS agent_mode                VARCHAR(40),
    ADD COLUMN IF NOT EXISTS candidate_profile_json    TEXT,
    ADD COLUMN IF NOT EXISTS conversation_history_json TEXT,
    ADD COLUMN IF NOT EXISTS self_intro_transcript     TEXT,
    ADD COLUMN IF NOT EXISTS last_agent_message        TEXT,
    ADD COLUMN IF NOT EXISTS stress_timeline_json      TEXT;

ALTER TABLE responses
    ADD COLUMN IF NOT EXISTS reaction_type             VARCHAR(40),
    ADD COLUMN IF NOT EXISTS agent_message             TEXT,
    ADD COLUMN IF NOT EXISTS encouragement             TEXT,
    ADD COLUMN IF NOT EXISTS stress_timeline_json      TEXT;

ALTER TABLE performance_reports
    ADD COLUMN IF NOT EXISTS stress_timeline_json      TEXT;
