from fastapi import APIRouter, HTTPException

from backend.app.schemas.graph_schemas import AlgorithmRequest, AlgorithmResponse
from backend.app.services import graph_service

router = APIRouter(prefix="/algorithms", tags=["algorithms"])


@router.post("/bfs", response_model=AlgorithmResponse)
def run_bfs(req: AlgorithmRequest):
    try:
        return graph_service.run_bfs(req)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/dfs", response_model=AlgorithmResponse)
def run_dfs(req: AlgorithmRequest):
    try:
        return graph_service.run_dfs(req)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
