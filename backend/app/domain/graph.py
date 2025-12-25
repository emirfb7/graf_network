class Graph:
    """
    Simple undirected graph with adjacency list.
    Nodes are identified by string ids.
    """

    def __init__(self) -> None:
        self.nodes = set()
        self.adj = {}

    def add_node(self, node_id: str) -> None:
        if node_id not in self.nodes:
            self.nodes.add(node_id)
            self.adj[node_id] = set()

    def add_edge(self, source: str, target: str) -> None:
        if source == target:
            return
        self.add_node(source)
        self.add_node(target)
        self.adj[source].add(target)
        self.adj[target].add(source)

    def neighbors(self, node_id: str):
        return self.adj.get(node_id, set())
