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
    var fronteir;
    var usedNodes = [];
    fronteir = new collections.PriorityQueue(function (n1, n2) {
        return nodes.getValue(n2).cost - nodes.getValue(n1).cost + heuristics(n2) - heuristics(n1);
    });
    nodes.setValue(start, { from: start, to: start, cost: 0 });
    fronteir.enqueue(start);
    var current;
    while (fronteir.size() > 0) {
        current = fronteir.dequeue();
        if (goal(current)) {
            var newpath = [];
            var prevNode = current;
            while (graph.compareNodes(prevNode, start) != 0) {
                newpath.push(prevNode);
                prevNode = nodes.getValue(prevNode).from;
            }
            result.path = newpath.reverse();
            result.cost = nodes.getValue(current).cost;
            return result;
        }
        usedNodes.push(current);
        var neighbours = graph.outgoingEdges(current);
        for (var _i = 0, neighbours_1 = neighbours; _i < neighbours_1.length; _i++) {
            var edge = neighbours_1[_i];
            var neighbour = edge.to;
            if (nodeInList(neighbour, usedNodes, graph)) {
                continue;
            }
            var temp_gScore = nodes.getValue(current).cost + edge.cost;
            var fetchval = nodes.getValue(neighbour);
            if (fetchval == null) {
                nodes.setValue(neighbour, { from: current, to: neighbour, cost: temp_gScore });
                fronteir.enqueue(neighbour);
            }
            else if (temp_gScore >= fetchval.cost) {
                continue;
            }
            nodes.setValue(neighbour, { from: current, to: neighbour, cost: temp_gScore });
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
