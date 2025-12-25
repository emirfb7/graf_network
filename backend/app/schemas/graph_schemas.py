from typing import List, Optional

from pydantic import BaseModel, Field


class GraphNode(BaseModel):
    id: str
    label: Optional[str] = None


class GraphEdge(BaseModel):
    from_id: str = Field(..., alias="from")
    to_id: str = Field(..., alias="to")


class GraphPayload(BaseModel):
    nodes: List[GraphNode] = []
    edges: List[GraphEdge] = []


class AlgorithmRequest(BaseModel):
    start_id: str
    graph: GraphPayload


class AlgorithmResponse(BaseModel):
    order: List[str]
