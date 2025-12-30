function buildEdgeKey(a, b) {
  return [a, b].sort().join("|");
}

function formatWeight(weight) {
  if (weight === null || weight === undefined) return "";
  const num = Number(weight);
  if (!Number.isFinite(num)) return "";
  if (Number.isInteger(num)) return String(num);
  return num.toFixed(4);
}

export function createVisRenderer(container) {
  const visAvailable = typeof vis !== "undefined";
  const nodes = visAvailable ? new vis.DataSet() : null;
  const edges = visAvailable ? new vis.DataSet() : null;
  let edgeCounter = 0;
  let selectHandler = null;
  let lastSelectedNodes = [];
  let baseNodeColor = { background: "#0ea5e9", border: "#38bdf8" };
  let baseNodeFont = { color: "#e2e8f0" };
  let baseEdgeColor = { color: "#38bdf8", highlight: "#22c55e", hover: "#22c55e" };
  let baseEdgeWidth = 2;

  let network = null;
  if (visAvailable && container) {
    const data = { nodes, edges };
    const options = {
      autoResize: true,
      nodes: {
        shape: "dot",
        size: 14,
        color: baseNodeColor,
        font: baseNodeFont,
        borderWidth: 2,
      },
      edges: {
        arrows: { to: { enabled: false } },
        color: baseEdgeColor,
        font: { color: "#e2e8f0", size: 12, face: "Arial", strokeWidth: 0, align: "top" },
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
      const ctrlKey = Boolean(params?.event?.srcEvent?.ctrlKey || params?.event?.ctrlKey);
      if (params.nodes?.length) {
        const selectedNodes = params.nodes;
        const newlySelected = selectedNodes.find((nodeId) => !lastSelectedNodes.includes(nodeId));
        const id = newlySelected || selectedNodes[selectedNodes.length - 1];
        lastSelectedNodes = [...selectedNodes];
        const n = nodes.get(id);
        selectHandler({
          type: "node",
          id,
          label: n?.label || id,
          ctrlKey,
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
          ctrlKey,
        });
      }
    });
    network.on("deselectNode", () => {
      lastSelectedNodes = [];
      if (selectHandler) selectHandler(null);
    });
    network.on("deselectEdge", () => selectHandler && selectHandler(null));
  }

  const sync = (graph) => {
    if (!network) return;
    nodes.clear();
    edges.clear();
    graph.nodes.forEach((node, id) => {
      const label = node?.label || id;
      nodes.add({ id, label: `${id}\n${label}` });
    });
    graph.edges.forEach(({ from, to, weight, relationType, key }) => {
      const weightLabel = formatWeight(weight);
      const edgeLabel =
        relationType && weightLabel
          ? `${relationType} (${weightLabel})`
          : relationType || (weightLabel ? weightLabel : "");
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

  const clearHighlights = () => {
    if (!nodes) return;
    const updates = nodes.get().map((n) => ({
      id: n.id,
      color: { ...baseNodeColor },
      font: { ...baseNodeFont },
    }));
    if (updates.length) nodes.update(updates);
    clearEdgeHighlights();
  };

  const highlightNodes = (ids, color) => {
    if (!nodes) return;
    clearHighlights();
    const updates = ids.map((id) => ({
      id,
      color: { background: color, border: color },
      font: { ...baseNodeFont },
    }));
    if (updates.length) nodes.update(updates);
  };

  const setNodeColors = (colorMap) => {
    if (!nodes) return;
    const updates = nodes.get().map((n) => {
      const color = colorMap?.[n.id];
      if (color) {
        return {
          id: n.id,
          color: { background: color, border: color },
          font: { color: "#0b1220" },
        };
      }
      return {
        id: n.id,
        color: { ...baseNodeColor },
        font: { ...baseNodeFont },
      };
    });
    if (updates.length) nodes.update(updates);
  };

  const highlightSimulation = ({
    visitedIds = [],
    currentId = null,
    visitedColor = "#22c55e",
    currentColor = "#facc15",
  }) => {
    if (!nodes) return;
    const visitedSet = new Set(visitedIds);
    const updates = nodes.get().map((n) => {
      let color = { ...baseNodeColor };
      let font = { ...baseNodeFont };
      if (visitedSet.has(n.id)) {
        color = { background: visitedColor, border: visitedColor };
        font = { ...baseNodeFont };
      }
      if (currentId && n.id === currentId) {
        color = { background: currentColor, border: currentColor };
        font = { ...baseNodeFont };
      }
      return { id: n.id, color, font };
    });
    if (updates.length) nodes.update(updates);
  };

  const highlightPath = ({
    visitedIds = [],
    pathIds = [],
    visitedColor = "#38bdf8",
    pathColor = "#22c55e",
    startId = null,
    endId = null,
    startColor = "#facc15",
    endColor = "#ef4444",
  }) => {
    if (!nodes) return;
    const visitedSet = new Set(visitedIds);
    const pathSet = new Set(pathIds);
    const updates = nodes.get().map((n) => {
      let color = { ...baseNodeColor };
      let font = { ...baseNodeFont };
      if (visitedSet.has(n.id)) {
        color = { background: visitedColor, border: visitedColor };
      }
      if (pathSet.has(n.id)) {
        color = { background: pathColor, border: pathColor };
        font = { color: "#0b1220" };
      }
      if (startId && n.id === startId) {
        color = { background: startColor, border: startColor };
        font = { color: "#0b1220" };
      }
      if (endId && n.id === endId) {
        color = { background: endColor, border: endColor };
        font = { color: "#0b1220" };
      }
      return { id: n.id, color, font };
    });
    if (updates.length) nodes.update(updates);
  };

  const clearEdgeHighlights = () => {
    if (!edges) return;
    const updates = edges.get().map((e) => ({
      id: e.id,
      color: { ...baseEdgeColor },
      width: baseEdgeWidth,
    }));
    if (updates.length) edges.update(updates);
  };

  const highlightEdge = (from, to, color = "#f97316") => {
    if (!edges) return;
    const key = buildEdgeKey(from, to);
    let targetId = null;
    const direct = edges.get(key);
    if (direct) {
      targetId = direct.id;
    } else {
      const fallback = edges
        .get()
        .find((e) => (e.from === from && e.to === to) || (e.from === to && e.to === from));
      if (fallback) targetId = fallback.id;
    }
    if (!targetId) return;
    edges.update({
      id: targetId,
      color: { color, highlight: color, hover: color },
      width: baseEdgeWidth + 2,
    });
  };

  return {
    sync,
    reset,
    onSelect,
    clearSelection,
    highlightNodes,
    setNodeColors,
    clearHighlights,
    clearEdgeHighlights,
    highlightEdge,
    highlightSimulation,
    highlightPath,
  };
}

