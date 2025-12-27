import csv
import io
import math

import pytest

from backend.app.domain.edge import Edge
from backend.app.domain.graph import Graph
from backend.app.domain.node import Node
from backend.app.domain.weight_calculator import WeightCalculator
from backend.app.io import csv_repository
from backend.app.schemas.graph_schemas import GraphEdge, GraphNode, GraphPayload


def test_weight_calculator_identical_nodes():
    graph = Graph()
    graph.add_node(Node("1", activity=0.5, interaction=10.0, connection_count=2))
    graph.add_node(Node("2", activity=0.5, interaction=10.0, connection_count=2))
    graph.add_edge(Edge("1", "2"))

    graph.apply_weight_calculator(WeightCalculator)

    assert graph.edges[0].relation_degree == pytest.approx(1.0)


def test_weight_calculator_distance():
    graph = Graph()
    graph.add_node(Node("1", activity=0.0, interaction=0.0, connection_count=0))
    graph.add_node(Node("2", activity=0.0, interaction=3.0, connection_count=4))
    graph.add_edge(Edge("1", "2"))

    graph.apply_weight_calculator(WeightCalculator)

    expected = 1.0 / (1.0 + math.sqrt(0.0**2 + 3.0**2 + 4.0**2))
    assert graph.edges[0].relation_degree == pytest.approx(expected)


def test_nodes_to_csv_includes_neighbors():
    payload = GraphPayload(
        nodes=[
            GraphNode(id="1", activity=0.8, interaction=12.0, connection_count=3),
            GraphNode(id="2", activity=0.4, interaction=5.0, connection_count=2),
        ],
        edges=[GraphEdge(from_id="1", to_id="2")],
    )
    csv_text = csv_repository.nodes_to_csv(payload)
    reader = csv.reader(io.StringIO(csv_text))
    rows = list(reader)
    assert rows[0] == [
        "DugumId",
        "Ozellik_I (Aktiflik)",
        "Ozellik_II (Etkilesim)",
        "Ozellik_III (Bagl. Sayisi)",
        "Komsular",
    ]
    neighbors = {row[0]: row[4] for row in rows[1:]}
    assert neighbors.get("1") == "2"
    assert neighbors.get("2") == "1"
