from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# ✅ CORS Fix (Important)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # frontend access
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Sample Stored Child Data (Later you can connect DB)
students_db = {
    1: {
        "name": "Chaitra",
        "age": 11,
        "date": "2026-02-03T09:17:50.497Z",
        "cognitiveScores": {
            "visualSpatial": 44,
            "workingMemory": 0,
            "reactionTime": 60,
            "attention": 0,
            "auditoryProcessing": 0,
            "reasoning": 0
        }
    }
}


@app.get("/")
def home():
    return {"message": "EduTech Backend Running"}


@app.get("/student/{student_id}")
def get_student(student_id: int):
    if student_id not in students_db:
        return {"error": "Student not found"}

    return students_db[student_id]
