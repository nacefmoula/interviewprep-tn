import os
import time
import random
import logging
from prometheus_client import Gauge, Info, start_http_server

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(message)s"
)

MODE = os.getenv("FEATURE_MODE", "simulate")
METRICS_PORT = int(os.getenv("METRICS_PORT", "8000"))
INTERVAL_SECONDS = int(os.getenv("INTERVAL_SECONDS", "15"))

TARGET_NAMESPACE = os.getenv("TARGET_NAMESPACE", "piclouddoom")
TARGET_SERVICE = os.getenv("TARGET_SERVICE", "all-piclouddoom-services")
DETECTOR_VERSION = os.getenv("DETECTOR_VERSION", "simulate-v1")

ATTACK_EVERY_N_CYCLES = int(os.getenv("ATTACK_EVERY_N_CYCLES", "8"))
ATTACK_SCORE = float(os.getenv("SIMULATED_ATTACK_SCORE", "0.93"))
NORMAL_SCORE_MIN = float(os.getenv("NORMAL_SCORE_MIN", "0.03"))
NORMAL_SCORE_MAX = float(os.getenv("NORMAL_SCORE_MAX", "0.25"))
THRESHOLD = float(os.getenv("ATTACK_THRESHOLD", "0.70"))

attack_score = Gauge(
    "attack_score",
    "Attack probability score produced by the AI detector",
    ["target_namespace", "target_service", "mode", "detector_version"]
)

attack_label = Gauge(
    "attack_label",
    "Attack classification label, 1 means attack detected, 0 means normal",
    ["target_namespace", "target_service", "mode", "detector_version"]
)

attack_last_run_epoch = Gauge(
    "attack_last_run_epoch",
    "Unix epoch timestamp of the last detector loop",
    ["target_namespace", "target_service", "mode", "detector_version"]
)

attack_detector_up = Gauge(
    "attack_detector_up",
    "Whether the attack detector process is alive",
    ["mode", "detector_version"]
)

attack_detector_info = Info(
    "attack_detector",
    "Attack detector build and runtime information"
)


def generate_simulated_score(cycle: int) -> float:
    if ATTACK_EVERY_N_CYCLES > 0 and cycle % ATTACK_EVERY_N_CYCLES == 0:
        return ATTACK_SCORE
    return random.uniform(NORMAL_SCORE_MIN, NORMAL_SCORE_MAX)


def main():
    logging.info("Starting attack detector")
    logging.info(
        "mode=%s target_namespace=%s target_service=%s port=%s",
        MODE,
        TARGET_NAMESPACE,
        TARGET_SERVICE,
        METRICS_PORT
    )

    attack_detector_info.info({
        "mode": MODE,
        "target_namespace": TARGET_NAMESPACE,
        "target_service": TARGET_SERVICE,
        "detector_version": DETECTOR_VERSION,
        "threshold": str(THRESHOLD)
    })

    start_http_server(METRICS_PORT)
    logging.info("Prometheus metrics exposed on :%s/metrics", METRICS_PORT)

    cycle = 0

    while True:
        cycle += 1

        if MODE != "simulate":
            logging.warning(
                "Only FEATURE_MODE=simulate is enabled in this deployment. "
                "Falling back to safe simulated score."
            )

        score = generate_simulated_score(cycle)
        label = 1 if score >= THRESHOLD else 0

        attack_score.labels(
            TARGET_NAMESPACE,
            TARGET_SERVICE,
            MODE,
            DETECTOR_VERSION
        ).set(score)

        attack_label.labels(
            TARGET_NAMESPACE,
            TARGET_SERVICE,
            MODE,
            DETECTOR_VERSION
        ).set(label)

        attack_last_run_epoch.labels(
            TARGET_NAMESPACE,
            TARGET_SERVICE,
            MODE,
            DETECTOR_VERSION
        ).set(time.time())

        attack_detector_up.labels(
            MODE,
            DETECTOR_VERSION
        ).set(1)

        logging.info(
            "cycle=%s score=%.3f label=%s target=%s/%s",
            cycle,
            score,
            label,
            TARGET_NAMESPACE,
            TARGET_SERVICE
        )

        time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
