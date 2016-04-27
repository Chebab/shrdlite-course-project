var Edge = (function () {
    function Edge() {
    }
    return Edge;
}());
var SearchResult = (function () {
    function SearchResult() {
    }
    return SearchResult;
}());
function aStarSearch(graph, start, goal, heuristics, timeout) {
    var result = {
        path: [start],
        cost: 0
    };
    var nodes = new collections.Dictionary();
    var NodeMap = (function () {
        function NodeMap() {
        }
        return NodeMap;
    }());
    var fronteir;
    var usedNodes = [];
    fronteir = new collections.PriorityQueue(function (n1, n2) { return n2.fScore - n1.fScore; });
    fronteir.enqueue({ node: start, fScore: 0 });
    nodes.setValue(start, { from: start, to: start, cost: 0 });
    var current;
    var counter = 0;
    while (fronteir.size() > 0) {
        current = fronteir.dequeue();
        if (goal(current.node)) {
            var newpath = [];
            var prevNode = current.node;
            while (graph.compareNodes(prevNode, start) != 0) {
                newpath.push(prevNode);
                prevNode = nodes.getValue(prevNode).from;
            }
            result.path = newpath.reverse();
            result.cost = current.fScore;
            return result;
        }
        usedNodes.push(current.node);
        var neighbours = graph.outgoingEdges(current.node);
        for (var _i = 0, neighbours_1 = neighbours; _i < neighbours_1.length; _i++) {
            var edge = neighbours_1[_i];
            var neighbour = edge.to;
            if (nodeInList(neighbour, usedNodes, graph)) {
                continue;
            }
            var temp_gScore = nodes.getValue(current.node).cost + edge.cost;
            var fetchval = nodes.getValue(neighbour);
            if (fetchval == null) {
                fronteir.enqueue({ node: neighbour, fScore: 0 });
                nodes.setValue(neighbour, { from: current.node, to: neighbour, cost: 0 });
            }
            else if (temp_gScore >= fetchval.cost) {
                continue;
            }
            nodes.setValue(neighbour, { from: current.node, to: neighbour, cost: temp_gScore });
            fronteir.forEach(function (queueval) {
                if (graph.compareNodes(queueval.node, neighbour) == 0) {
                    queueval.fScore = temp_gScore;
                    +heuristics(neighbour);
                    return;
                }
            });
        }
    }
    return result;
}
function nodeInList(node, list, graph) {
    return list.some(function (arrval) {
        if (graph.compareNodes(arrval, node) == 0) {
            return true;
        }
        else {
            return false;
        }
    });
}
var GridNode = (function () {
    function GridNode(pos) {
        this.pos = pos;
    }
    GridNode.prototype.add = function (delta) {
        return new GridNode({
            x: this.pos.x + delta.x,
            y: this.pos.y + delta.y
        });
    };
    GridNode.prototype.compareTo = function (other) {
        return (this.pos.x - other.pos.x) || (this.pos.y - other.pos.y);
    };
    GridNode.prototype.toString = function () {
        return "(" + this.pos.x + "," + this.pos.y + ")";
    };
    return GridNode;
}());
var GridGraph = (function () {
    function GridGraph(size, obstacles) {
        this.size = size;
        this.walls = new collections.Set();
        for (var _i = 0, obstacles_1 = obstacles; _i < obstacles_1.length; _i++) {
            var pos = obstacles_1[_i];
            this.walls.add(new GridNode(pos));
        }
        for (var x = -1; x <= size.x; x++) {
            this.walls.add(new GridNode({ x: x, y: -1 }));
            this.walls.add(new GridNode({ x: x, y: size.y }));
        }
        for (var y = -1; y <= size.y; y++) {
            this.walls.add(new GridNode({ x: -1, y: y }));
            this.walls.add(new GridNode({ x: size.x, y: y }));
        }
    }
    GridGraph.prototype.outgoingEdges = function (node) {
        var outgoing = [];
        for (var dx = -1; dx <= 1; dx++) {
            for (var dy = -1; dy <= 1; dy++) {
                if (!(dx == 0 && dy == 0)) {
                    var next = node.add({ x: dx, y: dy });
                    if (!this.walls.contains(next)) {
                        outgoing.push({
                            from: node,
                            to: next,
                            cost: Math.sqrt(dx * dx + dy * dy)
                        });
                    }
                }
            }
        }
        return outgoing;
    };
    GridGraph.prototype.compareNodes = function (a, b) {
        return a.compareTo(b);
    };
    GridGraph.prototype.toString = function () {
        var borderRow = "+" + new Array(this.size.x + 1).join("--+");
        var betweenRow = "+" + new Array(this.size.x + 1).join("  +");
        var str = "\n" + borderRow + "\n";
        for (var y = this.size.y - 1; y >= 0; y--) {
            str += "|";
            for (var x = 0; x < this.size.x; x++) {
                str += this.walls.contains(new GridNode({ x: x, y: y })) ? "## " : "   ";
            }
            str += "|\n";
            if (y > 0)
                str += betweenRow + "\n";
        }
        str += borderRow + "\n";
        return str;
    };
    return GridGraph;
}());
