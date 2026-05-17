import pandas as pd
import numpy as np
import pickle
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
from sklearn.preprocessing import OneHotEncoder

def train_model():
    print("Loading data...")
    df = pd.read_csv("training_data.csv")
    
    # Feature Engineering
    X_raw = df[["score", "prep_level", "sessions"]]
    
    # One-hot encode prep_level
    encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
    prep_encoded = encoder.fit_transform(X_raw[["prep_level"]])
    prep_encoded_df = pd.DataFrame(prep_encoded, columns=encoder.get_feature_names_out())
    
    X = pd.concat([X_raw[["score", "sessions"]].reset_index(drop=True), prep_encoded_df], axis=1)
    
    categories = ["COMMUNICATION", "STRESS_MANAGEMENT", "CONTENT_PREP", "BODY_LANGUAGE", "INDUSTRY_SPECIFIC"]
    
    # Prepare targets
    y_rank = df[[f"{c}_rank" for c in categories]]
    y_lessons = df[[f"{c}_lessons" for c in categories]]
    y_xp = df[[f"{c}_xp" for c in categories]]
    
    X_train, X_test, y_rank_train, y_rank_test, y_lessons_train, y_lessons_test, y_xp_train, y_xp_test = train_test_split(
        X, y_rank, y_lessons, y_xp, test_size=0.2, random_state=42
    )
    
    print("Training models...")
    
    # Model 1: Rank (priority)
    model_rank = RandomForestRegressor(n_estimators=100, random_state=42)
    model_rank.fit(X_train, y_rank_train)
    
    # Model 2: Lessons
    model_lessons = RandomForestRegressor(n_estimators=100, random_state=42)
    model_lessons.fit(X_train, y_lessons_train)
    
    # Model 3: XP
    model_xp = RandomForestRegressor(n_estimators=100, random_state=42)
    model_xp.fit(X_train, y_xp_train)
    
    # Evaluation
    rank_pred = model_rank.predict(X_test)
    lessons_pred = model_lessons.predict(X_test)
    xp_pred = model_xp.predict(X_test)
    
    print("Evaluation:")
    print(f"Rank MAE: {mean_absolute_error(y_rank_test, rank_pred):.2f}")
    print(f"Lessons MAE: {mean_absolute_error(y_lessons_test, lessons_pred):.2f}")
    print(f"XP MAE: {mean_absolute_error(y_xp_test, xp_pred):.2f}")
    
    # Save the models and encoder
    print("Saving models...")
    with open("model.pkl", "wb") as f:
        pickle.dump({
            "encoder": encoder,
            "model_rank": model_rank,
            "model_lessons": model_lessons,
            "model_xp": model_xp,
            "categories": categories
        }, f)
        
    print("Training complete! Saved to model.pkl")

if __name__ == "__main__":
    train_model()
