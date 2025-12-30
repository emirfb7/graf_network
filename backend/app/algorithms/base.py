from abc import ABC, abstractmethod
from typing import Dict, List, Optional

from backend.app.domain.graph import Graph


class AlgorithmResult:
    def __init__(self, order: List[str]):
        self.order = order

    def dict(self):
        return {"order": self.order}


class ShortestPathResult:
    def __init__(self, visited: List[str], path: List[str], cost: Optional[float]):
        self.visited = visited
        self.path = path
        self.cost = cost

    def dict(self):
        return {"visited": self.visited, "path": self.path, "cost": self.cost}


class Algorithm(ABC):
    @abstractmethod
    def run(self, graph: Graph, start_id: str) -> AlgorithmResult:
        raise NotImplementedError


class ColoringResult:
    def __init__(self, colors: Dict[str, int]):
        self.colors = colors

    @property
    def color_count(self) -> int:
        return len(set(self.colors.values()))

    def dict(self):
        return {"colors": self.colors, "color_count": self.color_count}


class Coloring(ABC):
    @abstractmethod
    def run(self, graph: Graph) -> ColoringResult:
        raise NotImplementedError


BaseAlgorithm = Algorithm
ColoringAlgorithm = Coloring
BaseColoringAlgorithm = Coloring
