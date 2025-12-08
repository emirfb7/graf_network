export function createVisRenderer(container) {
  const visAvailable = typeof vis !== "undefined";
  const nodes = visAvailable ? new vis.DataSet() : null;
  const edges = visAvailable ? new vis.DataSet() : null;
  let edgeCounter = 0;

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
        font: { color: "#e2e8f0", align: "top" },
        smooth: { type: "dynamic" },
      },
      physics: {
        enabled: true,
        solver: "forceAtlas2Based",
        stabilization: { iterations: 120 },
      },
    };
    network = new vis.Network(container, data, options);
  }

  const sync = (graph) => {
    if (!network) return;
    nodes.clear();
    edges.clear();
    graph.nodes.forEach((label, id) => {
      nodes.add({ id, label: `${id}\n${label}` });
    });
    graph.edges.forEach(({ from, to, weight }) => {
      edges.add({
        id: `e-${edgeCounter++}`,
        from,
        to,
        label: weight === null ? "" : String(weight),
      });
    });
  };

  const reset = () => {
    if (!network) return;
    nodes.clear();
    edges.clear();
  };

  return { sync, reset };
}
