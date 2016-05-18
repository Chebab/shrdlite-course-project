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
    var goalNode;
    var gScores = new collections.Dictionary();
    var cachedHeuristics = new collections.Dictionary();
    var priorNodes = new collections.Dictionary();
    var frontier = new collections.PriorityQueue(edgeCompare);
    var timeouted = false;
    var starttime = new Date().getTime();
    var i = 0;
    gScores.setValue(start, 0);
    var e = { from: start, to: start, cost: 0 };
    addTargetOfEdgeToFrontier(e);
    var result = {
        path: [],
        cost: 0
    };
    function edgeScore(e) {
        var h = cachedHeuristics.getValue(e.to);
        if (!h) {
            h = heuristics(e.to);
            cachedHeuristics.setValue(e.to, h);
        }
        return gScores.getValue(e.from) + e.cost + h;
    }
    function edgeCompare(e1, e2) {
        return edgeScore(e2) - edgeScore(e1);
    }
    function addTargetOfEdgeToFrontier(e) {
        var outEdges = graph.outgoingEdges(e.to);
        var oldCost;
        oldCost = gScores.getValue(e.from);
        priorNodes.setValue(e.to, e.from);
        gScores.setValue(e.to, oldCost + e.cost);
        for (var _i = 0, outEdges_1 = outEdges; _i < outEdges_1.length; _i++) {
            var outEdge = outEdges_1[_i];
            if ((gScores.getValue(outEdge.to) == null)) {
                frontier.add(outEdge);
            }
        }
    }
    while (frontier.peek() && !timeouted) {
        var nextEdge = frontier.dequeue();
        if (gScores.getValue(nextEdge.to) == null) {
            addTargetOfEdgeToFrontier(nextEdge);
            if (goal(nextEdge.to)) {
                goalNode = nextEdge.to;
                break;
            }
        }
        i++;
        if (i % 1000) {
            if (new Date().getTime() - starttime > 1000 * timeout) {
                timeouted = true;
            }
        }
    }
    if (timeouted) {
        return result;
    }
    if (!goalNode)
        throw new Error("No path found");
    var n = goalNode;
    result.cost = gScores.getValue(goalNode);
    do {
        result.path.push(n);
        n = priorNodes.getValue(n);
    } while (graph.compareNodes(n, start));
    result.path = result.path.reverse();
    return result;
}
