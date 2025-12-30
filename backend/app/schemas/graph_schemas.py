from typing import Dict, List, Optional

from pydantic import BaseModel, Field
from pydantic.config import ConfigDict


class GraphNode(BaseModel):
    id: str
    label: Optional[str] = None
    activity: Optional[float] = None
    interaction: Optional[float] = None
    connection_count: Optional[int] = None


class GraphEdge(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    from_id: str = Field(..., alias="from")
    to_id: str = Field(..., alias="to")
    relation_type: Optional[str] = None
    relation_degree: Optional[float] = None


class GraphPayload(BaseModel):
    nodes: List[GraphNode] = []
    edges: List[GraphEdge] = []


class AlgorithmRequest(BaseModel):
    start_id: str
    end_id: Optional[str] = None
    graph: GraphPayload


class AlgorithmResponse(BaseModel):
    order: List[str]
    visited: Optional[List[str]] = None
    path: Optional[List[str]] = None
    cost: Optional[float] = None


class GraphRequest(BaseModel):
    graph: GraphPayload


class ColoringResponse(BaseModel):
    colors: Dict[str, int]
    color_count: int


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
