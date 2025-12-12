function buildEdgeKey(a, b) {
  return [a, b].sort().join("|");
}

export function createVisRenderer(container) {
  const visAvailable = typeof vis !== "undefined";
  const nodes = visAvailable ? new vis.DataSet() : null;
  const edges = visAvailable ? new vis.DataSet() : null;
  let edgeCounter = 0;
  let selectHandler = null;

  let network = null;
  if (visAvailable && container) {
    const data = { nodes, edges };
    const options = {
      autoResize: true,
      nodes: {
        shape: "dot",
        size: 14,
        color: { background: "#0ea5e9", border: "#38bdf8" },
        font: { color: "#e2e8f0" },
        borderWidth: 2,
      },
      edges: {
        arrows: { to: { enabled: true, scaleFactor: 0.7 } },
        color: { color: "#38bdf8", highlight: "#22c55e" },
        font: { color: "#0b1220", size: 12, face: "Arial", strokeWidth: 0, align: "top" },
        smooth: { type: "dynamic" },
      },
      physics: {
        enabled: true,
        solver: "forceAtlas2Based",
        stabilization: { iterations: 120 },
      },
    };
    network = new vis.Network(container, data, options);
    network.on("select", (params) => {
      if (!selectHandler) return;
      if (params.nodes?.length) {
        const id = params.nodes[0];
        const n = nodes.get(id);
        selectHandler({
          type: "node",
          id,
          label: n?.label || id,
        });
        return;
      }
      if (params.edges?.length) {
        const id = params.edges[0];
        const e = edges.get(id);
        selectHandler({
          type: "edge",
          id,
          from: e?.from,
          to: e?.to,
          label: e?.label || "",
          relationType: e?.relationType || "",
          weight: e?.weight ?? null,
        });
      }
    });
    network.on("deselectNode", () => selectHandler && selectHandler(null));
    network.on("deselectEdge", () => selectHandler && selectHandler(null));
  }

  const sync = (graph) => {
    if (!network) return;
    nodes.clear();
    edges.clear();
    graph.nodes.forEach((label, id) => {
      nodes.add({ id, label: `${id}\n${label}` });
    });
    graph.edges.forEach(({ from, to, weight, relationType, key }) => {
      const edgeLabel =
        relationType && weight !== null
          ? `${relationType} (${weight})`
          : relationType || (weight !== null ? String(weight) : "");
      const edgeId = key || buildEdgeKey(from, to) || `e-${edgeCounter++}`;
      edges.add({
        id: edgeId,
        from,
        to,
        label: edgeLabel,
        relationType,
        weight,
      });
    });
  };

  const reset = () => {
    if (!network) return;
    nodes.clear();
    edges.clear();
  };

  const onSelect = (handler) => {
    selectHandler = handler;
  };

  const clearSelection = () => {
    if (!network) return;
    network.unselectAll();
    if (selectHandler) selectHandler(null);
  };

  return { sync, reset, onSelect, clearSelection };
}
