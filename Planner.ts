///<reference path="World.ts"/>
///<reference path="Interpreter.ts"/>
///<reference path="Graph.ts"/>

/**
* Planner module
*
* The goal of the Planner module is to take the interpetation(s)
* produced by the Interpreter module and to plan a sequence of actions
* for the robot to put the world into a state compatible with the
* user's command, i.e. to achieve what the user wanted.
*
* The planner should use your A* search implementation to find a plan.
*/
module Planner {

    //////////////////////////////////////////////////////////////////////
    // exported functions, classes and interfaces/types

    /**
     * Top-level driver for the Planner. Calls `planInterpretation` for each given interpretation generated by the Interpreter.
     * @param interpretations List of possible interpretations.
     * @param currentState The current state of the world.
     * @returns Augments Interpreter.InterpretationResult with a plan represented by a list of strings.
     */
    export function plan(interpretations : Interpreter.InterpretationResult[], currentState : WorldState) : PlannerResult[] {
        var errors : Error[] = [];
        var plans : PlannerResult[] = [];
        interpretations.forEach((interpretation) => {
            try {
                var result : PlannerResult = <PlannerResult>interpretation;
                result.plan = planInterpretation(result.interpretation, currentState);
                if (result.plan.length == 0) {
                    result.plan.push("That is already true!");
                }
                plans.push(result);
            } catch(err) {
				console.log("----------------------ERRRORRRRR----------------------");
                errors.push(err);
            }
        });
        if (plans.length) {
            return plans;
        } else {
            // only throw the first error found
            throw errors[0];
        }
    }

    export interface PlannerResult extends Interpreter.InterpretationResult {
        plan : string[];
    }

    export function stringify(result : PlannerResult) : string {
        return result.plan.join(", ");
    }

    //////////////////////////////////////////////////////////////////////
    // private functions




