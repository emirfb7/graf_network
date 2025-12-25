from typing import List

from backend.app.domain.graph import Graph


def dfs(graph: Graph, start_id: str) -> List[str]:
    if start_id not in graph.nodes:
        raise ValueError("Start node not found")

    visited = set()
    order: List[str] = []
    stack = [start_id]

    while stack:
        current = stack.pop()
        if current in visited:
            continue
        visited.add(current)
        order.append(current)
        # Reverse sorted for deterministic order
        for neighbor in sorted(graph.neighbors(current), reverse=True):
            if neighbor not in visited:
                stack.append(neighbor)

    return order
