///<reference path="World.ts"/>
///<reference path="Parser.ts"/>

module PlannerHelpers {

	//A useful represetation of the plan for some parts of the planning is as a series of moves of items
	//from a given stack index to another given stack index. 
	export interface Move {
		//this is null if only dropping an item
		fromIndex?: number;
		//this is null if only picking up an item
		toIndex?: number;
		//time to wait before starting to move the item
		initialWait?: number;
		worldStates: WorldStateNode[];
	}

	//Given a partial description of an object, return true if the description only
	//matches one object in the world
	export function objIsUnique(obj : Parser.Object, theState : WorldState) : boolean {
		return Interpreter.findObjects(obj, theState, Object.keys(theState.objects), null).length == 1;
	}
	
	//Returns a string describing an object, containing as few descriptors as possible 
	//such that the description singles out the object in the world state. If there are
	//several identical objects in the world, it returns a full item description that matches 
	//any of those. 
	export function objectString(od : ObjectDefinition, theState : WorldState) : string {
		//Is one property enough to single out the object in the world?
		var obj : Parser.Object = {form : od.form};
		if (objIsUnique(obj, theState))
			return od.form;
		
		obj = {form : "any", size : od.size};
		if (objIsUnique(obj, theState))
			return "" + od.size + " object";
		
		obj = {form : "any", color : od.color};
		if (objIsUnique(obj, theState))
			return "" + od.color + " object";
		
		//Are two properties enough?
		
		obj = {form : od.form, color : od.color};
		if (objIsUnique(obj, theState))
			return od.color + " " + od.form;
		
		obj = {form : od.form, size : od.size};
		if (objIsUnique(obj, theState))
			return od.size + " " + od.form;
		
		obj = {color : od.color, size : od.size, form : "any"};
		if (objIsUnique(obj, theState))
			return od.size + " " + od.color + " " + "object";
		
		//Need all three properties
		obj = {form : od.form, color : od.color, size : od.size};
		
		return od.size + " " + od.color + " " + od.form;
	}
	
	//Given the world state before and after an object is either picked up or
	//dropped, return a string describing what item is either picked up or dropped
	export function getDescribingText(prevState : WorldState, nextState : WorldState) : string {
		var retString = "";
		var heldItem = nextState.holding;
		//Picking up an item
		if (heldItem != null) {
			retString += "pick up the ";
			retString += objectString(nextState.objects[heldItem], prevState);
			return retString;
		} else {
			//Dropping an item
			retString += "drop it on the ";			
			var onString : string;
			var arm = nextState.arm;
			//Dropped on floor
			if (prevState.stacks[arm].length == 0) {
				onString = "floor of column " + arm;
			} 
			//Dropped on another item
			else {
				//Why peek no exist?
				var topObj = prevState.stacks[arm].pop();
				prevState.stacks[arm].push(topObj);
				var topObjDef = nextState.objects[topObj];
				onString = objectString(topObjDef, nextState);
			}
				
			retString += onString;
			return retString;
		}
	}
	
	
	//Change representation of a plan from (a series of world states) to (a series of moves)
	export function getMoves(states : WorldStateNode[]) : Move[] {
		var retMoves : Move[] = [];
		var i : number = 0;
		
		//if starting with an item in hand
		if (states[0].holding != null) {
			var prevState = states[0];
			var nextState = states[1];
			var to : number = nextState.arm;
			retMoves.push({toIndex : to, worldStates: [prevState, nextState]});
			i++;
		}
	
		//If a full move (pick up + drop)
		for (; i < states.length-2; i += 2) {
			
			var prevState = states[i];
			var midState = states[i+1];
			var nextState = states[i+2];
			var from : number = midState.arm;
			var to : number = nextState.arm;
			retMoves.push({fromIndex: from, toIndex: to, worldStates: [prevState, midState, nextState]});
		}
		//if only picking up an item
		if (states[states.length-1].holding != null) {
			var prevState = states[i];
			var nextState = states[i+1];
			var from : number = nextState.arm;
			retMoves.push({fromIndex: from, worldStates : [prevState, nextState]});
		}
		return retMoves;
	}
	
