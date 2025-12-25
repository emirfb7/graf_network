from backend.app.algorithms import bfs as bfs_algorithm
from backend.app.algorithms import dfs as dfs_algorithm
from backend.app.domain.graph import Graph
from backend.app.schemas.graph_schemas import AlgorithmRequest, AlgorithmResponse


def _build_graph(payload) -> Graph:
    graph = Graph()
    for node in payload.nodes:
        graph.add_node(node.id)
    for edge in payload.edges:
        graph.add_edge(edge.from_id, edge.to_id)
    return graph


def run_bfs(request: AlgorithmRequest) -> AlgorithmResponse:
    graph = _build_graph(request.graph)
    order = bfs_algorithm.bfs(graph, request.start_id)
    return AlgorithmResponse(order=order)


def run_dfs(request: AlgorithmRequest) -> AlgorithmResponse:
    graph = _build_graph(request.graph)
    order = dfs_algorithm.dfs(graph, request.start_id)
    return AlgorithmResponse(order=order)
