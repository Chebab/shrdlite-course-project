///<reference path="lib/collections.ts"/>
///<reference path="lib/node.d.ts"/>
/** Graph module
*
*  Types for generic A\* implementation.
*
*  *NB.* The only part of this module
*  that you should change is the `aStarSearch` function. Everything
*  else should be used as-is.
*/
/** An edge in a graph. */
var Edge = (function () {
    function Edge() {
    }
    return Edge;
}());
/** Type that reports the result of a search. */
var SearchResult = (function () {
    function SearchResult() {
    }
    return SearchResult;
}());
/**
* A\* search implementation, parameterised by a `Node` type. The code
* here is just a template; you should rewrite this function
* entirely. In this template, the code produces a dummy search result
* which just picks the first possible neighbour.
*
* Note that you should not change the API (type) of this function,
* only its body.
* @param graph The graph on which to perform A\* search.
* @param start The initial node.
* @param goal A function that returns true when given a goal node. Used to determine if the algorithm has reached the goal.
* @param heuristics The heuristic function. Used to estimate the cost of reaching the goal from a given Node.
* @param timeout Maximum time to spend performing A\* search.
* @returns A search result, which contains the path from `start` to a node satisfying `goal` and the cost of this path.
*/
function aStarSearch(graph, start, goal, heuristics, timeout) {
    // A dummy search result: it just picks the first possible neighbour
    var result = {
        path: [start],
        cost: 0
    };
    var closedNodes; // List with evaluated nodes
    var openNodes; // Fronteir and/or List with nodes to be evaluated
    //var queue : collections.PriorityQueue<Node>=collections.PriorityQueue
    var closedEdge; // Backwards edge for nodes in the closed list
    var openEdge; // Backwards edge for nodes in the open list
    //console.log(graph.compareNodes(start,start));
    var gScore; // Real cost of fronteir
    var fScore; // Cost + heuristic of the fronteir
    var current; // The current observed node
    var cgScore; // current gScore of observed node
    openNodes.push(start); // Put the starting element in the fronteir
    gScore.push(0);
    openEdge.push({ from: start, to: start, cost: 0 });
    while (openNodes.length > 0) {
        current = openNodes.pop();
        cgScore = gScore.pop();
        if (goal(current)) {
        }
        closedNodes.push(current); // mark the node as used
        closedEdge.push(openEdge.pop()); // move the edge accordingly
        var neighbours = graph.outgoingEdges(current);
        for (var i = 0; i < neighbours.length; i++) {
            var neighbour = neighbour[i].to;
            if (nodeInList(neighbour, closedNodes, graph)) {
                // if the node has already been calculated, skip this iteration
                continue;
            }
            var temp_gScore = cgScore + neighbours[i].cost;
            if (!nodeInList(neighbour, openNodes, graph)) {
            }
        }
    }
    while (result.path.length < 3) {
        var edge = graph.outgoingEdges(start)[0];
        if (!edge)
            break;
        start = edge.to;
        result.path.push(start);
        result.cost += edge.cost;
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
/** Example Graph. */
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
