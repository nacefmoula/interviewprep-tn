import pickle
import pandas as pd
import numpy as np
from pathlib import Path

class PathPredictor:
    def __init__(self, model_path="model.pkl"):
        self._ensure_model_exists(model_path)
        with open(model_path, "rb") as f:
            data = pickle.load(f)

        self.encoder = data["encoder"]
        self.model_rank = data["model_rank"]
        self.model_lessons = data["model_lessons"]
        self.model_xp = data["model_xp"]
        self.categories = data["categories"]

    def _ensure_model_exists(self, model_path: str) -> None:
        if Path(model_path).exists():
            return

        try:
            from dataset_generator import generate_user_data
            from train import train_model

            if not Path("training_data.csv").exists():
                generate_user_data()
            train_model()
        except Exception as exc:
            raise RuntimeError(
                f"AI Training Path model file '{model_path}' is missing and auto-training failed. "
                "Run dataset_generator.py and train.py to generate model.pkl."
            ) from exc

    def category_title(self, category):
        mapping = {
            "COMMUNICATION": "Communication Excellence",
            "STRESS_MANAGEMENT": "Stress Management",
            "CONTENT_PREP": "Content Preparation",
            "BODY_LANGUAGE": "Body Language Mastery",
            "INDUSTRY_SPECIFIC": "Industry-Specific Readiness"
        }
        return mapping.get(category, category)

    def category_description(self, category, score, prep_level):
        level_hint = prep_level if prep_level else "your current level"
        mapping = {
            "COMMUNICATION": f"Improve verbal structure, clarity, and confidence based on your recent score ({score}) and {level_hint} profile.",
            "STRESS_MANAGEMENT": "Build routines to stay calm under pressure and keep consistent performance through real interview stressors.",
            "CONTENT_PREP": "Sharpen answer frameworks and domain stories to produce stronger, high-signal responses.",
            "BODY_LANGUAGE": "Optimize posture, eye contact, pacing, and non-verbal signals to improve interviewer perception.",
            "INDUSTRY_SPECIFIC": "Practice role-specific scenarios and market context for stronger relevance in target interviews."
        }
        return mapping.get(category, "Module Description")

    def predict_path(self, score, prep_level, sessions):
        prep_level = prep_level.lower() if prep_level else ""
        # Default prep level if empty
        if not prep_level:
            prep_level = "beginner"
            
        # Map prep_level to known categories if needed
        known_levels = ["beginner", "junior", "intermediate", "advanced", "senior"]
        matched_level = next((lvl for lvl in known_levels if lvl in prep_level), "beginner")
        
        # Prepare input
        input_data = pd.DataFrame([{
            "score": score,
            "prep_level": matched_level,
            "sessions": sessions
        }])
        
        prep_encoded = self.encoder.transform(input_data[["prep_level"]])
        prep_encoded_df = pd.DataFrame(prep_encoded, columns=self.encoder.get_feature_names_out())
        X = pd.concat([input_data[["score", "sessions"]], prep_encoded_df], axis=1)
        
        # Predict
        rank_preds = self.model_rank.predict(X)[0]
        lessons_preds = self.model_lessons.predict(X)[0]
        xp_preds = self.model_xp.predict(X)[0]
        
        # Combine and sort
        results = []
        for i, c in enumerate(self.categories):
            results.append({
                "category": c,
                "rank": rank_preds[i],
                "lessons": int(round(lessons_preds[i])),
                "xpReward": int(round(xp_preds[i]))
            })
            
        results = sorted(results, key=lambda x: x["rank"])
        
        # Format as PersonalizedModulePlan
        plans = []
        for i, r in enumerate(results):
            c = r["category"]
            plans.append({
                "category": c,
                "title": self.category_title(c),
                "description": self.category_description(c, score, prep_level),
                "lessons": r["lessons"],
                "xpReward": r["xpReward"],
                "unlocked": i == 0 # Only first is unlocked
            })
            
        return plans

if __name__ == "__main__":
    predictor = PathPredictor()
    print(predictor.predict_path(60, "junior", 2))
