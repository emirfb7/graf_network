const API_BASE =
  window.__API_BASE__ || "http://127.0.0.1:8000/api/v1";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = data.detail || res.statusText;
    throw new Error(message);
  }
  return res.json();
}

export async function runAlgorithm(algorithm, payload) {
  return request(`/algorithms/${algorithm}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
