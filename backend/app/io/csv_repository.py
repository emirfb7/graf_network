import csv
import io
from typing import Dict, Set

from backend.app.schemas.graph_schemas import GraphPayload


def graph_to_csv(graph: GraphPayload) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "source_id",
            "source_name",
            "target_id",
            "target_name",
            "relation_type",
            "relation_degree",
        ]
    )

    node_labels: Dict[str, str] = {}
    for node in graph.nodes:
        node_labels[node.id] = node.label or node.id

    for edge in graph.edges:
        source_id = edge.from_id
        target_id = edge.to_id
        writer.writerow(
            [
                source_id,
                node_labels.get(source_id, source_id),
                target_id,
                node_labels.get(target_id, target_id),
                edge.relation_type or "",
                "" if edge.relation_degree is None else edge.relation_degree,
            ]
        )

    return buffer.getvalue()


def nodes_to_csv(graph: GraphPayload) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "DugumId",
            "Ozellik_I (Aktiflik)",
            "Ozellik_II (Etkilesim)",
            "Ozellik_III (Bagl. Sayisi)",
            "Komsular",
        ]
    )

    neighbors: Dict[str, Set[str]] = {}
    for node in graph.nodes:
        neighbors[node.id] = set()

    for edge in graph.edges:
        neighbors.setdefault(edge.from_id, set()).add(edge.to_id)
        neighbors.setdefault(edge.to_id, set()).add(edge.from_id)

    for node in graph.nodes:
        neighbor_list = ",".join(sorted(neighbors.get(node.id, set())))
        connection_count = node.connection_count
        if connection_count is None:
            connection_count = len(neighbors.get(node.id, set()))
        writer.writerow(
            [
                node.id,
                "" if node.activity is None else node.activity,
                "" if node.interaction is None else node.interaction,
                "" if connection_count is None else connection_count,
                neighbor_list,
            ]
        )

    return buffer.getvalue()
