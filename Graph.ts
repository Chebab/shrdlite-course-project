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
function aStarSearch<Node> (
    graph : Graph<Node>,
    start : Node,
    goal : (n:Node) => boolean,
    heuristics : (n:Node) => number,
    timeout : number
) : SearchResult<Node> {
    
	var goalNode : Node;
    // For each node, the cost of getting from the start node to that node
    var gScores = new collections.Dictionary<Node, number>();
	var cachedHeuristics = new collections.Dictionary<Node, number>();
	
    // For each node, which neighboring node it can most efficiently be reached from
	// on a path from the start node
    var priorNodes = new collections.Dictionary<Node, Node>();
    
    // The set (priorityQueue) of edges going out from discovered nodes that still needs evaluation
    var frontier = new collections.PriorityQueue<Edge<Node>>(edgeCompare);

	var timeouted : boolean = false;
	var starttime = new Date().getTime();
	// Iteration count
	var i : number = 0;
	
    // Initialize gScores and frontier
	gScores.setValue(start, 0);
	var e : Edge<Node> = {from: start, to: start, cost: 0};
	addTargetOfEdgeToFrontier(e);	
	
	var result : SearchResult<Node> = {
        path: [],
        cost: 0
    };
	
    // For each node, the total cost of getting from the start node to the goal.
    // This is partly known, partly heuristic
	function edgeScore (
		e : Edge<Node>
	) : number {
		var h = cachedHeuristics.getValue(e.to)
		if (!h){
			h = heuristics(e.to);
			cachedHeuristics.setValue(e.to, h);
		}
		return gScores.getValue(e.from) + e.cost + h;
	}
	
    // Compare helper function needed for the priorityQueue
	function edgeCompare(
		e1 : Edge<Node>,
		e2 : Edge<Node>
	) : number {
		return edgeScore(e2) - edgeScore(e1);
	}
		
	/**
	*	Adds edges originating in target node of e to the frontier. 
	*/
	function addTargetOfEdgeToFrontier(
		e : Edge<Node>
	) : void {
        // Outgoing edges of the node we're looking at (e.to)
		var outEdges = graph.outgoingEdges(e.to);
		var oldCost : number;
		// Find the cost from start to the source node of e
        oldCost = gScores.getValue(e.from);
		// For backtracking
        priorNodes.setValue(e.to, e.from);
		// Set the gScore value of the new node to the cost of the last node + the
        // cost of the edge
		gScores.setValue(e.to, oldCost + e.cost);
		// Loop over all outgoing edges from edge.to
        // If the target node does not exist in the frontier, add the out edge.
		// (If we dont have the gScore value we know it is not in the frontier)
        for (var outEdge of outEdges) {
			if ((gScores.getValue(outEdge.to) == null)) {
				frontier.add(outEdge);
			}
		}
	}

	//While the frontier is non-empty and there is time left
	while(frontier.peek() && !timeouted) {
		// Fetch the edge with the least cost from the PriorityQueue
        
		var nextEdge : Edge<Node> = frontier.dequeue();
		// Get the edge w/ highest prio.
		//If we do not know the gscore of the edge's target node, add its outgoing edges to the frontier
        if (gScores.getValue(nextEdge.to) == null) {
			addTargetOfEdgeToFrontier(nextEdge);
			// If the target node is a goal, save it and break
            if (goal(nextEdge.to)) {
				goalNode = nextEdge.to;
				break;
			}
		}
		i++;
		//Every 1000 iterations, check for timeout
		if (i % 1000) {
			if (new Date().getTime() - starttime > 1000*timeout) {
				timeouted = true;
			}
		}
	}
	
	//Return dummy result on timeout
	if (timeouted) {
		return result;
	}
	
    // Save the goalNode to a dummy variable
    var n: Node = goalNode;
    
    // Get the resulting cost from the gScores
    result.cost = gScores.getValue(goalNode);
    
    // While we haven't reached the start node, add the path (backtracking)
    do {
        // Add the node to the path
        result.path.push(n);
        // Get the "parent"/"previous" node
        n = priorNodes.getValue(n);
    } while (graph.compareNodes(n,start));

    // Result must be in end to start order, so we have to reverse it
    result.path = result.path.reverse();

    return result;
}
