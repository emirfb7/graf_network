from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.v1 import algorithm_routes

app = FastAPI(title="Sosyal Ag Analizi API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(algorithm_routes.router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}
