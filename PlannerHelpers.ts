///<reference path="World.ts"/>
///<reference path="Parser.ts"/>

module PlannerHelpers {


	export interface Move {
		fromIndex?: number;
		toIndex?: number;
		initialWait?: number;
		worldStates: WorldStateNode[];
	}

	export function objIsUnique(obj : Parser.Object, theState : WorldState) : boolean {
		return Interpreter.findObjects(obj, theState, Object.keys(theState.objects), null).length == 1;
	}
	
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
		//TODO: what if multiple objects have all properties in common?
	}
	

	
	
	export function getDescribingText(prevState : WorldState, nextState : WorldState) : string {
		var retString = "";
		var heldItem = nextState.holding;
		if (heldItem != null) {
			retString += "pick up the ";
			retString += objectString(nextState.objects[heldItem], prevState);
			return retString;
		} else {
			
			retString += "drop it on the ";			
			var onString : string;
			var arm = nextState.arm;
			if (prevState.stacks[arm].length == 0) {
				onString = "floor of column " + arm;
			} else {
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
		
		for (; i < states.length-2; i += 2) {
			
			var prevState = states[i];
			var midState = states[i+1];
			var nextState = states[i+2];
			var from : number = midState.arm;
			var to : number = nextState.arm;
			retMoves.push({fromIndex: from, toIndex: to, worldStates: [prevState, midState, nextState]});
		}
		//goal was to pick up an item
		if (states[states.length-1].holding != null) {
			var prevState = states[i];
			var nextState = states[i+1];
			var from : number = nextState.arm;
			retMoves.push({fromIndex: from, worldStates : [prevState, nextState]});
		}
		return retMoves;
	}
	
	export function getTwoArmMoves(moves : Move[], initialLoc1 : number, initialLoc2 : number) : Move[][] {
		var result : Move[][] = [[],[]];
		var time : number = 0;
		var armBusyUntil = [0, 0];
		var armTimeOfPickup = [-1, -1];
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
					}
					armMoveTo[arm] = nextMove.toIndex;
					var distanceToTarget = Math.abs(armMoveTo[arm] - armMoveFrom[arm]);
					
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
			time = Math.min(armBusyUntil[0], armBusyUntil[1]);
		}
		return result;
	}

	export function getPlanStringsFromMoves(moves : Move[], initialLoc : number) : string[] {
		
		var result : string[] = [];
		var location : number = initialLoc;
		for (var m of moves) {
			//initial wait
			for(var i = 0; i < m.initialWait; i++) {
				result.push("n");
			}
			
			//textual description
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