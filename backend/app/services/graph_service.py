from backend.app.algorithms.astar import AStarAlgorithm
from backend.app.algorithms.bfs import BFSAlgorithm
from backend.app.algorithms.dijkstra import DijkstraAlgorithm
from backend.app.algorithms.dfs import DFSAlgorithm
from backend.app.algorithms.welsh_powell import WelshPowellColoring
from backend.app.domain.edge import Edge
from backend.app.domain.graph import Graph
from backend.app.domain.node import Node
from backend.app.domain.weight_calculator import WeightCalculator
from backend.app.schemas.graph_schemas import (
    AlgorithmRequest,
    AlgorithmResponse,
    ColoringResponse,
    GraphRequest,
    GraphPayload,
    GraphNode,
    GraphEdge,
)


def _build_graph(payload) -> Graph:
    graph = Graph()
    for node in payload.nodes:
        graph.add_node(
            Node(
                node.id,
                node.label,
                activity=node.activity,
                interaction=node.interaction,
                connection_count=node.connection_count,
            )
        )
    for edge in payload.edges:
        graph.add_edge(
            Edge(
                edge.from_id,
                edge.to_id,
                relation_type=edge.relation_type,
                relation_degree=edge.relation_degree,
            )
        )
    graph.apply_weight_calculator(WeightCalculator)
    return graph


def normalize_graph_payload(payload: GraphPayload) -> GraphPayload:
    graph = _build_graph(payload)
    nodes = [
        GraphNode(
            id=node.id,
            label=node.label,
            activity=node.activity,
            interaction=node.interaction,
            connection_count=node.connection_count,
        )
        for node in graph.nodes.values()
    ]
    edges = [
        GraphEdge(
            from_id=edge.source_id,
            to_id=edge.target_id,
            relation_type=edge.relation_type,
            relation_degree=edge.relation_degree,
        )
        for edge in graph.edges
    ]
    return GraphPayload(nodes=nodes, edges=edges)


def run_bfs(request: AlgorithmRequest) -> AlgorithmResponse:
    graph = _build_graph(request.graph)
    result = BFSAlgorithm().run(graph, request.start_id)
    return AlgorithmResponse(order=result.order, visited=result.order)


def run_dfs(request: AlgorithmRequest) -> AlgorithmResponse:
    graph = _build_graph(request.graph)
    result = DFSAlgorithm().run(graph, request.start_id)
    return AlgorithmResponse(order=result.order, visited=result.order)


def run_dijkstra(request: AlgorithmRequest) -> AlgorithmResponse:
    if not request.end_id:
        raise ValueError("End node not provided")
    graph = _build_graph(request.graph)
    result = DijkstraAlgorithm().run(graph, request.start_id, request.end_id)
    return AlgorithmResponse(
        order=result.visited,
        visited=result.visited,
        path=result.path,
        cost=result.cost,
    )


def run_astar(request: AlgorithmRequest) -> AlgorithmResponse:
    if not request.end_id:
        raise ValueError("End node not provided")
    graph = _build_graph(request.graph)
    result = AStarAlgorithm().run(graph, request.start_id, request.end_id)
    return AlgorithmResponse(
        order=result.visited,
        visited=result.visited,
        path=result.path,
        cost=result.cost,
    )


def run_welsh_powell(request: GraphRequest) -> ColoringResponse:
    graph = _build_graph(request.graph)
    result = WelshPowellColoring().run(graph)
    return ColoringResponse(colors=result.colors, color_count=result.color_count)