    /**
     * The core planner function. The code here is just a template;
     * you should rewrite this function entirely. In this template,
     * the code produces a dummy plan which is not connected to the
     * argument `interpretation`, but your version of the function
     * should be such that the resulting plan depends on
     * `interpretation`.
     *
     *
     * @param interpretation The logical interpretation of the user's desired goal. The plan needs to be such that by executing it, the world is put into a state that satisfies this goal.
     * @param state The current world state.
     * @returns Basically, a plan is a
     * stack of strings, which are either system utterances that
     * explain what the robot is doing (e.g. "Moving left") or actual
     * actions for the robot to perform, encoded as "l", "r", "p", or
     * "d". The code shows how to build a plan. Each step of the plan can
     * be added using the `push` method.
     */
    function planInterpretation(interpretation : Interpreter.DNFFormula, state : WorldState) : string[] {

		function getPositions(state : WorldStateNode) : collections.Dictionary<string, number[]> {
			var positions: collections.Dictionary<string, number[]>
				= new collections.Dictionary<string, number[]>();


			// Add all of the states and their position to the Map
			for (var i = 0; i < state.stacks.length; i++) {
				for (var j = 0; j < state.stacks[i].length; j++) {
					positions.setValue(state.stacks[i][j], [i, j]);
				}
			}

			if (state.holding != null) {
				// If the arm is holding an object, add that object to the state
				// The position [-2,-2] is used for finding the held object
				positions.setValue(state.holding, [-2, -2]);

			}

			//The first element in the position is used to indentify
			// the floor. The second element is the actual position of the floor§
			positions.setValue("floor", [-1, -1]);
			return positions;
		}
		/**
		* Checks if a goal has been reached in the given state
		*/
		function goalIsReached(state : WorldStateNode) : boolean {
			//A dictionary of positions, given string id:s of objects
			var positions = getPositions(state);
			//For the goal to be reached...
			for (var conjunct of interpretation) {
				var goalReached : boolean = true;
				//...each literal needs to be true ....
				for (var literal of conjunct) {
					var relation : string = literal.relation;
					var pos1 : number[] = positions.getValue(literal.args[0]);
					var pos2 : number[] = null;
					//Only get second argument if relation is something other than "holding"
					if (literal.args.length > 1) {
						pos2 = positions.getValue(literal.args[1]);
					}
					//For "holding", only check if wanted object is held
				    if (literal.relation=="holding"){
					    if (state.holding!=literal.args[0]) {
							goalReached = false;
							break;
						}
				    }
					//For other relations, use isFeasible of the interpreter to check
					//whether the relation holds between the two objects in the literal
					else if (!Interpreter.isFeasible(literal.relation, pos1, pos2)) {
						goalReached = false;
						break;
					}
				}
				//... in at least one of the conjunctive expressions
				if (goalReached) return true;
			}
			return false;
		}
		
		function manhattanishv3(state : WorldStateNode) : number {
			var minDigDepths : number[] = [];
			//For leftof/rightof - tracks where stuff is that needs to be moved and how much stuff is 
			//above that stuff 
			var connections : number[][] = [];
			for (var i = 0; i < state.stacks.length; i++) {
				minDigDepths.push(0);
			}
			//A dictionary from string id:s of objects to positions in the world
			var positions = getPositions(state);
			for (var conjunct of interpretation) {
				//heuristic is given by sum of minimum number of items to remove from each stack
				
				for (var literal of conjunct) {
					var xpos1 : number = positions.getValue(literal.args[0])[0];
					var ypos1 : number = positions.getValue(literal.args[0])[1];
					var abovecount1 : number = 0;
					//if held, leave at 0
					if (xpos1 != -1 && xpos1 != -2)
						abovecount1 = Math.max(state.stacks[xpos1].length - ypos1 - 1, 0);
					
					var xpos2 : number;
					var ypos2 : number;
					var abovecount2 : number;
					if (literal.relation != "holding") {
						xpos2 = positions.getValue(literal.args[1])[0];
						ypos2 = positions.getValue(literal.args[1])[1];
						if (xpos2 == -1 || xpos2 == -2) {
							//TODO: work on this (if target is floor, find smallest stack)
							abovecount2 = 0;
						} else 
							abovecount2 = state.stacks[xpos2].length - ypos2 - 1;
						
					}

					//If literal already fulfilled, move on
					if (Interpreter.isFeasible(literal.relation, [xpos1, ypos1], [xpos2, ypos2])) {
						continue;
					}
					switch (literal.relation) {
						case "holding": 
							minDigDepths[xpos1] = Math.max(minDigDepths[xpos1], abovecount1);
							break;
						case "ontop": case "inside": 
							if (xpos1 != -2) {
								minDigDepths[xpos1] = Math.max(minDigDepths[xpos1],abovecount1);
							}
							if (xpos2 != -1 && xpos2 != -2) {
								minDigDepths[xpos2] = Math.max(minDigDepths[xpos2],abovecount2);
							}
							
							break;
						case "under":	
							if (xpos1 != -2) {
								minDigDepths[xpos1] = Math.max(minDigDepths[xpos1],abovecount1);
							}
							if (xpos2 != -1 && xpos2 != -2) {
								minDigDepths[xpos2] = Math.max(minDigDepths[xpos2],abovecount2 + 1);
							}							
							break;
						case "above": 
							if (xpos1 != -2) {
								minDigDepths[xpos1] = Math.max(minDigDepths[xpos1],abovecount1);
							}
							break;
						case "leftof": case "rightof" :
							connections.push([xpos1,ypos1,abovecount1,xpos2,ypos2,abovecount2])
								
							break;
					}
					
					
				}
				//Really if... while(true)
				while (connections.length > 0) {
					//Find deepest pair
					var deepest : number [] = [];
					var deepestValue : number = 0;
					var xcoord : number;
					var depth : number;
					for (var c of connections) {
						var depth1 : number = Math.max(c[2] - minDigDepths[c[0]],0);
						var depth2 : number = Math.max(c[5] - minDigDepths[c[3]],0);
						
						var xcoordtemp : number;
						if (depth1 < depth2) {
							depth = depth1;
							xcoordtemp = c[0];
						} else {
							depth = depth2;
							xcoordtemp= c[3];
						}
						if (depth > deepestValue) {
							deepest = c;
							deepestValue = depth;
							xcoord = xcoordtemp;
						}
					}
					//none left to dig up
					if (deepest.length == 0) {
						break;
					}
					minDigDepths[xcoord] = depth;
				}
				
			}
			var sum : number = 0;
			for(var val of minDigDepths) {
				sum += val*4;
			}
			return sum;
		}
		
		//Really detailed. Should work well for goals with only a few easily reached subgoals
		function manhattanishv2(state : WorldStateNode) : number {
			var shortest : number = 100000000;
			var longest : number = 0;
			var current : number = 0;
			//A dictionary from string id:s of objects to positions in the world
			var positions = getPositions(state);
			//Find the minimum heuristic of any conjunctive expression
			for (var conjunct of interpretation) {
				//heuristic is given by the min of max of of the heuristics 
				//to satisfy each of the literals. 
				longest = 0;
				for (var literal of conjunct) {
					
					var xpos1 : number = positions.getValue(literal.args[0])[0];
					var ypos1 : number = positions.getValue(literal.args[0])[1];
					var abovecount1 : number;
					//If source is floor
					if (xpos1 == -1) {
						throw new Error("This should never happen - floor as first argument in literal");
					}
					//source object is in hand
					else if (xpos1 == -2){
						abovecount1 = 0;
					} 
					//source is not in hand or floor
					else {
						abovecount1 = state.stacks[xpos1].length - ypos1 - 1;
					}
					var xpos2 : number;
					var ypos2 : number;
					var abovecount2 : number;
					var smallestStackSize : number  = 1000000;
					var smallestStackIndices : [number];
					for (var i :number = 0; i < state.stacks.length; i++) {
						if (smallestStackSize == state.stacks[i].length) {
							smallestStackIndices.push(i);
						}
						if (smallestStackSize > state.stacks[i].length) {
							smallestStackSize = state.stacks[i].length;
							smallestStackIndices = [i];
						}
						
					}
					if (literal.relation != "holding") {
						xpos2 = positions.getValue(literal.args[1])[0];
						ypos2 = positions.getValue(literal.args[1])[1];
						
						//If literal already fulfilled, move on
						if (Interpreter.isFeasible(literal.relation, [xpos1, ypos1], [xpos2, ypos2])) {
							continue;
						}
						
						//Target is floor
						if (xpos2 == -1) {
							//Find size of smallest stack on floor
							abovecount2 = smallestStackSize;
						} 
						//Target is in hand
						else if (xpos2 == -2) {
							abovecount2 = 0;
						} 
						//Target is neither in hand nor on floor
						else {
							abovecount2 = state.stacks[xpos2].length - ypos2 - 1;
						} 
					}
					
					
					//If we wish to hold the target object, check x-distance to goal. 
					if (literal.relation =="holding") {
						current += (Math.abs(xpos1 - state.arm) + 1);				
						//add 4*number of objects that need to be removed above the wanted object 
						//(pick up, move, drop, move back)
						current += 4*abovecount1;	
					} 
				
					
					//if the goal is to put the source in the same x-coordinate as the goal
					else if (literal.relation == "ontop" || literal.relation == "under" ||
								literal.relation == "inside" ||literal.relation == "above")  {
						
						if (xpos2 == -1) { //target is floor
							//(We cannot be in here unless the relation is "ontop" or ("above" and source is held))
							//if source is held
							if (xpos1 == -2) {
								//If there is no free column, clear the smallest column
								
								if (literal.relation != "above")
									current += 4*smallestStackSize;
								//drop the held item
								current += 1;
							}
							//if source is not yet held
							else {
								//move to source
								current += Math.abs(xpos1 - state.arm);
								//if need to clear to get to object and then clear a stack to get to floor
								if (smallestStackIndices.indexOf(xpos1) == -1) {
									//remove stuff above source
									//(pick up, move, drop, move back)
									current += 4*abovecount1;
									//remove stuff from smallest stack
									current += 4*smallestStackSize; 
								} 
								//source is already in smallest stack - just clear it and then put source back
								else {
									//remove stuff from smallest stack, put source back on floor ( = at least 
									//move, pick up, move, move, drop OR move, move, pick up, move, drop OR
									//last item of smallest stack was placed 2 slots away from smallest stack)
									current += 4*smallestStackSize + 5;
									
								}
								//Drop it
								current += 1;
							}
						} else if (xpos1 == -2) { //current place is hand
							//Move the hand to target, and then drop it (+1)
							current += Math.abs(xpos2 - state.arm) + 1;
							//If there's stuff above the target and we need to remove it
							if (literal.relation != "above") {
								current += abovecount2*4;
								//Need to dig deeper if we wish to get below target
								if (literal.relation == "below") {
									current += 4;
								}
							}
						} 
						//if source is not in hand and not in same column as target
						else if (Math.abs(xpos1 - xpos2) != 0){
							//Pick up an object (+1) move the hand and drop it (+1)
							current += Math.abs(xpos1 - xpos2) + 2;
							//Clear stuff above source
							if (literal.relation == "above") {
								current += 4*abovecount1;
							}
							//if "ontop", "in" or "below"
							//Need to get adjacent in the y-direction to target 
							//- so clear both above source and target
							else {								
								current += 4*abovecount1;
								current += 4*abovecount2;
							}
						} 
						//else object is already in correct column 
						//(but literal is not fulfilled - so need to dig up lowest of target/source)
						else {
							//move to stack with objects
							current += Math.abs(state.arm - xpos1);
							current += Math.max(abovecount1,abovecount2)*4;
						}
							
					} 
					//If Source should be left of target
					else if (literal.relation == "leftof") {
						if (xpos1 == -2) { //current place is hand
							if (xpos2 >= state.arm) {
								//Move the hand (+1 to get to other side of target) , then drop it (+1)
								current += state.arm - xpos2 + 2;
							} else {
								//Drop the item
								current += 1;
							}
						} else {
							//Get to source
							current += Math.abs(state.arm - xpos1);
							//Pick up an object (+1) move the hand (+1 to get to other side of target) 
							//and drop it (+1) or 
							//if already to the left, this part of the goal is already reached (0)
							current += Math.max(xpos1 - xpos2 + 3, 0) ;
							
						}
					} 
					//If Source should be right of target
					else if (literal.relation == "rightof") {
						if (xpos1 == -2) { //current place is hand
							if (xpos2 <= state.arm) {
								//Move the hand (+1 to get to other side of target) then drop it (+1)
								current += xpos2 - state.arm + 2;
							} else {
								//Drop the item
								current += 1;
							}
						} else {
							//Get to source
							current += Math.abs(state.arm - xpos1);
							//Pick up an object (+1) move the hand (+1 to get to other side of target) 
							//and drop it (+1) or 
							//if already to the right, this part of the goal is already reached (0)
							
							current += Math.max(xpos2 - xpos1 + 3, 0) ;
						}
					} else if (literal.relation == "beside") {
						if (xpos1 == -2) { //current place is hand
							//Move the item one less space than the distance to the target and then drop it (+1)
							current += Math.abs(state.arm - xpos2);
							//if above the target, move one step and drop it
							if (state.arm == xpos2) {
								current += 2;
							}
						} else if (Math.abs(xpos2 - xpos1) != 1) {
							current += Math.abs(xpos2 - xpos1 + 1) ;
						} //else already beside
					}
					longest = Math.max(current, longest);
					current = 0;	
				}
				//Find smallest heuristic for any of the disjunctive expressions
				shortest = Math.min(longest, shortest);
			}
			//console.log(shortest);
			return shortest;
			
			
			
			
		}
		/**
		*  Simple heuristic. Uses (almost) only the difference in x-positions of targets and sources. 
		*/
		function manhattanish (state : WorldStateNode) : number {
			var shortest : number = 100000000;
			var longest : number = 0;
			var current : number = 0;
			//A dictionary from string id:s of objects to positions in the world
			var positions = getPositions(state);
			//Find the minimum Manhattan distance of any conjunctive expression
			for (var conjunct of interpretation) {
				//The Manhattan distance is given by the sum of the Manhattan distance
				//to travel to satisfy each of the literals. 
				longest = 0;
				for (var literal of conjunct) {
					var xpos1 : number = positions.getValue(literal.args[0])[0];;
					var xpos2 : number;
					if (literal.relation != "holding")
						xpos2 = positions.getValue(literal.args[1])[0];
					//If we wish to hold the target object, only check x-distance to goal. 
					if (literal.relation =="holding") {
						current += (Math.abs(xpos1 - state.arm) + 1);
					} 
					//if the goal is to put the source in the same x-coordinate as the goal
					else if (literal.relation == "ontop" || literal.relation == "under" ||
								literal.relation == "inside" ||literal.relation == "above")  {
						
						if (xpos2 == -1) { //target is floor
							current += 1;
						} else if (xpos1 == -2) { //current place is hand
							//Move the hand, and the drop it (+1)
							current += Math.abs(xpos2 - state.arm) + 1;
						} else if (Math.abs(xpos1 - xpos2) != 0){
							//Pick up an object (+1) move the hand and drop it (+1)
							current += Math.abs(xpos1 - xpos2) + 2;
						} //else object is already in correct column 
							
					} 
					//If Source should be left of target
					else if (literal.relation == "leftof") {
						if (xpos1 == -2) { //current place is hand
							if (xpos2 >= state.arm) {
								//Move the hand (+1 to get to other side of target) , then drop it (+1)
								current += state.arm - xpos2 + 2;
							} else {
								//Drop the item
								current += 1;
							}
						} else {
							//Pick up an object (+1) move the hand (+1 to get to other side of target) 
							//and drop it (+1) or 
							//if already to the left, this part of the goal is already reached (0)
							current += Math.max(xpos1 - xpos2 + 3, 0) ;
						}
					} 
					//If Source should be right of target
					else if (literal.relation == "rightof") {
						if (xpos1 == -2) { //current place is hand
							if (xpos2 <= state.arm) {
								//Move the hand (+1 to get to other side of target) then drop it (+1)
								current += xpos2 - state.arm + 2;
							} else {
								//Drop the item
								current += 1;
							}
						} else {
							//Pick up an object (+1) move the hand (+1 to get to other side of target) 
							//and drop it (+1) or 
							//if already to the right, this part of the goal is already reached (0)
							current += Math.max(xpos2 - xpos1 + 3, 0) ;
						}
					} else if (literal.relation == "beside") {
						if (xpos1 == -2) { //current place is hand
							//Move the item one less space than the distance to the target and then drop it (+1)
							//Todo: if above the target, this can be improved
							current += Math.abs(state.arm - xpos2);
						} else if (Math.abs(xpos2 - xpos1) != 1) {
							current += Math.abs(xpos2 - xpos1 + 1) ;
						} //else already beside
					}
					longest = Math.max(current, longest);	
					current = 0;
				}
				//Find smallest heuristic for any of the disjunctive expressions
				shortest = Math.min(longest, shortest);
			}
			//console.log(shortest);
			return shortest;
		}
		//Return value
		var plan : string[] = [];
		//Create a start node object
		var startNode : WorldStateNode = new WorldStateNode(state.stacks, state.holding, state.arm, state.objects);
		//Result from aStarSearch (needs to be massaged to get a list of command strings
		var foundResult : SearchResult<WorldStateNode> =
			aStarSearch<WorldStateNode>(
				new WorldStateGraph(),
				startNode,
				goalIsReached, //goal
				manhattanishv3, //heuristic
				100);	  //time
		//console.log("Found result:");
		//console.log(foundResult);

		// Handle the found result

		var nodeResult : WorldStateNode[] = foundResult.path;
		
		// If we did not start at a world state that already fulfills the goal
		if (nodeResult.length > 0) {
			var nextNode : WorldStateNode;
			var currNode : WorldStateNode;
			//The result returned from the search function does not include the start node, so prepend it. 
			nodeResult = [startNode].concat(nodeResult);
			//Find a command for each successive world state
			for(var i = 0;i<nodeResult.length - 1;i++){
				currNode = nodeResult[i];
				nextNode = nodeResult[i+1];
				//Go right 
				if (currNode.arm == nextNode.arm - 1) {
					plan.push('r');
				//Go left
				} else if (currNode.arm == nextNode.arm + 1) {
					plan.push('l');
				//Drop a held item
				} else if (nextNode.holding == null) {
					plan.push('d');
				//Pick up an item
				} else {
					plan.push('p');
				}			
			}
		} else {
			//The goal is fulfilled at the starting world state
			return [];
		}

		return plan;
		}

}

