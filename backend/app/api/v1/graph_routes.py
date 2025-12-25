import re
from typing import List

from fastapi import APIRouter, HTTPException, Response

from backend.app.io import csv_repository, json_repository
from backend.app.schemas.graph_schemas import (
    GraphRecord,
    GraphRecordSummary,
    GraphSaveRequest,
)

router = APIRouter(prefix="/graphs", tags=["graphs"])


def _safe_filename(value: str, fallback: str) -> str:
    trimmed = value.strip() or fallback
    cleaned = re.sub(r"[^A-Za-z0-9_-]+", "_", trimmed)
    cleaned = cleaned.strip("_") or fallback
    return cleaned


@router.get("", response_model=List[GraphRecordSummary])
def list_graphs():
    return json_repository.list_graphs()


@router.post("", response_model=GraphRecordSummary)
def save_graph(req: GraphSaveRequest):
    name = req.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Kayit adi bos olamaz")
    record = json_repository.save_graph(name, req.graph)
    graph = record.get("graph", {}) or {}
    return {
        "id": record.get("id"),
        "name": record.get("name"),
        "created_at": record.get("created_at"),
        "node_count": len(graph.get("nodes", []) or []),
        "edge_count": len(graph.get("edges", []) or []),
    }


@router.get("/{graph_id}", response_model=GraphRecord)
def get_graph(graph_id: str):
    try:
        return json_repository.get_graph(graph_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Kayit bulunamadi") from exc


@router.get("/{graph_id}/export")
def export_graph(graph_id: str):
    try:
        record = json_repository.get_graph(graph_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Kayit bulunamadi") from exc
    graph = GraphRecord(**record).graph
    csv_text = csv_repository.graph_to_csv(graph)
    name = record.get("name") or graph_id
    filename = f"{_safe_filename(name, graph_id)}.csv"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return Response(content=csv_text, media_type="text/csv", headers=headers)
