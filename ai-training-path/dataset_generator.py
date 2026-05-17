import pandas as pd
import numpy as np
import random

def generate_user_data(n_samples=5000):
    np.random.seed(42)
    random.seed(42)

    categories = ["COMMUNICATION", "STRESS_MANAGEMENT", "CONTENT_PREP", "BODY_LANGUAGE", "INDUSTRY_SPECIFIC"]
    
    data = []
    
    for _ in range(n_samples):
        score = float(np.random.normal(65, 15))
        score = max(0, min(100, score))
        
        prep_levels = ["beginner", "junior", "intermediate", "advanced", "senior"]
        prep_level = np.random.choice(prep_levels, p=[0.2, 0.3, 0.3, 0.15, 0.05])
        
        sessions = int(np.random.exponential(5))
        
        priority = {c: 50 for c in categories}
        
        # Rules from TrainingPersonalizationRuleEngine
        if score < 55:
            priority["COMMUNICATION"] += 25
            priority["CONTENT_PREP"] += 20
            priority["STRESS_MANAGEMENT"] += 15
        elif score < 70:
            priority["COMMUNICATION"] += 20
            priority["BODY_LANGUAGE"] += 15
            priority["CONTENT_PREP"] += 10
        elif score < 85:
            priority["BODY_LANGUAGE"] += 18
            priority["INDUSTRY_SPECIFIC"] += 14
            priority["COMMUNICATION"] += 8
        else:
            priority["INDUSTRY_SPECIFIC"] += 18
            priority["BODY_LANGUAGE"] += 12
            priority["COMMUNICATION"] += 6
            
        if "beginner" in prep_level or "junior" in prep_level:
            priority["CONTENT_PREP"] += 20
            priority["STRESS_MANAGEMENT"] += 15
            priority["COMMUNICATION"] += 10
        elif "intermediate" in prep_level:
            priority["BODY_LANGUAGE"] += 10
            priority["INDUSTRY_SPECIFIC"] += 8
        elif "advanced" in prep_level or "senior" in prep_level:
            priority["INDUSTRY_SPECIFIC"] += 18
            priority["BODY_LANGUAGE"] += 8
            
        if sessions < 3:
            priority["STRESS_MANAGEMENT"] += 12
            priority["CONTENT_PREP"] += 8
        elif sessions >= 15:
            priority["INDUSTRY_SPECIFIC"] += 10
            
        # Introduce some noise to make the model generalize
        for c in categories:
            priority[c] += np.random.normal(0, 3)
            
        # Order categories
        ordered_categories = sorted(categories, key=lambda c: priority[c], reverse=True)
        
        # Determine lessons and xp
        weakness_boost = max(0, round((70 - score) / 5.0))
        
        row = {
            "score": score,
            "prep_level": prep_level,
            "sessions": sessions,
        }
        
        for i, c in enumerate(ordered_categories):
            # Target output per category
            # Rank (0 is highest priority)
            row[f"{c}_rank"] = i
            
            # Lessons
            base_lessons = max(4, 5 + i + (1 if score < 60 else 0))
            # add small random noise to lessons
            row[f"{c}_lessons"] = base_lessons + np.random.choice([-1, 0, 1], p=[0.2, 0.6, 0.2])
            
            # XP reward
            base_xp = 80 + (i * 15) + (weakness_boost * 5)
            row[f"{c}_xp"] = base_xp + np.random.choice([-5, 0, 5], p=[0.2, 0.6, 0.2])
            
        data.append(row)
        
    df = pd.DataFrame(data)
    df.to_csv("training_data.csv", index=False)
    print("Generated training_data.csv with", n_samples, "samples.")

if __name__ == "__main__":
    generate_user_data()