class WorldStateNode implements WorldState {
	stacks: Stack[];
    /** Which object the robot is currently holding. */
    holding: string;
    /** The column position of the robot arm. */
    arm: number;
    /** A mapping from strings to `ObjectDefinition`s. The strings are meant to be identifiers for the objects (see 	ExampleWorlds.ts for an example). */
    objects: { [s:string]: ObjectDefinition; };
    /** List of predefined example sentences/utterances that the user can choose from in the UI. */
    examples: string[];
	constructor (stacks : Stack[], holding : string, arm : number, objects : { [s:string]: ObjectDefinition; }) {
		this.stacks = stacks; this.holding = holding; this.arm = arm; this.objects = objects; this.examples = null;

	}

	/**
	* A string with all the members represented on a single line 
	*/
	toString() : string {
		var value : string = "";
		for (var s of this.stacks) {
			value = value + "[" + s + "]";
		}
		value = value + "   arm: " + this.arm;
		value = value + "   holding: " + this.holding;
		return value;
	}
	/**
	* A deep copy of a world state
	*/
	clone () : WorldStateNode {
		var newStacks : Stack[] = [];
		for (var i = 0; i < this.stacks.length; i++) {
			newStacks.push(this.stacks[i].slice());
		}
		return new WorldStateNode(newStacks, this.holding, this.arm, this.objects);
	}
}



