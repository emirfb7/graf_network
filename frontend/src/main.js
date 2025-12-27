import { createVisRenderer } from "./graph/visNetworkGraph.js";
import { runAlgorithm, runColoring } from "./api/client.js";
import {
  deleteGraph,
  getGraphExportUrl,
  listGraphs,
  loadGraph,
  saveGraph,
} from "./api/client.js";

class Graph {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
    this.adj = new Map();
    this.edgeMap = new Map();
  }

  addNode(id, label = "", attributes = {}) {
    const key = id.trim();
    if (!key) throw new Error("Dugum kimligi bos olamaz");
    if (this.nodes.has(key)) throw new Error("Bu kimlik zaten var");
    const nodeLabel = label.trim() || key;
    const normalized = this.#normalizeAttributes(attributes);
    this.nodes.set(key, { label: nodeLabel, attributes: normalized });
    this.adj.set(key, new Set());
  }

  updateNodeAttributes(id, attributes = {}) {
    const node = this.nodes.get(id);
    if (!node) throw new Error("Bu dugum yok");
    const normalized = this.#normalizeAttributes(attributes);
    const merged = {
      activity: normalized.activity ?? node.attributes.activity ?? null,
      interaction: normalized.interaction ?? node.attributes.interaction ?? null,
      connectionCount: normalized.connectionCount ?? node.attributes.connectionCount ?? null,
    };
    this.nodes.set(id, { label: node.label, attributes: merged });
    this.recalculateWeights();
  }

  addEdge(from, to, weight = null, relationType = "") {
    const a = from.trim();
    const b = to.trim();
    if (!this.nodes.has(a) || !this.nodes.has(b)) {
      throw new Error("Once dugumleri ekleyin (kaynak/hedef yok)");
    }
    const key = this.#edgeKey(a, b);
    if (this.edgeMap.has(key)) {
      throw new Error("Bu kenar zaten var");
    }
    this.adj.get(a).add(b);
    this.adj.get(b).add(a);
    const edge = { from: a, to: b, weight, relationType, key };
    this.edges.push(edge);
    this.edgeMap.set(key, edge);
    this.recalculateWeights();
  }

  recalculateWeights() {
    const updated = [];
    this.edgeMap.clear();
    this.edges.forEach((edge) => {
      const metricsA = this.getNodeMetrics(edge.from);
      const metricsB = this.getNodeMetrics(edge.to);
      const weight = this.#calculateWeight(metricsA, metricsB);
      const next = { ...edge, weight };
      updated.push(next);
      this.edgeMap.set(next.key, next);
    });
    this.edges = updated;
  }

  getNodeMetrics(id) {
    const node = this.nodes.get(id);
    const attrs = node?.attributes || {};
    const activity = this.#metricValue(attrs.activity);
    const interaction = this.#metricValue(attrs.interaction);
    let connectionCount = attrs.connectionCount;
    if (!Number.isFinite(connectionCount)) {
      connectionCount = this.adj.get(id)?.size ?? 0;
    }
    return {
      activity,
      interaction,
      connectionCount: this.#metricValue(connectionCount),
    };
  }

  getEdgeWeight(from, to) {
    const key = this.#edgeKey(from, to);
    const edge = this.edgeMap.get(key);
    if (!edge) return null;
    return edge.weight;
  }

  #metricValue(value, fallback = 0) {
    if (value === null || value === undefined || value === "") return fallback;
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return num;
  }

  #normalizeAttributes(attributes = {}) {
    return {
      activity: this.#parseNumber(attributes.activity),
      interaction: this.#parseNumber(attributes.interaction),
      connectionCount: this.#parseNumber(attributes.connectionCount),
    };
  }

  #parseNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    return num;
  }

  #calculateWeight(aMetrics, bMetrics) {
    const diffActivity = aMetrics.activity - bMetrics.activity;
    const diffInteraction = aMetrics.interaction - bMetrics.interaction;
    const diffConnection = aMetrics.connectionCount - bMetrics.connectionCount;
    const distance = Math.sqrt(
      diffActivity * diffActivity
        + diffInteraction * diffInteraction
        + diffConnection * diffConnection
    );
    return 1 / (1 + distance);
  }

  #edgeKey(a, b) {
    return [a, b].sort().join("|");
  }

  getNeighborsSorted(id, reverse = false) {
    const neighbors = Array.from(this.adj.get(id) || []);
    neighbors.sort((a, b) => {
      const weightA = this.getEdgeWeight(id, a) ?? 0;
      const weightB = this.getEdgeWeight(id, b) ?? 0;
      if (weightA !== weightB) return weightB - weightA;
      return a.localeCompare(b);
    });
    if (reverse) neighbors.reverse();
    return neighbors;
  }

  removeNode(id) {
    const key = id.trim();
    if (!this.nodes.has(key)) throw new Error("Bu dugum yok");
    this.nodes.delete(key);
    this.adj.delete(key);
    for (const set of this.adj.values()) {
      set.delete(key);
    }
    this.edges = this.edges.filter((e) => e.from !== key && e.to !== key);
    this.recalculateWeights();
  }

  removeEdge(from, to) {
    const key = this.#edgeKey(from.trim(), to.trim());
    const before = this.edges.length;
    this.edges = this.edges.filter((e) => e.key !== key);
    const aSet = this.adj.get(from);
    const bSet = this.adj.get(to);
    if (aSet) aSet.delete(to);
    if (bSet) bSet.delete(from);
    if (before === this.edges.length) throw new Error("Bu kenar yok");
    this.recalculateWeights();
  }

  reset() {
    this.nodes.clear();
    this.edges = [];
    this.adj.clear();
    this.edgeMap.clear();
  }
}

const graph = new Graph();
const renderer = createVisRenderer(document.getElementById("graph-viewport"));

