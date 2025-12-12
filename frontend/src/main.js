import { createVisRenderer } from "./graph/visNetworkGraph.js";

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

  bfs(start) {
    const s = start.trim();
    if (!this.nodes.has(s)) throw new Error("Baslangic dugumu yok");
    const visited = new Set([s]);
    const order = [];
    const queue = [s];
    while (queue.length) {
      const node = queue.shift();
      order.push(node);
      for (const n of this.adj.get(node) || []) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push(n);
        }
      }
    }
    return order;
  }

  dfs(start) {
    const s = start.trim();
    if (!this.nodes.has(s)) throw new Error("Baslangic dugumu yok");
    const visited = new Set();
    const order = [];
    const stack = [s];
    while (stack.length) {
      const node = stack.pop();
      if (visited.has(node)) continue;
      visited.add(node);
      order.push(node);
      const neighbors = Array.from(this.adj.get(node) || []).reverse();
      for (const n of neighbors) {
        if (!visited.has(n)) stack.push(n);
      }
    }
    return order;
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
const resetBtn = document.getElementById("reset-graph");
const sidebar = document.getElementById("sidebar");
const toggleSidebarBtn = document.getElementById("toggle-sidebar");
const fileForm = document.getElementById("file-form");
const fileInput = document.getElementById("file-input");
const fileStatus = document.getElementById("file-status");
const fileList = document.getElementById("file-list");
const mergeBtn = document.getElementById("merge-files");
const quickToggle = document.getElementById("quick-toggle");
const quickPanel = document.getElementById("quick-panel");
const selectedRow = document.getElementById("selected-row");
const selectedLabel = document.getElementById("selected-label");
const deleteSelectedBtn = document.getElementById("delete-selected");
const uploadedFiles = [];
const selectedFileOrder = [];
let selectedItem = null;

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
    li.textContent = `${from} -> ${to}${w}${rel}`;
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

function updateSelectedUI(item) {
  selectedItem = item;
  if (!item) {
    selectedRow.classList.add("hidden");
    selectedLabel.textContent = "";
    return;
  }
  selectedRow.classList.remove("hidden");
  if (item.type === "node") {
    selectedLabel.textContent = `Dugum: ${item.id}`;
  } else {
    const rel = item.relationType ? ` [${item.relationType}]` : "";
    const w = item.weight !== null && item.weight !== undefined ? ` (w=${item.weight})` : "";
    selectedLabel.textContent = `Kenar: ${item.from} -> ${item.to}${w}${rel}`;
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

nodeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const form = new FormData(nodeForm);
  const id = form.get("id") || "";
  const label = form.get("label") || "";
  try {
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
    graph.addEdge(from, to, weight === null ? null : weight);
    refreshView();
    setResult(`Kenar eklendi: ${from} - ${to}`);
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
    let order = [];
    if (algorithm === "bfs") order = graph.bfs(start);
    else order = graph.dfs(start);
    setResult(`${algorithm.toUpperCase()} sirasi: ${order.join(" -> ")}`);
  } catch (err) {
    setResult(err.message, true);
  }
});

resetBtn.addEventListener("click", () => {
  graph.reset();
  renderer.reset();
  renderer.clearSelection();
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

refreshView();
renderFileList();
