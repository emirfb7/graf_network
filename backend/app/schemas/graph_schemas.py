from typing import List, Optional

from pydantic import BaseModel, Field


class GraphNode(BaseModel):
    id: str
    label: Optional[str] = None


class GraphEdge(BaseModel):
    from_id: str = Field(..., alias="from")
    to_id: str = Field(..., alias="to")
    relation_type: Optional[str] = None
    relation_degree: Optional[float] = None


class GraphPayload(BaseModel):
    nodes: List[GraphNode] = []
    edges: List[GraphEdge] = []


class AlgorithmRequest(BaseModel):
    start_id: str
    graph: GraphPayload


class AlgorithmResponse(BaseModel):
    order: List[str]


class GraphSaveRequest(BaseModel):
    name: str
    graph: GraphPayload


class GraphRecord(BaseModel):
    id: str
    name: str
    created_at: str
    graph: GraphPayload


class GraphRecordSummary(BaseModel):
    id: str
    name: str
    created_at: str
    node_count: int
    edge_count: int