	//Splits a list of moves into two lists, where the two lists of moves can be performed in parallell
	//by two arms. Also inserts waiting times to maintain result consistency with the initial plan. 
	export function getTwoArmMoves(moves : Move[], initialLoc1 : number, initialLoc2 : number) : Move[][] {
		var result : Move[][] = [[],[]];
		//counter for current time
		var time : number = 0;
		//Initial values not actually used for the following two
		//these give the next time when each arm will pick up an item or drop it
		var armTimeOfPickup = [-1, -1];
		var armBusyUntil = [0, 0];
		//at the current time, these describe where each arm is going
		var armMoveFrom = [initialLoc1, initialLoc2];
		var armMoveTo = [initialLoc1, initialLoc2];
		var first : boolean = true;
		while (moves.length > 0) {
			
			//assign move to first free arm
			for (var arm = 0; arm < 2 && moves.length != 0; arm++) {
				//but always assign last move to arm 0 to maintain consistency with two-arm-agnostic code
				if (moves.length == 1 && arm == 1) {
					arm = 0;
					time = armBusyUntil[0];
				}
				var otherArm = 1 - arm;
				var initialWait = 0;
				//arm is avaliable
				if (armBusyUntil[arm] == time) {
					
					var nextMove = moves.shift();
					//armMoveTo[arm] gives the current location of the arm
					var distanceToSource : number = 0;
					//if drop held item
					if (nextMove.fromIndex != null) {
						 distanceToSource = Math.abs(armMoveTo[arm] - nextMove.fromIndex);
						 armMoveFrom[arm] = nextMove.fromIndex;
					} else {
						//armMoveFrom already at correct value, since this can only happen for the
						//first move, and the initial value has been set
					}
					//if pickup
					if (nextMove.toIndex == null) {
						armMoveTo[arm] = nextMove.fromIndex;
					} else  {
						armMoveTo[arm] = nextMove.toIndex;
					}
					var distanceToTarget = Math.abs(armMoveTo[arm] - armMoveFrom[arm]);
					
					//Handle conflicting moves by inserting wait time
					if (armMoveFrom[arm] == armMoveFrom[otherArm] && !first) {
						initialWait = Math.max(0, armTimeOfPickup[otherArm] - time + 1 - distanceToSource);
					}
					
					if (armMoveFrom[arm] == armMoveTo[otherArm] && !first) {
						initialWait = Math.max(initialWait, armBusyUntil[otherArm] - time + 1 - distanceToSource);
					}
					if (armMoveTo[arm] == armMoveTo[otherArm] && !first) {
						initialWait = Math.max(initialWait, armBusyUntil[otherArm] - time + 1 - distanceToSource - distanceToTarget);
					}
					if (armMoveTo[arm] == armMoveFrom[otherArm] && !first) {
						initialWait = Math.max(initialWait, armTimeOfPickup[otherArm] - time + 1 - distanceToSource);
					}
					//this +2 is sligthly pessimistic (for initial/final move?)
					armBusyUntil[arm] = time + initialWait + distanceToSource + distanceToTarget + 2;
					armTimeOfPickup[arm] = time + initialWait + distanceToSource + 1;
					nextMove.initialWait = initialWait;
					result[arm].push(nextMove);
					first = false;
				} 
			}
			//fast forward until one of the arms is free again
			//note that this is outside the for loop to allow 
			//for the case when two arms are available at the same time
			
			time = Math.min(armBusyUntil[0], armBusyUntil[1]);
		}
		return result;
	}

	//Changes representation of a plan from (a list of moves) to (a list of strings to send to the UI)
	//Each returned string is either a letter (the familiar 'd', 'p', 'l', 'r' or'n' denoting a waiting (null) 
	//action) or a comment describing what the arm is about to do
	export function getPlanStringsFromMoves(moves : Move[], initialLoc : number) : string[] {
		
		var result : string[] = [];
		var location : number = initialLoc;
		for (var m of moves) {
			//initial wait
			for(var i = 0; i < m.initialWait; i++) {
				result.push("n");
			}
			//textual description at start of move
			if (m.fromIndex == null || m.toIndex == null) {
				result.push(getDescribingText(m.worldStates[0], m.worldStates[1]));
			} else {
				result.push(getDescribingText(m.worldStates[0], m.worldStates[1]) + " in order to " + 
						getDescribingText(m.worldStates[1], m.worldStates[2]));
			}			
			
			//actual plan
			//item is to be picked up
			if (m.fromIndex != null) {
				//get to item
				var change = location < m.fromIndex ? 1 : -1;
				var direction = location < m.fromIndex ? "r" : "l";
				while(location != m.fromIndex) {
					result.push(direction);
					location += change;
				}
				//pick it up
				result.push("p");
			}
			//item is to be dropped
			if (m.toIndex != null) {
				//get to item
				change = location < m.toIndex ? 1 : -1;
				direction = location < m.toIndex ? "r" : "l";
				while (location != m.toIndex) {
					result.push(direction);
					location += change;
				}
				//drop it
				result.push("d");
			}
		}
		
		return result;
	}
	
	//Creates a dictionary where you can lookup the position of an item given its id in the given world state
	export function getPositions(state : WorldStateNode) : collections.Dictionary<string, number[]> {
		var positions: collections.Dictionary<string, number[]>
			= new collections.Dictionary<string, number[]>();

		// Add all of the states and their position to the dictionary
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