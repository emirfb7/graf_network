from typing import List

from backend.app.domain.graph import Graph


class AlgorithmResult:
    def __init__(self, order: List[str]):
        self.order = order

    def dict(self):
        return {"order": self.order}


class BaseAlgorithm:
    def run(self, graph: Graph, start_id: str) -> AlgorithmResult:
        raise NotImplementedError
