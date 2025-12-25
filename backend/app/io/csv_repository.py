import csv
import io
from typing import Dict

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