const nodeForm = document.getElementById("node-form");
const edgeForm = document.getElementById("edge-form");
const algoForm = document.getElementById("algo-form");
const nodeList = document.getElementById("node-list");
const edgeList = document.getElementById("edge-list");
const algoResult = document.getElementById("algo-result");
const startInput = algoForm.querySelector("input[name=\"start\"]");
const algoSelect = document.getElementById("algorithm-select");
const simToggleBtn = document.getElementById("sim-toggle");
const simResetBtn = document.getElementById("sim-reset");
const simSpeedSelect = document.getElementById("sim-speed");
const simStatus = document.getElementById("sim-status");
const simFrontierLabel = document.getElementById("sim-frontier-label");
const simFrontier = document.getElementById("sim-frontier");
const simCurrent = document.getElementById("sim-current");
const simVisited = document.getElementById("sim-visited");
const simEdge = document.getElementById("sim-edge");
const resetBtn = document.getElementById("reset-graph");
const sidebar = document.getElementById("sidebar");
const toggleSidebarBtn = document.getElementById("toggle-sidebar");
const fileForm = document.getElementById("file-form");
const fileInput = document.getElementById("file-input");
const fileStatus = document.getElementById("file-status");
const fileList = document.getElementById("file-list");
const mergeBtn = document.getElementById("merge-files");
const saveForm = document.getElementById("save-form");
const saveNameInput = document.getElementById("save-name");
const refreshSavesBtn = document.getElementById("refresh-saves");
const savedList = document.getElementById("saved-list");
const coloringRunBtn = document.getElementById("coloring-run");
const coloringStatus = document.getElementById("coloring-status");
const coloringLegend = document.getElementById("coloring-legend");
const coloringResults = document.getElementById("coloring-results");
const confirmOverlay = document.getElementById("confirm-overlay");
const confirmMessage = document.getElementById("confirm-message");
const confirmCancel = document.getElementById("confirm-cancel");
const confirmApprove = document.getElementById("confirm-approve");
const quickToggle = document.getElementById("quick-toggle");
const quickPanel = document.getElementById("quick-panel");
const selectedRow = document.getElementById("selected-row");
const selectedLabel = document.getElementById("selected-label");
const deleteSelectedBtn = document.getElementById("delete-selected");
const nodeInfoToggle = document.getElementById("node-info-toggle");
const nodeInfoPanel = document.getElementById("node-info-panel");
const nodeInfoLabel = document.getElementById("node-info-label");
const nodeInfoId = document.getElementById("node-info-id");
const nodeInfoName = document.getElementById("node-info-name");
const nodeInfoDegree = document.getElementById("node-info-degree");
const nodeInfoNeighbors = document.getElementById("node-info-neighbors");
const nodeInfoActivity = document.getElementById("node-info-activity");
const nodeInfoInteraction = document.getElementById("node-info-interaction");
const nodeInfoConnection = document.getElementById("node-info-connection");
const deleteNodeInfoBtn = document.getElementById("delete-node-info");
const uploadedFiles = [];
const selectedFileOrder = [];
let selectedItem = null;
let savedGraphs = [];
const algoColors = { bfs: "#22c55e", dfs: "#f59e0b" };
const simColors = {
  current: "#facc15",
  edge: "#f97316",
  edgeSkip: "#64748b",
};
const SIM_BASE_INTERVAL = 1000;
const simState = {
  running: false,
  paused: false,
  timerId: null,
  steps: [],
  stepIndex: 0,
  algorithm: null,
  speed: 1,
};
const confirmState = {
  action: null,
  id: null,
};
const COLOR_PALETTE = [
  "#22c55e",
  "#f97316",
  "#38bdf8",
  "#facc15",
  "#a855f7",
  "#fb7185",
  "#14b8a6",
  "#eab308",
  "#6366f1",
  "#84cc16",
  "#0ea5e9",
  "#f43f5e",
];

function renderNodes() {
  nodeList.innerHTML = "";
  const entries = Array.from(graph.nodes.entries());
  if (!entries.length) {
    nodeList.innerHTML = '<li>Henuz dugum yok</li>';
    return;
  }
  entries.forEach(([id, node]) => {
    const li = document.createElement("li");
    const label = node?.label || id;
    li.textContent = `${id} - ${label}`;
    nodeList.appendChild(li);
  });
}

function renderEdges() {
  edgeList.innerHTML = "";
  if (!graph.edges.length) {
    edgeList.innerHTML = '<li>Henuz kenar yok</li>';
    return;
  }
  graph.edges.forEach(({ from, to, weight, relationType }) => {
    const li = document.createElement("li");
    const wValue = formatWeight(weight);
    const w = wValue ? ` (w=${wValue})` : "";
    const rel = relationType ? ` [${relationType}]` : "";
    li.textContent = `${formatEdge(from, to)}${w}${rel}`;
    edgeList.appendChild(li);
  });
}

function refreshView() {
  renderNodes();
  renderEdges();
  renderer.sync(graph);
}

function setResult(text, isError = false) {
  algoResult.textContent = text;
  algoResult.style.borderColor = isError ? "#f87171" : "var(--border)";
}

function parseNumberField(value, fieldLabel, options = {}) {
  if (value === null || value === undefined || value === "") {
    throw new Error(`${fieldLabel} bos olamaz`);
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new Error(`${fieldLabel} sayisal olmali`);
  }
  if (options.min !== undefined && num < options.min) {
    throw new Error(`${fieldLabel} en az ${options.min} olmali`);
  }
  if (options.max !== undefined && num > options.max) {
    throw new Error(`${fieldLabel} en fazla ${options.max} olmali`);
  }
  return num;
}

function renderAlgoResult(order, algorithm, activeIndex = null, emptyMessage = "Hic dugum yok") {
  const color = algoColors[algorithm] || "#38bdf8";
  if (!order.length) {
    algoResult.textContent = emptyMessage;
    return;
  }
  const rows = order
    .map((nodeId, idx) => {
      const isActive = activeIndex === idx;
      const rowClass = isActive ? "row active" : "row";
      const rowStyle = isActive ? ` style="border-left: 3px solid ${color};"` : "";
      return `<div class="${rowClass}"${rowStyle}><span>${idx + 1}</span><span>${nodeId}</span></div>`;
    })
    .join("");
  algoResult.innerHTML = `<div class="algo-head" style="color:${color}">${algorithm.toUpperCase()} sonucu</div>${rows}`;
  algoResult.style.borderColor = "var(--border)";
}

function updateAlgoSelectColor() {
  const algo = algoSelect.value;
  const color = algoColors[algo] || "#22c55e";
  algoSelect.style.setProperty("--algo-color", color);
}

function setSimStatus(text) {
  if (simStatus) simStatus.textContent = text;
}

function updateSimToggleLabel() {
  if (!simToggleBtn) return;
  if (!simState.running) {
    simToggleBtn.textContent = "Simulasyon baslat";
    return;
  }
  simToggleBtn.textContent = simState.paused ? "Devam et" : "Duraklat";
}

function resetSimPanel() {
  if (simFrontier) simFrontier.textContent = "-";
  if (simCurrent) simCurrent.textContent = "-";
  if (simVisited) simVisited.textContent = "-";
  if (simEdge) simEdge.textContent = "-";
  setSimStatus("Hazir");
}

