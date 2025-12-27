import { createVisRenderer } from "./graph/visNetworkGraph.js";
import { runAlgorithm, runColoring } from "./api/client.js";
import { getGraphExportUrl, listGraphs, loadGraph, saveGraph } from "./api/client.js";

class Graph {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
    this.adj = new Map();
  }

  addNode(id, label = "") {
    const key = id.trim();
    if (!key) throw new Error("Dugum kimligi bos olamaz");
    if (this.nodes.has(key)) throw new Error("Bu kimlik zaten var");
    this.nodes.set(key, label.trim() || key);
    this.adj.set(key, new Set());
  }

  addEdge(from, to, weight = null, relationType = "") {
    const a = from.trim();
    const b = to.trim();
    if (!this.nodes.has(a) || !this.nodes.has(b)) {
      throw new Error("Once dugumleri ekleyin (kaynak/hedef yok)");
    }
    const key = this.#edgeKey(a, b);
    if (this.edges.some((e) => e.key === key)) {
      throw new Error("Bu kenar zaten var");
    }
    this.adj.get(a).add(b);
    this.adj.get(b).add(a);
    const parsed = this.#parseWeight(weight);
    this.edges.push({ from: a, to: b, weight: parsed, relationType, key });
  }

  #parseWeight(value) {
    if (value === null || value === undefined || value === "") return null;
    const num = Number(value);
    if (Number.isFinite(num)) return num;
    return null;
  }

  #edgeKey(a, b) {
    return [a, b].sort().join("|");
  }

  getNeighborsSorted(id, reverse = false) {
    const neighbors = Array.from(this.adj.get(id) || []).sort();
    return reverse ? neighbors.reverse() : neighbors;
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
  }

  reset() {
    this.nodes.clear();
    this.edges = [];
    this.adj.clear();
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
  entries.forEach(([id, label]) => {
    const li = document.createElement("li");
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
    const w = weight === null ? "" : ` (w=${weight})`;
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
    const w = item.weight !== null && item.weight !== undefined ? ` (w=${item.weight})` : "";
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
    deleteNodeInfoBtn.disabled = true;
    return;
  }
  const label = graph.nodes.get(nodeId) || nodeId;
  const neighbors = Array.from(graph.adj.get(nodeId) || []).sort();
  nodeInfoLabel.textContent = `Dugum: ${nodeId}`;
  nodeInfoId.textContent = nodeId;
  nodeInfoName.textContent = label;
  nodeInfoDegree.textContent = String(neighbors.length);
  nodeInfoNeighbors.textContent = neighbors.length ? neighbors.join(", ") : "-";
  deleteNodeInfoBtn.disabled = false;
}

function toSafeFilename(value, fallback) {
  const trimmed = (value || "").trim() || fallback;
  const cleaned = trimmed.replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned || fallback;
}

function buildGraphPayloadForSave() {
  const nodes = Array.from(graph.nodes.entries()).map(([id, label]) => ({
    id,
    label,
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

    actions.appendChild(loadBtn);
    actions.appendChild(exportLink);
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

async function loadSavedGraph(graphId) {
  try {
    stopSimulation(true);
    const record = await loadGraph(graphId);
    const payload = record.graph || {};
    const nodesMap = new Map();
    (payload.nodes || []).forEach((node) => {
      nodesMap.set(node.id, node.label || node.id);
    });
    const edges = (payload.edges || []).map((edge) => ({
      from: edge.from,
      to: edge.to,
      relationType: edge.relation_type || "",
      weight: edge.relation_degree ?? null,
    }));
    loadGraphData(nodesMap, edges);
    setResult(`Kayit yuklendi: ${record.name || record.id}`);
  } catch (err) {
    setResult(err.message || "Kayit yuklenemedi", true);
  }
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

nodeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const form = new FormData(nodeForm);
  const id = form.get("id") || "";
  const label = form.get("label") || "";
  try {
    stopSimulation(true);
    resetColoringUI();
    graph.addNode(id, label);
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
  const weight = form.get("weight");
  try {
    stopSimulation(true);
    resetColoringUI();
    graph.addEdge(from, to, weight === null ? null : weight);
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
  uploadedFiles.push({ name: file.name, file });
  renderFileList();
  fileStatus.textContent = `Yukleme hazir: ${file.name}`;
});

fileList.addEventListener("click", async (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  const idx = target.dataset.index;
  if (idx === undefined) return;
  const fileObj = uploadedFiles[Number(idx)];
  if (!fileObj) return;
  toggleFileSelection(Number(idx), target);
  try {
    fileStatus.textContent = `Okunuyor: ${fileObj.name}`;
    await loadGraphFromFile(fileObj.file);
    setResult(`Dosyadan yuklendi: ${fileObj.name}`);
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
    const merged = await mergeFiles(base.file, other.file);
    loadGraphData(merged.nodesMap, merged.edges);
    setResult(`Merge tamamlandi: ${base.name} + ${other.name}`);
    fileStatus.textContent = "Merge tamam";
    updateSelectedUI(null);
  } catch (err) {
    setResult(err.message || "Merge hatasi", true);
    fileStatus.textContent = err.message || "Merge hatasi";
  }
});

async function loadGraphFromFile(file) {
  const text = await file.text();
  const { nodesMap, edges } = parseCsv(text);
  loadGraphData(nodesMap, edges);
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) throw new Error("CSV bos");
  const header = lines.shift().split(",").map((h) => h.trim().toLowerCase());
  const expected = [
    "source_id",
    "source_name",
    "target_id",
    "target_name",
    "relation_type",
    "relation_degree",
  ];
  const isValidHeader =
    header.length >= expected.length &&
    expected.every((h, i) => header[i] === h);
  if (!isValidHeader) throw new Error("CSV basliklari hatali");

  const nodesMap = new Map();
  const edges = [];

  for (const line of lines) {
    const cols = line.split(",").map((c) => c.trim());
    if (cols.length < 6) continue;
    const [sid, sname, tid, tname, rtype, rdeg] = cols;
    if (!sid || !tid) continue;
    nodesMap.set(sid, sname || sid);
    nodesMap.set(tid, tname || tid);
    const weight = Number(rdeg);
    edges.push({
      from: sid,
      to: tid,
      weight: Number.isFinite(weight) ? weight : null,
      relationType: rtype || "",
    });
  }
  if (!edges.length) throw new Error("CSV'de kenar bulunamadi");
  return { nodesMap, edges };
}

function loadGraphData(nodesMap, edges) {
  stopSimulation(true);
  resetColoringUI();
  renderer.clearHighlights();
  graph.reset();
  nodesMap.forEach((label, id) => {
    try {
      graph.addNode(id, label);
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

function toggleFileSelection(idx, element) {
  const existingIndex = selectedFileOrder.indexOf(idx);
  if (existingIndex >= 0) {
    selectedFileOrder.splice(existingIndex, 1);
  } else {
    selectedFileOrder.push(idx);
    if (selectedFileOrder.length > 2) {
      const removed = selectedFileOrder.shift();
      const toUnselect = fileList.querySelector(`[data-index="${removed}"]`);
      if (toUnselect) toUnselect.classList.remove("selected");
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

function buildAlgorithmPayload(startId) {
  if (!startId.trim()) {
    throw new Error("Baslangic dugumu bos olamaz");
  }
  const nodes = Array.from(graph.nodes.entries()).map(([id, label]) => ({
    id,
    label,
  }));
  const edges = graph.edges.map((e) => ({
    from: e.from,
    to: e.to,
  }));
  return { start_id: startId.trim(), graph: { nodes, edges } };
}

async function mergeFiles(baseFile, otherFile) {
  const [baseText, otherText] = await Promise.all([baseFile.text(), otherFile.text()]);
  const baseParsed = parseCsv(baseText);
  const otherParsed = parseCsv(otherText);

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

  otherParsed.nodesMap.forEach((label, id) => {
    if (!nodesMap.has(id)) nodesMap.set(id, label);
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
