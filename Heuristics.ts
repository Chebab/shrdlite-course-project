///<reference path="World.ts"/>
///<reference path="Parser.ts"/>

module Heuristics {

	export var interpretation : Interpreter.DNFFormula = null;
	export var penaltyPerLiteral : number = 0;

	export function combinationHeuristic(state: WorldStateNode) : number {			
		return Math.max(combineAllConjunctsheuristic(state), focusOnOneConjunctHeuristic(state));
	}

	
	//This heurstic looks at all the literals of a conjunct and tries finds
	//a lower bound for the cost of fulfilling all those literals in total. 
	//This should often work less well than focusOnOneConjunctHeuristic on
	//goals with just one or a few literals. 
	function combineAllConjunctsheuristic(state : WorldStateNode) : number {
		//Private helper functions
		function filterMoveNeeded(moved : string[], literal : Interpreter.Literal, distance : number) : number { 
			if (moved.indexOf(literal.args[0]) == -1 &&
				moved.indexOf(literal.args[1]) == -1) {
				
				moved.push(literal.args[0]);
				moved.push(literal.args[1]);
				return distance;
			} else {
				return 0;
			}
		}

		function updateDigDepthsFromConnections(minDigDepths : number[], connections : number[][]) : number[] {
			
			var moveDistance : number = 0;
			var closestArmDistance : number = 0;
			while (connections.length > 0) {
				
				//Find deepest pair
				var deepest : number [] = [];
				var deepestValue : number = 0;
				var xcoord : number;
				var depth : number;
				//Look for the deepest pair of items (the item with the largest minimum depth)
				//after accounting for stuff that has already been removed to deal with 
				//above/under/ontop/inside - literals. 
				//A connection is an array of the form [x1, y1, depth1, x2, y2, depth2, z] where z
				//is -1 if this comes from a beside-literal and 1 if it is a leftof/rightof-literal
				//corresponding to a literal with leftof/rightof as the relation
				//console.log("entering loop ---------------");
				//This should maybe be expressed as       if (connections.length > 0){ while (true) {...
				for (var c of connections) {
					var depth1 : number = Math.max(c[2] - minDigDepths[c[0]],0);
					var depth2 : number = Math.max(c[5] - minDigDepths[c[3]],0);
						
					var xcoordtemp : number;
					//Find shallowest of items in this literal
					if (depth1 < depth2) {
						depth = depth1;
						xcoordtemp = c[0];
					} else {
						depth = depth2;
						xcoordtemp= c[3];
					}
					//If minimum depth of the pair is greater than what has previously been seen
					if (depth > deepestValue) {
						deepest = c;
						deepestValue = depth;
						xcoord = xcoordtemp;
					}
				}
				//Break when no new literal can be found, under the ones already accounted for. 
				if (deepest.length == 0) {
					break;
				}
				//Set the minimum dig depth to the 
				//depth of the shallowest item in the found literal for the column in which it is found
				//console.log("setting x: " + xcoord  + " to " + deepestValue);
				minDigDepths[xcoord] += deepestValue;
				//The last term is either 1 or -1 depending on whether this is a "beside" or "leftof/rightof"
				//literal
				if (deepest[0] != -2 && deepest[3] != -2) {
					moveDistance += Math.max(Math.abs(deepest[0] - deepest[3]) + deepest[6], 0);
				}
				else {
					//exactly one of objects is in hand
					closestArmDistance = Math.abs(state.arm - Math.max(deepest[0],deepest[3]));
				}
				
			}
			return [moveDistance, closestArmDistance];
		}
		
		function sumUpAllCostFactors(minDigDepths : number[], toFloorCount : number, 
									minMoveDistance : number, closestDistFromArm : number, 
									penalty : number, state: WorldState) : number {
			
			
			var sum : number = 0;
			//for all columns, sum up how many items need to be moved above the items mentioned in the literals
			for (var val of minDigDepths) {
				//4 actions per item to move: pick up, move, drop, move back
				sum += val*4;
			}
			
			//Find the number of columns that need to be cleared. 
			if (toFloorCount > 0) {
				//leftAfterMinDig is height of columns after items mentioned in the literals have been
				//removed. 
				var leftAfterMinDig : number[] = []
				for (var i = 0; i < state.stacks.length; i++) {
					leftAfterMinDig[i] = state.stacks[i].length - minDigDepths[i];
				}
				//Find the smallest columns
				leftAfterMinDig.sort(function s(a : number, b : number) : number {return a - b;} );
				for (var i = 0; i < toFloorCount; i++) {
					//4 actions per item to move: pick up, move, drop, move back
					sum += leftAfterMinDig[i]*4;
				}
			}
			
			//If closestDistFromArm was not updated in the for loops, we do not have a value for this
			if (closestDistFromArm == 1000000) closestDistFromArm = 0;
			
			if (state.arm == null) {
				return sum + minMoveDistance + closestDistFromArm + penalty;
			} else {
				return sum + minMoveDistance  + penalty;
			}
		}
		//End of private helper functions
	
	
		//This counts how many items need to be removed above the items mentioned in the 
		//literals
		var minDigDepths : number[] = [];
		for (var i = 0; i < state.stacks.length; i++) {
			minDigDepths.push(0);
		}
		//For leftof/rightof/under/above - tracks where stuff is that needs to be moved and how much stuff is 
		//above that stuff 
		var connections : number[][] = [];
		//Set this to any other value than 0 to get a non-admissible heuristic that
		//penalizes states where more literals are unfulfilled
		//The result of this heuristic is the minimum of the estimated costs for fulfilling each conjunct. 
		var bestConjunctVal : number = 1000000000;
		//A dictionary from string id:s of objects to positions in the world
		var positions = getPositions(state);
		//A measure of minimum distance to travel between items
		var minMoveDistance : number = 0;
		//A measure of distance from arm to an item
		var closestDistFromArm : number = 1000000;
		for (var conjunct of interpretation) {
			//added to for each unfulfilled literal (if penaltyPerLiteral != 0)
			var penalty = 0; 
			//Number of items that need to be placed ontop of floor
			var toFloorCount : number = 0;
			for (var literal of conjunct) {
				//moved is used to keep track so that no double-counting is done. 
				//If an object is mentioned in more than one literal, only allow one of 
				//those literals to be used in this heuristic. Should maybe be a set
				//but since the number of items is so small, this should work just as well
				var moved : string[] = [];
				var xpos1 : number = positions.getValue(literal.args[0])[0];
				var ypos1 : number = positions.getValue(literal.args[0])[1];
				//number of items above the first argument of the literal
				var abovecount1 : number = 0;
				//if held, leave at 0 (xpos1 should never be -2)
				if (xpos1 != -1 && xpos1 != -2)
					abovecount1 = Math.max(state.stacks[xpos1].length - ypos1 - 1, 0);
				
				var xpos2 : number;
				var ypos2 : number;
				var abovecount2 : number;
				//Find position of 2nd argument of literal, and number of items above it
				if (literal.relation != "holding") {
					xpos2 = positions.getValue(literal.args[1])[0];
					ypos2 = positions.getValue(literal.args[1])[1];
					if (xpos2 == -2) {
						abovecount2 = 0;
					} else if (xpos2 == -1) {
						//Count the number of items that need to be placed on the floor
						toFloorCount++;
					} else {
						abovecount2 = state.stacks[xpos2].length - ypos2 - 1;
					}
				}
				
				//If literal already fulfilled, move on
				if (Interpreter.isFeasible(literal.relation, [xpos1, ypos1], [xpos2, ypos2])) {
					continue;
				}
				
				//This makes the heuristic non-admissible if penaltyPerLiteral != 0. But it 
				//can speed the planning up quite a bit for goals with many literals. 
				penalty += penaltyPerLiteral; 
				
				switch (literal.relation) {
					//if we want to be holding an item, find the number of items above it and how far to move
					//to the stack containing it
					case "holding": 
						minDigDepths[xpos1] = Math.max(minDigDepths[xpos1], abovecount1);
						minMoveDistance += Math.abs(xpos1 - state.arm);
						break;
					//if we want to put something directly above an item, find how many items need to be
					//moved to access both items, and the distance to move the arm to one of the items
					case "ontop": case "inside": 
						//Closest distance to move the arm to either of the arguments of the literal
						if (state.holding == null) {
							closestDistFromArm = Math.min(closestDistFromArm, Math.abs(state.arm - xpos1));
							//if target is neiher floor, nor held
							if (xpos2 != -1 && xpos2 != -2) { 
								closestDistFromArm = Math.min(closestDistFromArm, Math.abs(state.arm - xpos2));
							}
						}
						//Find how many items need to be removed above 1st argument of literal.
						//if source not held
						if (xpos1 != -2) {
							minDigDepths[xpos1] = Math.max(minDigDepths[xpos1],abovecount1);
						} 
						
						//Find how far the arm needs to be moved between items
						//target neither held nor floor
						if (xpos2 != -1 && xpos2 != -2) {
							minDigDepths[xpos2] = Math.max(minDigDepths[xpos2],abovecount2);
							//1st item not held
							if (xpos1 != -2) {
								//addToMoved returns 0 if we cannot certainly know that this move will occur
								minMoveDistance += filterMoveNeeded(moved, literal, Math.abs(xpos2-xpos1));
							} 
							//1st item held
							else {
								minMoveDistance += filterMoveNeeded(moved, literal, Math.abs(xpos2 - state.arm));
							}
						}
						//2nd item held, need to move arm to first item
						if (xpos2 == -2) {
							minMoveDistance += filterMoveNeeded(moved, literal, Math.abs(xpos1 - state.arm));
						}
						break;
					//Could do the same things as in "ontop" and "inside" here (move this case up, add the +1?)
					case "under":	
						//Can only be sure that the target needs to be cleared and lifted. 
						if (xpos2 != -1 && xpos2 != -2) {
							minDigDepths[xpos2] = Math.max(minDigDepths[xpos2],abovecount2 + 1);
						}							
						break;
					case "above": 
						if (xpos1 != -2) {
							minDigDepths[xpos1] = Math.max(minDigDepths[xpos1],abovecount1);
						}
						break;
					//Deal with leftof/rightof after finding all the literals that have a 
					//leftof/rightof relation. Just gather them up here.
					case "leftof": case "rightof" :
						if (xpos1 != -2) {
							connections.push([xpos1,ypos1,abovecount1,xpos2,ypos2,abovecount2, 1])
						}
						break;
					case "beside": 
						if (xpos1 != -2)
							connections.push([xpos1, ypos1, abovecount1, xpos2, ypos2, abovecount2, -1]);
						break;
				}
			}
			
			//This is for the leftof/rightof/beside literals in this conjunction, if any
			var distances : number[] = updateDigDepthsFromConnections(minDigDepths, connections);
			minMoveDistance += distances[0];
			closestDistFromArm = Math.max(distances[1],closestDistFromArm);
			
			var score = sumUpAllCostFactors(minDigDepths, toFloorCount, minMoveDistance, closestDistFromArm, penalty, state);
			
			bestConjunctVal = Math.min(bestConjunctVal,score); 
		}
		
		return bestConjunctVal;
	}
	