function getSimSpeed() {
  const value = Number(simSpeedSelect?.value || 1);
  const speed = Number.isFinite(value) && value > 0 ? value : 1;
  simState.speed = speed;
  return speed;
}

function getSimInterval() {
  const speed = getSimSpeed();
  return Math.max(120, Math.round(SIM_BASE_INTERVAL / speed));
}

function clearSimTimer() {
  if (!simState.timerId) return;
  clearInterval(simState.timerId);
  simState.timerId = null;
}

function startSimTimer() {
  clearSimTimer();
  simState.timerId = setInterval(() => {
    advanceSimulation();
  }, getSimInterval());
}

function restartSimTimer() {
  if (!simState.running || simState.paused) return;
  startSimTimer();
}

function updateSimFrontierLabel(algorithm) {
  if (!simFrontierLabel) return;
  simFrontierLabel.textContent = algorithm === "dfs" ? "Yigin" : "Kuyruk";
}

function validateStartId() {
  const startId = (startInput.value || "").trim();
  if (!startId) throw new Error("Baslangic dugumu bos olamaz");
  if (!graph.nodes.has(startId)) throw new Error("Baslangic dugumu yok");
  return startId;
}

function createStep({
  type,
  current = null,
  edge = null,
  discovered = null,
  queue = null,
  stack = null,
  visited = null,
  order = null,
}) {
  return {
    type,
    current,
    edge,
    discovered,
    queue: queue ? [...queue] : null,
    stack: stack ? [...stack] : null,
    visited: visited ? Array.from(visited) : [],
    order: order ? [...order] : [],
  };
}

function buildSimulationSteps(algorithm, startId) {
  if (!graph.nodes.size) throw new Error("Hic dugum yok");
  if (algorithm === "bfs") return buildBfsSteps(startId);
  if (algorithm === "dfs") return buildDfsSteps(startId);
  throw new Error("Algoritma secimi hatali");
}

function buildBfsSteps(startId) {
  const steps = [];
  const visited = new Set();
  const order = [];
  const queue = [];

  queue.push(startId);
  visited.add(startId);
  steps.push(createStep({ type: "init", queue, visited, order }));

  while (queue.length) {
    const current = queue.shift();
    order.push(current);
    steps.push(createStep({ type: "visit", current, queue, visited, order }));
    const neighbors = graph.getNeighborsSorted(current);
    for (const neighbor of neighbors) {
      const edge = { from: current, to: neighbor };
      const discovered = !visited.has(neighbor);
      if (discovered) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
      steps.push(
        createStep({
          type: "edge",
          current,
          edge,
          discovered,
          queue,
          visited,
          order,
        })
      );
    }
  }

  return steps;
}

function buildDfsSteps(startId) {
  const steps = [];
  const visited = new Set();
  const order = [];
  const stack = [startId];

  steps.push(createStep({ type: "init", stack, visited, order }));

  while (stack.length) {
    const current = stack.pop();
    if (visited.has(current)) {
      steps.push(createStep({ type: "skip", current, stack, visited, order }));
      continue;
    }
    visited.add(current);
    order.push(current);
    steps.push(createStep({ type: "visit", current, stack, visited, order }));
    const neighbors = graph.getNeighborsSorted(current, true);
    for (const neighbor of neighbors) {
      const edge = { from: current, to: neighbor };
      const discovered = !visited.has(neighbor);
      if (discovered) stack.push(neighbor);
      steps.push(
        createStep({
          type: "edge",
          current,
          edge,
          discovered,
          stack,
          visited,
          order,
        })
      );
    }
  }

  return steps;
}

function renderSimulationStep(step) {
  const algorithm = simState.algorithm || algoSelect.value;
  const algoColor = algoColors[algorithm] || "#38bdf8";
  const frontier = step.queue ?? step.stack ?? [];
  const frontierText = frontier.length ? frontier.join(", ") : "-";
  const visitedText = step.visited.length ? step.visited.join(", ") : "-";

  if (simFrontier) simFrontier.textContent = frontierText;
  if (simCurrent) simCurrent.textContent = step.current || "-";
  if (simVisited) simVisited.textContent = visitedText;

  if (simEdge) {
    if (step.edge) {
      const action = step.discovered ? "ekle" : "atla";
      simEdge.textContent = `${step.edge.from} -> ${step.edge.to} (${action})`;
    } else {
      simEdge.textContent = "-";
    }
  }

  const activeIndex = step.current && step.order.length ? step.order.length - 1 : null;
  renderAlgoResult(step.order, algorithm, activeIndex, "Henuz ziyaret yok");
  renderer.highlightSimulation({
    visitedIds: step.visited,
    currentId: step.current,
    visitedColor: algoColor,
    currentColor: simColors.current,
  });
  renderer.clearEdgeHighlights();
  if (step.edge) {
    const edgeColor = step.discovered ? simColors.edge : simColors.edgeSkip;
    renderer.highlightEdge(step.edge.from, step.edge.to, edgeColor);
  }
}

function startSimulation() {
  try {
    stopSimulation(true);
    const algorithm = algoSelect.value;
    const startId = validateStartId();
    const steps = buildSimulationSteps(algorithm, startId);
    if (!steps.length) {
      setResult("Hic dugum yok", true);
      return;
    }
    simState.steps = steps;
    simState.stepIndex = 0;
    simState.algorithm = algorithm;
    simState.running = true;
    simState.paused = false;
    updateSimFrontierLabel(algorithm);
    renderSimulationStep(steps[0]);
    setSimStatus(`Calisiyor - Adim 1/${steps.length}`);
    updateSimToggleLabel();
    startSimTimer();
  } catch (err) {
    setResult(err.message || "Simulasyon hatasi", true);
    setSimStatus("Hata");
    updateSimToggleLabel();
  }
}

function pauseSimulation() {
  simState.paused = true;
  clearSimTimer();
  setSimStatus(`Duraklatildi - Adim ${simState.stepIndex + 1}/${simState.steps.length}`);
  updateSimToggleLabel();
}

function resumeSimulation() {
  simState.paused = false;
  setSimStatus(`Calisiyor - Adim ${simState.stepIndex + 1}/${simState.steps.length}`);
  updateSimToggleLabel();
  startSimTimer();
}

function finishSimulation() {
  clearSimTimer();
  simState.running = false;
  simState.paused = false;
  updateSimToggleLabel();
  setSimStatus("Bitti");
}

