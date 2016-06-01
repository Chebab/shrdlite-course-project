///<reference path="World.ts"/>
///<reference path="Interpreter.ts"/>
///<reference path="Graph.ts"/>
///<reference path="Heuristics.ts"/>
///<reference path="PlannerHelpers.ts"/>

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

	
	function isCommand(str : string) : boolean {
		return str == 'n' || str == 'd' || str == 'p' || str == 'r' || str == 'l';
	}
	
	
	

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
		
		/**
		* Checks if a goal has been reached in the given state
		*/
		function goalIsReached(state : WorldStateNode) : boolean {
			//A dictionary of positions, given string id:s of objects

			var positions = Heuristics.getPositions(state);
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
		
		

		//Return value
		var plan : string[] = [];
		
		for(var i = 0; i < interpretation.length; i++){
			if(interpretation[i][0].args[0] == "print" && interpretation[i][0].polarity == false){
				plan.push(interpretation[i][0].relation);
				if(i == interpretation.length - 1){
					return plan;
				}
			} 
			
		}
		
		//Create a start node object
		var startNode : WorldStateNode = new WorldStateNode(state.stacks, state.holding, state.holding2, state.arm, state.arm2, state.objects);
		
		var foundResult : SearchResult<WorldStateNode>;
		var searchTime : number = 50;
		var attemptStrings : string[] = [
				"Failed to find a solution in " + searchTime + "s. Trying to cheat a little bit.", 
				"Failed to find a solution in " + (2*searchTime) + "s. Trying to cheat a bit more.", 
				"Failed to find a solution in " + (3*searchTime) + "s. Trying to cheat quite a lot."];
		//set up heuristics
		Heuristics.penaltyPerLiteral = 0;
		Heuristics.interpretation = interpretation;
		for(var i = 0; i < attemptStrings.length + 1; i++ ) {
			try {
				
				foundResult  =
					aStarSearch<WorldStateNode>(
						new WorldStateGraph(),
						startNode,
						goalIsReached, //goal
						Heuristics.combinationHeuristic, //heuristic... focusOnOneConjunctHeuristic
						searchTime);	  //time
				break; //Remove this line to benchmark cheating, with this line left, do cheat if timeouted
				
			}
			
			catch (error) {
				//if timeouted, try to cheat
				if (error.message == "Timed out" && i != attemptStrings.length - 1) {
					plan.push(attemptStrings[i]);
					
				} else {
					throw error;
				}
			} finally {
				//This is in the finally-block to allow for benchmarking of cheating
				Heuristics.penaltyPerLiteral += 4;
			}
		}
		
		// Handle the found result

		var nodeResult : WorldStateNode[] = foundResult.path;
		
		// If we did not start at a world state that already fulfills the goal
		if (nodeResult.length > 0) {
			//The result returned from the search function does not include the start node, so prepend it. 
			nodeResult = [startNode].concat(nodeResult);
			var moves : PlannerHelpers.Move[] = PlannerHelpers.getMoves(nodeResult);
			
			var twoArmMoves : PlannerHelpers.Move[][] = PlannerHelpers.getTwoArmMoves(moves, startNode.arm, startNode.arm2);
			console.log("arm 0 plan: ");
			for (var i = 0; i < twoArmMoves[0].length; i++) {
				console.log(twoArmMoves[0][i]);
			}
			console.log("arm 1 plan: ");
			for (var i = 0; i < twoArmMoves[1].length; i++) {
				console.log(twoArmMoves[1][i]);
			}
			
			var planStrings : string[][] = [];
			for (var i = 0; i < 2; i++) {
				planStrings.push(PlannerHelpers.getPlanStringsFromMoves(twoArmMoves[i], i == 0 ? startNode.arm : startNode.arm2));
			}
			
			//combine plans
			while (planStrings[0].length > 0 || planStrings[1].length > 0) {
				var nextStrs : string[] = [];
				//push describing texts
				for(var j = 0; j < 2; j++) {
					var foundComment : boolean;
					do {
						foundComment = false;
						nextStrs[j] = planStrings[j].shift();
						if (nextStrs[j] != null && !isCommand(nextStrs[j])) {
							plan.push("Arm " + j + ": " + nextStrs[j])
							foundComment = true;
						}
					} while (foundComment);
					//pad plans to equal length
					if (nextStrs[j] == null) nextStrs[j] = 'n';
				}
				//push actual plan
				plan.push(nextStrs[0] + nextStrs[1]);
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
    /** Which object the 2nd robot is currently holding. */
    holding2: string;
    /** The column position of the robot arm. */
    arm: number;
	/** The column position of the 2nd robot arm */
	arm2: number;
    /** A mapping from strings to `ObjectDefinition`s. The strings are meant to be identifiers for the objects (see 	ExampleWorlds.ts for an example). */
    objects: { [s:string]: ObjectDefinition; };
    /** List of predefined example sentences/utterances that the user can choose from in the UI. */
    examples: string[];
	constructor (stacks : Stack[], holding : string, holding2: string, arm : number, arm2 : number, objects : { [s:string]: ObjectDefinition; }) {
		this.stacks = stacks; this.holding = holding; this.holding2 = holding2; this.arm = arm; this.arm2 = arm2; this.objects = objects; this.examples = null;

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
		return new WorldStateNode(newStacks, this.holding, this.holding2, this.arm, this.arm2, this.objects);
	}
}



class WorldStateGraph implements Graph<WorldStateNode> {
	outgoingEdges(gn : WorldStateNode) : Edge<WorldStateNode>[] {
		var results : Edge<WorldStateNode>[] = [];
		if (!gn.holding) {
			for (var i = 0; i < gn.stacks.length; i++) {
				var gnnew = gn.clone();
				gnnew.arm = i;
				var currStack : Stack = gnnew.stacks[i];
				var elemheld = currStack.pop();
				var newEdge : Edge<WorldStateNode>;
				if (elemheld) {
					gnnew.holding = elemheld;
					newEdge  = {from: gn, to: gnnew, cost: (1 + Math.abs(gn.arm - i))};
					results.push(newEdge);
				}
			}
		} else {
			for (var i = 0; i < gn.stacks.length; i++) {
				var gnnew = gn.clone();
				gnnew.arm = i;
				var currStack : Stack = gnnew.stacks[i];
				if (currStack.length > 0) {
					var heldObject : ObjectDefinition = gn.objects[gn.holding];
					var topObject : ObjectDefinition = gn.objects[currStack[currStack.length-1]];
					
					if (Interpreter.isPhysical("ontop", heldObject, topObject)||
						Interpreter.isPhysical("inside", heldObject, topObject)) {
						currStack.push(gnnew.holding);
						gnnew.holding = null;
						
						var newEdge : Edge<WorldStateNode> = {from: gn, to: gnnew, cost: 1 + Math.abs(gn.arm - i)};
						results.push(newEdge);
					}
				} else {
					currStack.push(gnnew.holding);
					gnnew.holding = null;
					
					var newEdge : Edge<WorldStateNode> = {from: gn, to: gnnew, cost: 1 + Math.abs(gn.arm - i)};
					results.push(newEdge);
				}
					
			}
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
