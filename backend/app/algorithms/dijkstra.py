import heapq
from typing import Dict, List, Tuple

from backend.app.algorithms.base import ShortestPathResult
from backend.app.domain.graph import Graph


class DijkstraAlgorithm:
    def run(self, graph: Graph, start_id: str, end_id: str) -> ShortestPathResult:
        if not graph.has_node(start_id):
            raise ValueError("Start node not found")
        if not graph.has_node(end_id):
            raise ValueError("End node not found")

        distances: Dict[str, float] = {start_id: 0.0}
        previous: Dict[str, str] = {}
        visited = set()
        visit_order: List[str] = []
        heap: List[Tuple[float, str]] = [(0.0, start_id)]

        while heap:
            current_dist, current = heapq.heappop(heap)
            if current in visited:
                continue
            visited.add(current)
            visit_order.append(current)
            if current == end_id:
                break

            for neighbor in graph.neighbors_sorted_by_weight(current, descending=True):
                if neighbor in visited:
                    continue
                cost = _edge_cost(graph, current, neighbor)
                next_dist = current_dist + cost
                if next_dist < distances.get(neighbor, float("inf")):
                    distances[neighbor] = next_dist
                    previous[neighbor] = current
                    heapq.heappush(heap, (next_dist, neighbor))

        path = _rebuild_path(previous, start_id, end_id)
        total_cost = distances.get(end_id)
        return ShortestPathResult(visited=visit_order, path=path, cost=total_cost)


def _edge_cost(graph: Graph, source_id: str, target_id: str) -> float:
    weight = graph.edge_weight(source_id, target_id)
    if weight is None:
        weight = 0.0
    weight = max(0.0, min(1.0, weight))
    return 1.0 - weight


def _rebuild_path(previous: Dict[str, str], start_id: str, end_id: str) -> List[str]:
    if start_id == end_id:
        return [start_id]
    if end_id not in previous:
        return []
    path = [end_id]
    current = end_id
    while current != start_id:
        current = previous.get(current)
        if current is None:
            return []
        path.append(current)
    path.reverse()
    return path
