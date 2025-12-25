from collections import deque
from typing import List

from backend.app.domain.graph import Graph


def bfs(graph: Graph, start_id: str) -> List[str]:
    if start_id not in graph.nodes:
        raise ValueError("Start node not found")

    visited = set()
    order: List[str] = []
    queue: deque[str] = deque([start_id])
    visited.add(start_id)

    while queue:
        current = queue.popleft()
        order.append(current)
        for neighbor in sorted(graph.neighbors(current)):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)

    return order
