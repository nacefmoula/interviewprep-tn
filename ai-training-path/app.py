from fastapi import FastAPI
from pydantic import BaseModel
from predictor import PathPredictor
import uvicorn

app = FastAPI(title="AI Training Path API")
predictor = PathPredictor()

class PathRequest(BaseModel):
    globalScore: float = 60.0
    preparationLevel: str = "beginner"
    totalSessionsCompleted: int = 0

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/predict-path")
def predict_path(request: PathRequest):
    plans = predictor.predict_path(
        score=request.globalScore,
        prep_level=request.preparationLevel,
        sessions=request.totalSessionsCompleted
    )
    return {"plans": plans}

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
