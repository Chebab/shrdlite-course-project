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
* @param timeout Maximum time (in seconds) to spend performing A\* search.
* @returns A search result, which contains the path from `start` to a node satisfying `goal` and the cost of this path.
*/

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
	var frontier = new collections.PriorityQueue<Edge<Node>>(edgeCompare);
	
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
		
	function addTargetOfEdgeToFrontier(
		e : Edge<Node>
	) : void {
		var outEdges = graph.outgoingEdges(e.to);
		var oldCost : number;
		oldCost = gScores.getValue(e.from);
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
	var e : Edge<Node> = {from: start, to: start, cost: 0};
	addTargetOfEdgeToFrontier(e);	
	
	var timeouted : boolean = false;
	var i : number = 0;
	var starttime = new Date().getTime();

	while(frontier.peek() && !timeouted) {
		var nextEdge : Edge<Node> = frontier.dequeue();
		if (gScores.getValue(nextEdge.to) == null) {
			//console.log('next node is ' + nextEdge.to);
			addTargetOfEdgeToFrontier(nextEdge);
			if (goal(nextEdge.to)) {
				goalNode = nextEdge.to;
				break;
			}
		}
		i++;
		if (i % 1000) {
			if (new Date().getTime() - starttime > 1000*timeout) {
				timeouted = true;
				console.log('timeout');
				break;
			}
		}
	}
	
	var result : SearchResult<Node> = {
        path: [],
        cost: 0
    };
	
	if (timeouted) {
		return result;
	}
	
	var n : Node = goalNode;
	result.cost = gScores.getValue(goalNode);
	do {
		//console.log('node ' + n + ' with cost ' + gScores.getValue(n));
		result.path.push(n);
		n = priorNodes.getValue(n);
	} while (gScores.getValue(n) != 0);
		
	result.path = result.path.reverse();
	
    return result;
}