function advanceSimulation() {
  if (!simState.running || simState.paused) return;
  const nextIndex = simState.stepIndex + 1;
  if (nextIndex >= simState.steps.length) {
    finishSimulation();
    return;
  }
  simState.stepIndex = nextIndex;
  renderSimulationStep(simState.steps[simState.stepIndex]);
  setSimStatus(`Calisiyor - Adim ${simState.stepIndex + 1}/${simState.steps.length}`);
}

function toggleSimulation() {
  if (!simState.running) {
    startSimulation();
    return;
  }
  if (simState.paused) {
    resumeSimulation();
  } else {
    pauseSimulation();
  }
}

function stopSimulation(resetHighlights = false) {
  clearSimTimer();
  simState.running = false;
  simState.paused = false;
  simState.steps = [];
  simState.stepIndex = 0;
  simState.algorithm = null;
  updateSimToggleLabel();
  resetSimPanel();
  if (resetHighlights) renderer.clearHighlights();
}

function updateSelectedUI(item) {
  selectedItem = item;
  if (!item) {
    selectedRow.classList.add("hidden");
    selectedLabel.textContent = "";
    updateNodeInfo(null);
    return;
  }
  selectedRow.classList.remove("hidden");
  if (item.type === "node") {
    selectedLabel.textContent = `Dugum: ${item.id}`;
    startInput.value = item.id;
    updateNodeInfo(item.id);
  } else {
    const rel = item.relationType ? ` [${item.relationType}]` : "";
    const wValue = formatWeight(item.weight);
    const w = wValue ? ` (w=${wValue})` : "";
    selectedLabel.textContent = `Kenar: ${formatEdge(item.from, item.to)}${w}${rel}`;
    updateNodeInfo(null);
  }
}

function toggleSidebar() {
  const collapsed = sidebar.classList.toggle("collapsed");
  toggleSidebarBtn.textContent = collapsed ? "Open sidebar" : "Close sidebar";
  toggleSidebarBtn.setAttribute("aria-expanded", (!collapsed).toString());
}

function toggleQuickPanel() {
  const isHidden = quickPanel.hasAttribute("hidden");
  if (isHidden) {
    quickPanel.removeAttribute("hidden");
    quickToggle.setAttribute("aria-expanded", "true");
    quickToggle.querySelector(".chevron").textContent = "-";
  } else {
    quickPanel.setAttribute("hidden", "");
    quickToggle.setAttribute("aria-expanded", "false");
    quickToggle.querySelector(".chevron").textContent = "+";
  }
}

function toggleNodeInfoPanel() {
  const isHidden = nodeInfoPanel.classList.toggle("hidden");
  nodeInfoToggle.setAttribute("aria-expanded", (!isHidden).toString());
  nodeInfoToggle.querySelector(".chevron").textContent = isHidden ? "+" : "−";
}

function updateNodeInfo(nodeId) {
  if (!nodeId || !graph.nodes.has(nodeId)) {
    nodeInfoLabel.textContent = "Dugum secilmedi";
    nodeInfoId.textContent = "-";
    nodeInfoName.textContent = "-";
    nodeInfoDegree.textContent = "-";
    nodeInfoNeighbors.textContent = "-";
    if (nodeInfoActivity) nodeInfoActivity.textContent = "-";
    if (nodeInfoInteraction) nodeInfoInteraction.textContent = "-";
    if (nodeInfoConnection) nodeInfoConnection.textContent = "-";
    deleteNodeInfoBtn.disabled = true;
    return;
  }
  const node = graph.nodes.get(nodeId);
  const label = node?.label || nodeId;
  const attrs = node?.attributes || {};
  const neighbors = Array.from(graph.adj.get(nodeId) || []).sort();
  nodeInfoLabel.textContent = `Dugum: ${nodeId}`;
  nodeInfoId.textContent = nodeId;
  nodeInfoName.textContent = label;
  nodeInfoDegree.textContent = String(neighbors.length);
  nodeInfoNeighbors.textContent = neighbors.length ? neighbors.join(", ") : "-";
  if (nodeInfoActivity)
    nodeInfoActivity.textContent =
      attrs.activity !== null && attrs.activity !== undefined ? formatWeight(attrs.activity) : "-";
  if (nodeInfoInteraction)
    nodeInfoInteraction.textContent =
      attrs.interaction !== null && attrs.interaction !== undefined
        ? formatWeight(attrs.interaction)
        : "-";
  if (nodeInfoConnection)
    nodeInfoConnection.textContent =
      attrs.connectionCount !== null && attrs.connectionCount !== undefined
        ? String(attrs.connectionCount)
        : "-";
  deleteNodeInfoBtn.disabled = false;
}

function toSafeFilename(value, fallback) {
  const trimmed = (value || "").trim() || fallback;
  const cleaned = trimmed.replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned || fallback;
}

function buildGraphPayloadForSave() {
  graph.recalculateWeights();
  const nodes = Array.from(graph.nodes.entries()).map(([id, node]) => ({
    id,
    label: node?.label || id,
    activity: node?.attributes?.activity ?? null,
    interaction: node?.attributes?.interaction ?? null,
    connection_count: node?.attributes?.connectionCount ?? null,
  }));
  const edges = graph.edges.map((edge) => ({
    from: edge.from,
    to: edge.to,
    relation_type: edge.relationType || "",
    relation_degree: edge.weight ?? null,
  }));
  return { nodes, edges };
}

function getColorForIndex(index) {
  const safeIndex = Number.isFinite(index) ? index : 0;
  return COLOR_PALETTE[safeIndex % COLOR_PALETTE.length];
}

function setColoringStatus(text, isError = false) {
  if (!coloringStatus) return;
  coloringStatus.textContent = text;
  coloringStatus.style.color = isError ? "#f87171" : "var(--muted)";
}

function resetColoringUI() {
  setColoringStatus("Hazir");
  if (coloringLegend) coloringLegend.innerHTML = "";
  if (coloringResults) {
    coloringResults.innerHTML = '<div class="muted">Henuz renklendirme yok</div>';
  }
  if (renderer.setNodeColors) renderer.setNodeColors({});
}

