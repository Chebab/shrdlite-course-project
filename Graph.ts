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
    // A dummy search result: it just picks the first possible neighbour
    var result : SearchResult<Node> = {
        path: [start],
        cost: 0
    };

    // Mapping discovered nodes and their values Edge<Node>. Edge contain the
    // gScore value as cost and the taken edge to get there
    var nodes : collections.Dictionary<Node,Edge<Node>>=
      new collections.Dictionary<Node,Edge<Node>>();



    var fronteir : collections.PriorityQueue<Node>; //fronteir
    var usedNodes : Node[] = []; // Nodes which we have evaluated

    // Assign a function to the fronteir based on fScore
    fronteir = new collections.PriorityQueue<Node>(
      function(n1 : Node, n2 : Node){
        return nodes.getValue(n2).cost-nodes.getValue(n1).cost+heuristics(n2)-heuristics(n1);
      });

    // Add the starting node to the Dictionary
    nodes.setValue(start,{from: start,to: start,cost: 0});

    // Put the starting element in the queue
    fronteir.enqueue(start);


    var current : Node; // The current node being evaluated
    while (fronteir.size()>0) {
      current = fronteir.dequeue();

      if (goal(current)){
        // Do some fancy shit to return the path

        var newpath : Node[] = [];
        var prevNode : Node = current;
        //var nextNode : Node =nodes.getValue(prevNode).from;
        while(graph.compareNodes(prevNode,start)!=0){
          newpath.push(prevNode);
          prevNode = nodes.getValue(prevNode).from;

        }

        result.path= newpath.reverse();
        result.cost = nodes.getValue(current).cost;//might want to add heuristics
        return result;
      }
      usedNodes.push(current);

      var neighbours = graph.outgoingEdges(current);

      for(var edge of neighbours)
      {

        var neighbour :Node=edge.to; //= neighbours[i].to;
        if(nodeInList(neighbour,usedNodes,graph))
        {
            // if the node has already been calculated, skip this iteration
            continue;
        }
        var temp_gScore = nodes.getValue(current).cost + edge.cost;//neighbours[i].cost;
        var fetchval :Edge<Node> = nodes.getValue(neighbour);
        if(fetchval==null)
        {
          // Place it in the openNodes list
          nodes.setValue(neighbour,{from: current,to:neighbour,cost:temp_gScore});
          fronteir.enqueue(neighbour);

        }
        else if (temp_gScore >= fetchval.cost) {
            continue;
        }
        nodes.setValue(neighbour,{from: current,to:neighbour,cost:temp_gScore});

      }
    }
    return result;
}

function nodeInList<Node>(
  node : Node,
  list : Node[],
  graph : Graph<Node> )
  : boolean
  {
    return list.some(function(arrval)
    {
      if(graph.compareNodes(arrval,node) == 0)
      {
        return true;
      }
      else
      {
        return false;
      }
    });
  }


