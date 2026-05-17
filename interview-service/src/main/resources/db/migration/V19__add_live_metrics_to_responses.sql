ALTER TABLE responses
    ADD COLUMN IF NOT EXISTS turn_index                INTEGER,
    ADD COLUMN IF NOT EXISTS communication_score       DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS hesitation_score          DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS stress_proxy_score        DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS confidence_proxy_score    DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS avg_volume                DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS max_volume                DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS silence_ratio             DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS blink_rate                DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS gaze_stability_score      DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS head_motion_score         DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS brow_tension_score        DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS mouth_tension_score       DOUBLE PRECISION;