function computeComponents() {
  const visited = new Set();
  const components = [];
  const nodes = Array.from(graph.nodes.keys()).sort();

  for (const nodeId of nodes) {
    if (visited.has(nodeId)) continue;
    const component = [];
    const queue = [nodeId];
    visited.add(nodeId);

    while (queue.length) {
      const current = queue.shift();
      component.push(current);
      const neighbors = graph.getNeighborsSorted(current);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    component.sort();
    components.push(component);
  }

  return components;
}

function renderColoringLegend(indices) {
  if (!coloringLegend) return;
  coloringLegend.innerHTML = "";
  if (!indices.length) {
    const empty = document.createElement("span");
    empty.className = "muted tiny";
    empty.textContent = "Renk yok";
    coloringLegend.appendChild(empty);
    return;
  }
  indices.forEach((index) => {
    const item = document.createElement("div");
    item.className = "color-legend-item";
    const swatch = document.createElement("span");
    swatch.className = "color-swatch";
    swatch.style.background = getColorForIndex(index);
    const label = document.createElement("span");
    label.textContent = `Renk ${index}`;
    item.appendChild(swatch);
    item.appendChild(label);
    coloringLegend.appendChild(item);
  });
}

function renderColoringTables(colorIndices, colorMap) {
  if (!coloringResults) return;
  coloringResults.innerHTML = "";
  const components = computeComponents();
  if (!components.length) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "Graf bos";
    coloringResults.appendChild(empty);
    return;
  }

  components.forEach((component, idx) => {
    const wrapper = document.createElement("div");
    wrapper.className = "coloring-table";

    const title = document.createElement("div");
    title.className = "coloring-title";
    title.textContent = `Topluluk ${idx + 1} (${component.length} dugum)`;

    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    ["Dugum", "Renk"].forEach((label) => {
      const th = document.createElement("th");
      th.textContent = label;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    component.forEach((nodeId) => {
      const row = document.createElement("tr");
      const nodeCell = document.createElement("td");
      nodeCell.textContent = nodeId;

      const colorCell = document.createElement("td");
      const colorRow = document.createElement("div");
      colorRow.className = "color-row";
      const swatch = document.createElement("span");
      swatch.className = "color-swatch";
      const colorIndex = colorIndices[nodeId];
      const colorValue = colorMap[nodeId] || "#64748b";
      swatch.style.background = colorValue;
      const label = document.createElement("span");
      label.textContent = colorIndex === undefined ? "-" : String(colorIndex);
      colorRow.appendChild(swatch);
      colorRow.appendChild(label);
      colorCell.appendChild(colorRow);

      row.appendChild(nodeCell);
      row.appendChild(colorCell);
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    wrapper.appendChild(title);
    wrapper.appendChild(table);
    coloringResults.appendChild(wrapper);
  });
}

async function applyColoring() {
  if (!graph.nodes.size) {
    setColoringStatus("Graf bos", true);
    return;
  }
  stopSimulation(true);
  setColoringStatus("Renklendiriliyor...");
  try {
    const payload = buildGraphPayloadForSave();
    const res = await runColoring(payload);
    const colorIndices = res.colors || {};
    const colorMap = {};
    const used = [];
    Object.entries(colorIndices).forEach(([nodeId, index]) => {
      const numeric = Number(index);
      colorMap[nodeId] = getColorForIndex(numeric);
      used.push(numeric);
    });
    const uniqueIndices = Array.from(new Set(used)).sort((a, b) => a - b);
    if (renderer.setNodeColors) renderer.setNodeColors(colorMap);
    renderColoringLegend(uniqueIndices);
    renderColoringTables(colorIndices, colorMap);
    const count = res.color_count ?? uniqueIndices.length;
    setColoringStatus(`Tamamlandi - ${count} renk`);
  } catch (err) {
    setColoringStatus(err.message || "Renklendirme hatasi", true);
  }
}

function openConfirm(message, action, id) {
  if (!confirmOverlay) return;
  confirmState.action = action;
  confirmState.id = id;
  if (confirmMessage) confirmMessage.textContent = message;
  confirmOverlay.hidden = false;
}

function closeConfirm() {
  if (!confirmOverlay) return;
  confirmOverlay.hidden = true;
  confirmState.action = null;
  confirmState.id = null;
}

function promptDelete(record) {
  const label = record.name || record.id;
  openConfirm(`"${label}" kaydini silmek istediginize emin misiniz?`, "delete", record.id);
}

async function handleConfirmApprove() {
  if (confirmState.action !== "delete" || !confirmState.id) {
    closeConfirm();
    return;
  }
  try {
    await deleteGraph(confirmState.id);
    closeConfirm();
    await refreshSavedGraphs();
    setResult("Kayit silindi");
  } catch (err) {
    closeConfirm();
    setResult(err.message || "Silme hatasi", true);
  }
}

function renderSavedList(records) {
  if (!savedList) return;
  savedList.innerHTML = "";
  if (!records.length) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "Henuz kayit yok";
    savedList.appendChild(li);
    return;
  }
  records.forEach((record) => {
    const li = document.createElement("li");
    li.className = "saved-item";
    const meta = document.createElement("div");
    meta.className = "saved-meta";
    const name = document.createElement("strong");
    name.textContent = record.name || record.id;
    const info = document.createElement("span");
    info.className = "muted tiny";
    const nodeCount = record.node_count ?? 0;
    const edgeCount = record.edge_count ?? 0;
    info.textContent = `${nodeCount} dugum, ${edgeCount} kenar`;
    meta.appendChild(name);
    meta.appendChild(info);

    const actions = document.createElement("div");
    actions.className = "saved-actions";
    const loadBtn = document.createElement("button");
    loadBtn.type = "button";
    loadBtn.className = "ghost tiny-btn";
    loadBtn.textContent = "Yukle";
    loadBtn.addEventListener("click", () => loadSavedGraph(record.id));

    const exportLink = document.createElement("a");
    exportLink.className = "ghost tiny-btn";
    exportLink.textContent = "CSV";
    exportLink.href = getGraphExportUrl(record.id);
    exportLink.setAttribute("download", `${toSafeFilename(record.name, "graf")}.csv`);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "ghost tiny-btn icon-btn";
    deleteBtn.setAttribute("aria-label", "Kaydi sil");
    deleteBtn.title = "Sil";
    deleteBtn.innerHTML = '<ion-icon name="trash-outline"></ion-icon>';
    deleteBtn.addEventListener("click", () => promptDelete(record));

    actions.appendChild(loadBtn);
    actions.appendChild(exportLink);
    actions.appendChild(deleteBtn);
    li.appendChild(meta);
    li.appendChild(actions);
    savedList.appendChild(li);
  });
}

async function refreshSavedGraphs() {
  if (!savedList) return;
  try {
    const records = await listGraphs();
    savedGraphs = records;
    renderSavedList(records);
  } catch (err) {
    savedList.innerHTML = "";
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "Kayitlar yuklenemedi";
    savedList.appendChild(li);
  }
}

function graphPayloadToData(payload) {
  const nodesMap = new Map();
  (payload.nodes || []).forEach((node) => {
    nodesMap.set(node.id, {
      label: node.label || node.id,
      attributes: {
        activity: node.activity ?? null,
        interaction: node.interaction ?? null,
        connectionCount: node.connection_count ?? node.connectionCount ?? null,
      },
    });
  });
  const edges = (payload.edges || []).map((edge) => ({
    from: edge.from,
    to: edge.to,
    relationType: edge.relation_type || "",
    weight: edge.relation_degree ?? null,
  }));
  return { nodesMap, edges };
}

function addSavedGraphToPalette(record, nodesMap, edges) {
  const existingIndex = uploadedFiles.findIndex(
    (item) => item.source === "saved" && item.graphId === record.id
  );
  if (existingIndex >= 0) {
    const existing = uploadedFiles[existingIndex];
    existing.name = record.name || existing.name;
    existing.nodesMap = nodesMap;
    existing.edges = edges;
    return existingIndex;
  }
  uploadedFiles.push({
    id: `saved-${record.id}`,
    name: record.name || record.id,
    source: "saved",
    graphId: record.id,
    nodesMap,
    edges,
  });
  return uploadedFiles.length - 1;
}

async function loadSavedGraph(graphId) {
  try {
    stopSimulation(true);
    const record = await loadGraph(graphId);
    const { nodesMap, edges } = graphPayloadToData(record.graph || {});
    loadGraphData(nodesMap, edges);
    const paletteIndex = addSavedGraphToPalette(record, nodesMap, edges);
    selectFileExclusive(paletteIndex);
    if (fileStatus) fileStatus.textContent = `Yuklendi: ${record.name || record.id}`;
    setResult(`Kayit yuklendi: ${record.name || record.id}`);
  } catch (err) {
    setResult(err.message || "Kayit yuklenemedi", true);
  }
}

function addFileToPalette(file) {
  uploadedFiles.push({
    id: `file-${uploadedFiles.length + 1}`,
    name: file.name,
    source: "file",
    file,
  });
  return uploadedFiles.length - 1;
}

function selectFileExclusive(idx) {
  selectedFileOrder.length = 0;
  selectedFileOrder.push(idx);
  renderFileList();
}

function renderFileList() {
  fileList.innerHTML = "";
  if (!uploadedFiles.length) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "Henuz dosya yok";
    fileList.appendChild(li);
    return;
  }
  uploadedFiles.forEach((fileObj, idx) => {
    const li = document.createElement("li");
    li.textContent = fileObj.name;
    li.dataset.index = String(idx);
    li.classList.add("file-item");
    if (selectedFileOrder.includes(idx)) li.classList.add("selected");
    fileList.appendChild(li);
  });
}

toggleSidebarBtn.addEventListener("click", toggleSidebar);
quickToggle.addEventListener("click", toggleQuickPanel);
renderer.onSelect((item) => updateSelectedUI(item));
algoSelect.addEventListener("change", () => {
  stopSimulation(true);
  updateAlgoSelectColor();
});
updateAlgoSelectColor();
updateSimToggleLabel();
nodeInfoToggle.addEventListener("click", toggleNodeInfoPanel);
if (simToggleBtn) simToggleBtn.addEventListener("click", toggleSimulation);
if (simResetBtn) simResetBtn.addEventListener("click", () => stopSimulation(true));
if (simSpeedSelect)
  simSpeedSelect.addEventListener("change", () => {
    getSimSpeed();
    restartSimTimer();
  });
if (refreshSavesBtn) refreshSavesBtn.addEventListener("click", refreshSavedGraphs);
if (saveForm)
  saveForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!saveNameInput) return;
    const name = (saveNameInput.value || "").trim();
    if (!name) {
      setResult("Kayit adi bos olamaz", true);
      return;
    }
    if (!graph.nodes.size) {
      setResult("Graf bos, kaydedilemez", true);
      return;
    }
    try {
      stopSimulation(true);
      const payload = buildGraphPayloadForSave();
      const record = await saveGraph(name, payload);
      setResult(`Kaydedildi: ${record.name}`);
      saveNameInput.value = "";
      await refreshSavedGraphs();
    } catch (err) {
      setResult(err.message || "Kayit hatasi", true);
    }
  });
