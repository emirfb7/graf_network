from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List
from uuid import uuid4

from backend.app.schemas.graph_schemas import GraphPayload

_DATA_DIR = Path(__file__).resolve().parents[2] / "data"
_STORE_PATH = _DATA_DIR / "graphs.json"


def _read_store() -> List[Dict[str, Any]]:
    if not _STORE_PATH.exists():
        return []
    try:
        data = json.loads(_STORE_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
    if isinstance(data, list):
        return data
    return []


def _write_store(records: List[Dict[str, Any]]) -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    _STORE_PATH.write_text(
        json.dumps(records, ensure_ascii=True, indent=2),
        encoding="utf-8",
    )


def list_graphs() -> List[Dict[str, Any]]:
    records = _read_store()
    summaries = []
    for record in records:
        graph = record.get("graph", {}) or {}
        node_count = len(graph.get("nodes", []) or [])
        edge_count = len(graph.get("edges", []) or [])
        summaries.append(
            {
                "id": record.get("id"),
                "name": record.get("name") or "",
                "created_at": record.get("created_at"),
                "node_count": node_count,
                "edge_count": edge_count,
            }
        )
    return summaries


def save_graph(name: str, graph: GraphPayload) -> Dict[str, Any]:
    record = {
        "id": str(uuid4()),
        "name": name,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "graph": graph.dict(by_alias=True),
    }
    records = _read_store()
    records.append(record)
    _write_store(records)
    return record


def get_graph(graph_id: str) -> Dict[str, Any]:
    records = _read_store()
    for record in records:
        if record.get("id") == graph_id:
            return record
    raise KeyError(f"Graph not found: {graph_id}")
