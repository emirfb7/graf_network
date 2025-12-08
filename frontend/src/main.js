class Graph {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
    this.adj = new Map();
  }

  addNode(id, label = "") {
    const key = id.trim();
    if (!key) throw new Error("Düğüm kimliği boş olamaz");
    if (this.nodes.has(key)) throw new Error("Bu kimlik zaten var");
    this.nodes.set(key, label.trim() || key);
    this.adj.set(key, new Set());
  }

  addEdge(from, to, weight = null) {
    const a = from.trim();
    const b = to.trim();
    if (!this.nodes.has(a) || !this.nodes.has(b)) {
      throw new Error("Önce düğümleri ekleyin (kaynak/hedef yok)");
    }
    this.adj.get(a).add(b);
    this.adj.get(b).add(a);
    this.edges.push({ from: a, to: b, weight: weight === "" ? null : weight });
  }

  bfs(start) {
    const s = start.trim();
    if (!this.nodes.has(s)) throw new Error("Başlangıç düğümü yok");
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
    if (!this.nodes.has(s)) throw new Error("Başlangıç düğümü yok");
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

  reset() {
    this.nodes.clear();
    this.edges = [];
    this.adj.clear();
  }
}

const graph = new Graph();

const nodeForm = document.getElementById("node-form");
const edgeForm = document.getElementById("edge-form");
const algoForm = document.getElementById("algo-form");
const nodeList = document.getElementById("node-list");
const edgeList = document.getElementById("edge-list");
const algoResult = document.getElementById("algo-result");
const resetBtn = document.getElementById("reset-graph");

function renderNodes() {
  nodeList.innerHTML = "";
  const entries = Array.from(graph.nodes.entries());
  if (!entries.length) {
    nodeList.innerHTML = '<li>Henüz düğüm yok</li>';
    return;
  }
  entries.forEach(([id, label]) => {
    const li = document.createElement("li");
    li.textContent = `${id} — ${label}`;
    nodeList.appendChild(li);
  });
}

function renderEdges() {
  edgeList.innerHTML = "";
  if (!graph.edges.length) {
    edgeList.innerHTML = '<li>Henüz kenar yok</li>';
    return;
  }
  graph.edges.forEach(({ from, to, weight }) => {
    const li = document.createElement("li");
    const w = weight === null ? "" : ` (w=${weight})`;
    li.textContent = `${from} ⇄ ${to}${w}`;
    edgeList.appendChild(li);
  });
}

function setResult(text, isError = false) {
  algoResult.textContent = text;
  algoResult.style.borderColor = isError ? "#f87171" : "var(--border)";
}

nodeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const form = new FormData(nodeForm);
  const id = form.get("id") || "";
  const label = form.get("label") || "";
  try {
    graph.addNode(id, label);
    renderNodes();
    setResult(`Düğüm eklendi: ${id}`);
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
    renderEdges();
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
    setResult(`${algorithm.toUpperCase()} sırasi: ${order.join(" → ")}`);
  } catch (err) {
    setResult(err.message, true);
  }
});

resetBtn.addEventListener("click", () => {
  graph.reset();
  renderNodes();
  renderEdges();
  setResult("Graf temizlendi");
});

renderNodes();
renderEdges();