if (coloringRunBtn) coloringRunBtn.addEventListener("click", applyColoring);
if (confirmCancel) confirmCancel.addEventListener("click", closeConfirm);
if (confirmApprove) confirmApprove.addEventListener("click", handleConfirmApprove);
if (confirmOverlay)
  confirmOverlay.addEventListener("click", (event) => {
    if (event.target === confirmOverlay) closeConfirm();
  });

nodeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const form = new FormData(nodeForm);
  const id = form.get("id") || "";
  const label = form.get("label") || "";
  const activity = form.get("activity");
  const interaction = form.get("interaction");
  const connection = form.get("connection");
  try {
    stopSimulation(true);
    resetColoringUI();
    const attributes = {
      activity: parseNumberField(activity, "Aktiflik", { min: 0, max: 1 }),
      interaction: parseNumberField(interaction, "Etkilesim", { min: 0 }),
      connectionCount: parseNumberField(connection, "Baglanti sayisi", { min: 0 }),
    };
    graph.addNode(id, label, attributes);
    refreshView();
    setResult(`Dugum eklendi: ${id}`);
    nodeForm.reset();
  } catch (err) {
    setResult(err.message, true);
  }
});

edgeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const form = new FormData(edgeForm);
  const from = form.get("from") || "";
  const to = form.get("to") || "";
  try {
    stopSimulation(true);
    resetColoringUI();
    graph.addEdge(from, to);
    refreshView();
    setResult(`Kenar eklendi: ${formatEdge(from, to)}`);
    edgeForm.reset();
  } catch (err) {
    setResult(err.message, true);
  }
});

algoForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const form = new FormData(algoForm);
  const algorithm = form.get("algorithm");
  const start = form.get("start") || "";
  try {
    stopSimulation(true);
    const payload = buildAlgorithmPayload(start);
    runAlgorithm(algorithm, payload)
      .then((res) => {
        renderAlgoResult(res.order, algorithm);
        renderer.highlightNodes(res.order, algoColors[algorithm]);
      })
      .catch((err) => {
        setResult(err.message, true);
      });
  } catch (err) {
    setResult(err.message, true);
  }
});

resetBtn.addEventListener("click", () => {
  stopSimulation(true);
  resetColoringUI();
  graph.reset();
  renderer.reset();
  renderer.clearSelection();
  renderer.clearHighlights();
  refreshView();
  setResult("Graf temizlendi");
  updateSelectedUI(null);
});

fileForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!fileInput.files || !fileInput.files.length) {
    fileStatus.textContent = "Dosya secilmedi";
    return;
  }
  const file = fileInput.files[0];
  const allowed = ["csv", "xls", "xlsx"];
  const ext = file.name.split(".").pop().toLowerCase();
  if (!allowed.includes(ext)) {
    fileStatus.textContent = "Sadece CSV veya Excel yukleyin";
    return;
  }
  addFileToPalette(file);
  renderFileList();
  fileStatus.textContent = `Yukleme hazir: ${file.name}`;
});

fileList.addEventListener("click", async (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  const idx = target.dataset.index;
  if (idx === undefined) return;
  const index = Number(idx);
  const fileObj = uploadedFiles[index];
  if (!fileObj) return;
  toggleFileSelection(index);
  try {
    fileStatus.textContent = `Okunuyor: ${fileObj.name}`;
    const { nodesMap, edges } = await getGraphDataFromItem(fileObj);
    loadGraphData(nodesMap, edges);
    setResult(`Yuklendi: ${fileObj.name}`);
    fileStatus.textContent = `Yuklendi: ${fileObj.name}`;
    updateSelectedUI(null);
  } catch (err) {
    fileStatus.textContent = err.message || "Dosya okunamadi";
    setResult(err.message || "Dosya okunamadi", true);
  }
});

mergeBtn.addEventListener("click", async () => {
  if (selectedFileOrder.length !== 2) {
    setResult("Merge icin iki dosya secin", true);
    return;
  }
  const base = uploadedFiles[selectedFileOrder[0]];
  const other = uploadedFiles[selectedFileOrder[1]];
  if (!base || !other) {
    setResult("Secili dosyalar bulunamadi", true);
    return;
  }
  try {
    fileStatus.textContent = `Merge yapiliyor: ${base.name} + ${other.name}`;
    const [baseData, otherData] = await Promise.all([
      getGraphDataFromItem(base),
      getGraphDataFromItem(other),
    ]);
    const merged = mergeGraphData(baseData, otherData);
    loadGraphData(merged.nodesMap, merged.edges);
    setResult(`Merge tamamlandi: ${base.name} + ${other.name}`);
    fileStatus.textContent = "Merge tamam";
    updateSelectedUI(null);
  } catch (err) {
    setResult(err.message || "Merge hatasi", true);
    fileStatus.textContent = err.message || "Merge hatasi";
  }
});

function splitCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === "\"") {
      if (inQuotes && line[i + 1] === "\"") {
        current += "\"";
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function normalizeHeader(value) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  text = text.replace(/^\uFEFF/, "");
  text = text.replace(/\(.*?\)/g, "");
  text = text.replace(/[çÇğĞıİöÖşŞüÜ]/g, (char) => {
    switch (char) {
      case "ç":
      case "Ç":
        return "c";
      case "ğ":
      case "Ğ":
        return "g";
      case "ı":
      case "İ":
        return "i";
      case "ö":
      case "Ö":
        return "o";
      case "ş":
      case "Ş":
        return "s";
      case "ü":
      case "Ü":
        return "u";
      default:
        return char;
    }
  });
  return text.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9_]/g, "");
}

function findHeaderIndex(header, candidates) {
  for (const candidate of candidates) {
    const idx = header.indexOf(candidate);
    if (idx >= 0) return idx;
  }
  return -1;
}

function coerceNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num;
}

function mergeNodeEntry(nodesMap, id, label, attributes) {
  const existing = nodesMap.get(id);
  if (!existing) {
    nodesMap.set(id, { label: label || id, attributes });
    return;
  }
  nodesMap.set(id, {
    label: existing.label || label || id,
    attributes: {
      activity: attributes.activity ?? existing.attributes.activity ?? null,
      interaction: attributes.interaction ?? existing.attributes.interaction ?? null,
      connectionCount:
        attributes.connectionCount ?? existing.attributes.connectionCount ?? null,
    },
  });
}

function parseEdgeCsv(lines, header) {
  const index = {
    sourceId: header.indexOf("source_id"),
    sourceName: header.indexOf("source_name"),
    targetId: header.indexOf("target_id"),
    targetName: header.indexOf("target_name"),
    relationType: header.indexOf("relation_type"),
    relationDegree: header.indexOf("relation_degree"),
  };
  if (Object.values(index).some((value) => value < 0)) {
    throw new Error("CSV basliklari hatali");
  }

  const nodesMap = new Map();
  const edges = [];

  for (const line of lines) {
    const cols = splitCsvLine(line);
    const sid = cols[index.sourceId]?.trim();
    const tid = cols[index.targetId]?.trim();
    if (!sid || !tid) continue;
    const sname = cols[index.sourceName] || sid;
    const tname = cols[index.targetName] || tid;
    mergeNodeEntry(nodesMap, sid, sname, {
      activity: null,
      interaction: null,
      connectionCount: null,
    });
    mergeNodeEntry(nodesMap, tid, tname, {
      activity: null,
      interaction: null,
      connectionCount: null,
    });
    const weight = coerceNumber(cols[index.relationDegree]);
    edges.push({
      from: sid,
      to: tid,
      weight,
      relationType: cols[index.relationType] || "",
    });
  }
  if (!edges.length) throw new Error("CSV'de kenar bulunamadi");
  return { nodesMap, edges };
}