class WorldStateGraph implements Graph<WorldStateNode> {
	
	/**
	* Find all allowed moves from a world state; return edges to the resulting world states for those moves
	*/
	outgoingEdges(gn : WorldStateNode) :  Edge<WorldStateNode>[] {

		var results : Edge<WorldStateNode>[] = [];
		//Can we pick up an item? We cannot be holding anything and the stack below the arm needs to be non-empty
		if (!gn.holding && gn.stacks[gn.arm].length > 0) {
			//New world state
			var gnnew = gn.clone();
			//Move an item from a stack to the arm
			var currStack : Stack = gnnew.stacks[gnnew.arm];
			gnnew.holding = currStack.pop();
			var newEdge : Edge<WorldStateNode> = {from: gn, to: gnnew, cost : 1};
			//Add new world state to results
			results.push(newEdge);
		}
		//Can we drop an item? We need to be holding an item
		if (gn.holding) {
			//Create a new world state
			var gnnew = gn.clone();
			var currStack : Stack = gnnew.stacks[gnnew.arm];
			var newEdge : Edge<WorldStateNode> = {from: gn, to: gnnew, cost : 1};
			//If an item is below the arm, check that the held item can be dropped on it
			if (currStack.length > 0) {
				var heldObject : ObjectDefinition = gn.objects[gn.holding];
				var topObject : ObjectDefinition = gn.objects[currStack[currStack.length-1]];
				if (Interpreter.isPhysical("ontop", heldObject, topObject)||
					Interpreter.isPhysical("inside", heldObject, topObject)) {
					currStack.push(gn.holding);
					gnnew.holding = null;
					//Add new world state to results
					results.push(newEdge);
				}
			} 
			//No item below the arm, just drop the held item
			else {
				currStack.push(gn.holding);
				gnnew.holding = null;
				//Add new world state to results
				results.push(newEdge);
			}
		}
		//Can we move left? If so, we cannot be at the leftmost coordinate.  
		if (gn.arm != 0) {
			var gnnew = gn.clone();
			var newEdge : Edge<WorldStateNode> = {from: gn, to: gnnew, cost : 1};
			//Move arm left
			gnnew.arm--;
			//Add new world state to results
			results.push(newEdge);
		}
		//Can we move right? If so, we cannot be at the rightmost coordinate. 
		if (gn.arm != gn.stacks.length -1) {
			var gnnew = gn.clone();
			var newEdge : Edge<WorldStateNode> = {from: gn, to: gnnew, cost : 1};
			//Move arm right
			gnnew.arm++;
			//Add new world state to results
			results.push(newEdge);
		}
		return results;
	}

