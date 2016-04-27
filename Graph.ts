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
class Edge<Node> {
    from : Node;
    to   : Node;
    cost : number;
}



/** A directed graph. */
interface Graph<Node> {
    /** Computes the edges that leave from a node. */
    outgoingEdges(node : Node) : Edge<Node>[];
    /** A function that compares nodes. */
    compareNodes : collections.ICompareFunction<Node>;
}



function edgeCost<Node>(
	e : Edge<Node>
) : number {
	return 0;
}


/** Type that reports the result of a search. */
class SearchResult<Node> {
    /** The path (sequence of Nodes) found by the search algorithm. */
    path : Node[];
    /** The total cost of the path. */
    cost : number;
}

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
function aStarSearch<Node> (
    graph : Graph<Node>,
    start : Node,
    goal : (n:Node) => boolean,
    heuristics : (n:Node) => number,
    timeout : number
) : SearchResult<Node> {
    
	var goalNode : Node;
	var gScores = new collections.Dictionary<Node,number>();	
	var priorNodes = new collections.Dictionary<Node, Node>();
	
	function edgeScore (
		e : Edge<Node>
	) : number {
		return gScores.getValue(e.from) + e.cost + heuristics(e.to);
	}
	
	function edgeCompare(
		e1 : Edge<Node>,
		e2 : Edge<Node>
	) : number {
		return edgeScore(e2) - edgeScore(e1);
	}
	
	// A dummy search result: it just picks the first possible neighbour
    var result : SearchResult<Node> = {
        path: [start],
        cost: 0
    };
	
	var frontier = new collections.PriorityQueue<Edge<Node>>(edgeCompare);
	
	function addTargetOfEdgeToFrontier(
		e : Edge<Node>
	) : void {
		var outEdges = graph.outgoingEdges(e.to);
		var oldCost : number;
		if (e.from == null)
		{
			oldCost = 0;
		} else {
			oldCost = gScores.getValue(e.from);
		}
		//console.log('Adding node ' + e.to + ' with cost ' + (oldCost +e.cost));
		priorNodes.setValue(e.to, e.from);
		gScores.setValue(e.to, oldCost + e.cost);
		for (var outEdge of outEdges) {
			if ((gScores.getValue(outEdge.to) == null)) {
				frontier.add(outEdge);
			}
		}

	}
	
	gScores.setValue(start, 0);
	
	var e : Edge<Node> = {from: null, to: start, cost: 0};
	
	addTargetOfEdgeToFrontier(e);	
	
	var i : number = 0;
	
	while(frontier.peek()) {
		var nextEdge : Edge<Node> = frontier.dequeue();
		if (gScores.getValue(nextEdge.to) == null) {
			//console.log('next node is ' + nextEdge.to);
			addTargetOfEdgeToFrontier(nextEdge);
			if (goal(nextEdge.to)) {
				goalNode = nextEdge.to;
				break;
			}
		}
		/*i++;
		if (i == 100000) {
			break;
			
		}*/
	}
	
	for (var k of gScores.keys()) {
		console.log('Node ' + k + ' costs ' + gScores.getValue(k));
	}
	
	var n : Node = goalNode;
	do {
		console.log('node ' + n + ' with cost ' + gScores.getValue(n));
		n = priorNodes.getValue(n);
	} while (gScores.getValue(n) != 0);
	console.log(n);
	
    return result;
}


//////////////////////////////////////////////////////////////////////
// here is an example graph

interface Coordinate {
    x : number;
    y : number;
}


class GridNode {
    constructor(
        public pos : Coordinate
    ) {}

    add(delta : Coordinate) : GridNode {
        return new GridNode({
            x: this.pos.x + delta.x,
            y: this.pos.y + delta.y
        });
    }

    compareTo(other : GridNode) : number {
        return (this.pos.x - other.pos.x) || (this.pos.y - other.pos.y);
    }

    toString() : string {
        return "(" + this.pos.x + "," + this.pos.y + ")";
    }
}

/** Example Graph. */
class GridGraph implements Graph<GridNode> {
    private walls : collections.Set<GridNode>;

    constructor(
        public size : Coordinate,
        obstacles : Coordinate[]
    ) {
        this.walls = new collections.Set<GridNode>();
        for (var pos of obstacles) {
            this.walls.add(new GridNode(pos));
        }
        for (var x = -1; x <= size.x; x++) {
            this.walls.add(new GridNode({x:x, y:-1}));
            this.walls.add(new GridNode({x:x, y:size.y}));
        }
        for (var y = -1; y <= size.y; y++) {
            this.walls.add(new GridNode({x:-1, y:y}));
            this.walls.add(new GridNode({x:size.x, y:y}));
        }
    }

    outgoingEdges(node : GridNode) : Edge<GridNode>[] {
        var outgoing : Edge<GridNode>[] = [];
        for (var dx = -1; dx <= 1; dx++) {
            for (var dy = -1; dy <= 1; dy++) {
                if (! (dx == 0 && dy == 0)) {
                    var next = node.add({x:dx, y:dy});
                    if (! this.walls.contains(next)) {
                        outgoing.push({
                            from: node,
                            to: next,
                            cost: Math.sqrt(dx*dx + dy*dy)
                        });
                    }
                }
            }
        }
        return outgoing;
    }

    compareNodes(a : GridNode, b : GridNode) : number {
        return a.compareTo(b);
    }

    toString() : string {
        var borderRow = "+" + new Array(this.size.x + 1).join("--+");
        var betweenRow = "+" + new Array(this.size.x + 1).join("  +");
        var str = "\n" + borderRow + "\n";
        for (var y = this.size.y-1; y >= 0; y--) {
            str += "|";
            for (var x = 0; x < this.size.x; x++) {
                str += this.walls.contains(new GridNode({x:x,y:y})) ? "## " : "   ";
            }
            str += "|\n";
            if (y > 0) str += betweenRow + "\n";
        }
        str += borderRow + "\n";
        return str;
    }
}