	//Detailed heuristic that returns the largest estimated cost of fulfilling one of the 
	//conjuncts in the DNFFormula. Should work well for goals with only a few easily reached subgoals left
	function focusOnOneConjunctHeuristic(state : WorldStateNode) : number {
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
					if (xpos1 == -2 || xpos2 == -2) { //current place is hand
						if (Math.max(xpos1,xpos2) >= state.arm) {
							//Move the hand (+1 to get to other side of target) , then drop it (+1)
							current += state.arm - Math.max(xpos1,xpos2) + 2;
						} else {
							//Drop the item
							current += 1;
						}
					} else {
						//Get to source
						current += Math.min(Math.abs(state.arm - xpos1),Math.abs(state.arm - xpos2));
						//Pick up an object (+1) move the hand (+1 to get to other side of target) 
						//and drop it (+1) or 
						//if already to the left, this part of the goal is already reached (0)
						current += Math.max(xpos1 - xpos2 + 3, 0) ;
						
					}
				} 
				//If Source should be right of target
				else if (literal.relation == "rightof") {
					if (xpos1 == -2 || xpos2 == -2) { //current place is hand
						if (Math.max(xpos1,xpos2) <= state.arm) {
							//Move the hand (+1 to get to other side of target) then drop it (+1)
							current += Math.max(xpos1,xpos2) - state.arm + 2;
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
					if (xpos1 == -2 || xpos2 == -2) { //current place is hand
						//Move the item one less space than the distance to the target and then drop it (+1)
						current += Math.abs(state.arm - Math.max(xpos1,xpos2));
						//if above the target, move one step and drop it
						if (state.arm == Math.max(xpos1,xpos2)) {
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

	export function getPositions(state : WorldStateNode) : collections.Dictionary<string, number[]> {
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
}