function parseNodeCsv(lines, header) {
  const idIndex = findHeaderIndex(header, ["dugumid", "nodeid", "id"]);
  const activityIndex = findHeaderIndex(header, ["ozellik_i", "aktiflik", "activity"]);
  const interactionIndex = findHeaderIndex(header, ["ozellik_ii", "etkilesim", "interaction"]);
  const connectionIndex = findHeaderIndex(header, [
    "ozellik_iii",
    "baglsayisi",
    "baglantisayisi",
    "baglantisayi",
    "connectioncount",
    "degree",
  ]);
  const neighborsIndex = findHeaderIndex(header, ["komsular", "neighbors", "neighbours"]);
  if ([idIndex, activityIndex, interactionIndex, connectionIndex, neighborsIndex].some((idx) => idx < 0)) {
    throw new Error("CSV basliklari hatali");
  }

  const nodesMap = new Map();
  const edges = [];
  const edgeSet = new Set();

  for (const line of lines) {
    const cols = splitCsvLine(line);
    const nodeId = cols[idIndex]?.trim();
    if (!nodeId) continue;
    const activity = coerceNumber(cols[activityIndex]);
    const interaction = coerceNumber(cols[interactionIndex]);
    let connectionCount = coerceNumber(cols[connectionIndex]);
    const neighborRaw = cols[neighborsIndex] || "";
    const neighborIds = neighborRaw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (!Number.isFinite(connectionCount)) {
      connectionCount = neighborIds.length;
    }
    mergeNodeEntry(nodesMap, nodeId, nodeId, {
      activity,
      interaction,
      connectionCount,
    });
    neighborIds.forEach((neighborId) => {
      if (!neighborId || neighborId === nodeId) return;
      mergeNodeEntry(nodesMap, neighborId, neighborId, {
        activity: null,
        interaction: null,
        connectionCount: null,
      });
      const key = buildEdgeKey(nodeId, neighborId);
      if (edgeSet.has(key)) return;
      edgeSet.add(key);
      edges.push({
        from: nodeId,
        to: neighborId,
        weight: null,
        relationType: "",
      });
    });
  }

  if (!edges.length) throw new Error("CSV'de kenar bulunamadi");
  return { nodesMap, edges };
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) throw new Error("CSV bos");
  const header = splitCsvLine(lines.shift() || "").map(normalizeHeader);
  if (header.includes("source_id")) {
    return parseEdgeCsv(lines, header);
  }
  if (findHeaderIndex(header, ["dugumid", "nodeid", "id"]) >= 0) {
    return parseNodeCsv(lines, header);
  }
  throw new Error("CSV basliklari hatali");
}

async function getGraphDataFromItem(item) {
  if (!item) throw new Error("Dosya verisi bulunamadi");
  if (item.nodesMap && item.edges) {
    return { nodesMap: item.nodesMap, edges: item.edges };
  }
  if (item.file) {
    const text = await item.file.text();
    const parsed = parseCsv(text);
    item.nodesMap = parsed.nodesMap;
    item.edges = parsed.edges;
    return parsed;
  }
  if (item.graphId) {
    const record = await loadGraph(item.graphId);
    const parsed = graphPayloadToData(record.graph || {});
    item.nodesMap = parsed.nodesMap;
    item.edges = parsed.edges;
    return parsed;
  }
  throw new Error("Dosya verisi okunamadi");
}

function loadGraphData(nodesMap, edges) {
  stopSimulation(true);
  resetColoringUI();
  renderer.clearHighlights();
  graph.reset();
  nodesMap.forEach((node, id) => {
    try {
      const label = typeof node === "string" ? node : node?.label || id;
      const attributes =
        typeof node === "string"
          ? { activity: null, interaction: null, connectionCount: null }
          : node?.attributes || {};
      graph.addNode(id, label, attributes);
    } catch (err) {
      // ignore duplicates
    }
  });
  edges.forEach(({ from, to, weight, relationType }) => {
    try {
      graph.addEdge(from, to, weight, relationType);
    } catch (err) {
      // ignore invalid edges
    }
  });
  refreshView();
  updateSelectedUI(null);
}

function toggleFileSelection(idx) {
  const existingIndex = selectedFileOrder.indexOf(idx);
  if (existingIndex >= 0) {
    selectedFileOrder.splice(existingIndex, 1);
  } else {
    selectedFileOrder.push(idx);
    if (selectedFileOrder.length > 2) {
      selectedFileOrder.shift();
    }
  }
  renderFileList();
}

function buildEdgeKey(a, b) {
  return [a, b].sort().join("|");
}

function formatEdge(a, b) {
  const [x, y] = [a, b].sort();
  return `${x} <-> ${y}`;
}

function formatWeight(weight) {
  if (weight === null || weight === undefined) return "";
  const num = Number(weight);
  if (!Number.isFinite(num)) return "";
  if (Number.isInteger(num)) return String(num);
  return num.toFixed(4);
}

function buildAlgorithmPayload(startId) {
  if (!startId.trim()) {
    throw new Error("Baslangic dugumu bos olamaz");
  }
  graph.recalculateWeights();
  const nodes = Array.from(graph.nodes.entries()).map(([id, node]) => ({
    id,
    label: node?.label || id,
    activity: node?.attributes?.activity ?? null,
    interaction: node?.attributes?.interaction ?? null,
    connection_count: node?.attributes?.connectionCount ?? null,
  }));
  const edges = graph.edges.map((e) => ({
    from: e.from,
    to: e.to,
    relation_type: e.relationType || "",
    relation_degree: e.weight ?? null,
  }));
  return { start_id: startId.trim(), graph: { nodes, edges } };
}

function mergeGraphData(baseParsed, otherParsed) {
  const nodesMap = new Map(baseParsed.nodesMap);
  const edges = [];
  const edgeSet = new Set();

  baseParsed.edges.forEach((e) => {
    const key = buildEdgeKey(e.from, e.to);
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push(e);
    }
  });

  otherParsed.nodesMap.forEach((node, id) => {
    if (!nodesMap.has(id)) {
      nodesMap.set(id, node);
      return;
    }
    const existing = nodesMap.get(id);
    nodesMap.set(id, {
      label: existing?.label || node?.label || id,
      attributes: {
        activity: existing?.attributes?.activity ?? node?.attributes?.activity ?? null,
        interaction: existing?.attributes?.interaction ?? node?.attributes?.interaction ?? null,
        connectionCount:
          existing?.attributes?.connectionCount
          ?? node?.attributes?.connectionCount
          ?? null,
      },
    });
  });

  otherParsed.edges.forEach((e) => {
    const key = buildEdgeKey(e.from, e.to);
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push(e);
    }
  });

  return { nodesMap, edges };
}

deleteSelectedBtn.addEventListener("click", () => {
  if (!selectedItem) return;
  try {
    stopSimulation(true);
    resetColoringUI();
    if (selectedItem.type === "node") {
      graph.removeNode(selectedItem.id);
    } else {
      graph.removeEdge(selectedItem.from, selectedItem.to);
    }
    renderer.clearSelection();
    refreshView();
    updateSelectedUI(null);
    setResult("Silindi");
  } catch (err) {
    setResult(err.message || "Silme hatasi", true);
  }
});

deleteNodeInfoBtn.addEventListener("click", () => {
  if (!selectedItem || selectedItem.type !== "node") return;
  try {
    stopSimulation(true);
    resetColoringUI();
    graph.removeNode(selectedItem.id);
    renderer.clearSelection();
    refreshView();
    updateSelectedUI(null);
    setResult("Silindi");
  } catch (err) {
    setResult(err.message || "Silme hatasi", true);
  }
});

refreshView();
resetColoringUI();
renderFileList();
refreshSavedGraphs();