	/* 
	* Helper function for compareNodes, checking whether two arrays of stacks contain the same objects
	*/
	compareStacks(stackA : string[][], stackB : string[][]) : boolean {
		
		//If stacks are not equal size, they are not equal
		if(stackA.length != stackB.length){
			return false;
		}
		for (var i = 0; i < stackA.length; i++) {
			//As soon as non-matching item is found, stacks are not equal, so return false
			if(stackA[i].length != stackB[i].length){
				return false;
			}
			for (var j = 0; j < stackA[i].length; j++) {
				if(stackA[i][j] != stackB[i][j]){
					return false;
				}
			}
		}
		//No differences found, return true
		return true;
	}

	compareNodes(stateA : WorldState, stateB : WorldState) : number {

		//Compare the stacks, the item held in the arm and the position of the arm
		if(this.compareStacks(stateA.stacks, stateB.stacks) && stateA.holding == stateB.holding &&
		   stateA.arm == stateB.arm){
			//items are equal
			return 0;
		} else {
			//items are not equal
			return 1;
		}
	}
}
//var hard = "put the black ball in the large yellow box";
//var easy = "take a ball"
//var result: Parser.ParseResult[] = Parser.parse(hard);
//Interpreter.interpretCommand(result, ExampleWorlds["small"]);
//var formula: Interpreter.InterpretationResult[] = Interpreter.interpret(result, ExampleWorlds["small"]);
//var plan = Planner.plan(formula,ExampleWorlds["small"]);
