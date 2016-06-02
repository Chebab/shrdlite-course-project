///<reference path="World.ts"/>
///<reference path="Parser.ts"/>
///<reference path="Interpreter.ts"/>
///<reference path="Planner.ts"/>
///<reference path="ParenthesizedCommandParser.ts"/>

module Shrdlite {

    export function interactive(world : World) : void {
        function endlessLoop(utterance : string = "") : void {
            var inputPrompt = "What can I do for you today? ";
            var nextInput = () => world.readUserInput(inputPrompt, endlessLoop);
            if (utterance.trim()) {
                var plan : string[] = splitStringIntoPlan(utterance);
                if (!plan) {
					parseUtteranceIntoPlan(world, utterance, function(s : string[]) {
						
						if (s) {
							world.printDebugInfo("Plan: " + s.join(", "));
							world.performPlan(s, nextInput);

						} else {
							nextInput();
						}
					});
                }
                
            } else {
				nextInput();
			}
        }
        world.printWorld(endlessLoop);
    }


    /**
     * Generic function that takes an utterance and returns a plan. It works according to the following pipeline:
     * - first it parses the utterance (Parser.ts)
     * - then it interprets the parse(s) (Interpreter.ts)
     * - then it creates plan(s) for the interpretation(s) (Planner.ts)
     *
     * Each of the modules Parser.ts, Interpreter.ts and Planner.ts
     * defines its own version of interface Result, which in the case
     * of Interpreter.ts and Planner.ts extends the Result interface
     * from the previous module in the pipeline. In essence, starting
     * from ParseResult, each module that it passes through adds its
     * own result to this structure, since each Result is fed
     * (directly or indirectly) into the next module.
     *
     * There are two sources of ambiguity: a parse might have several
     * possible interpretations, and there might be more than one plan
     * for each interpretation. In the code there are placeholders
     * that you can fill in to decide what to do in each case.
     *
     * @param world The current world.
     * @param utterance The string that represents the command.
     * @returns A plan in the form of a stack of strings, where each element is either a robot action, like "p" (for pick up) or "r" (for going right), or a system utterance in English that describes what the robot is doing.
     */
    export function parseUtteranceIntoPlan(world : World, utterance : string,  callback: (s : string[]) => void) : void{
        // Parsing
        world.printDebugInfo('Parsing utterance: "' + utterance + '"');
		var successIndices : number[] = [];
        try {
            var parses : Parser.ParseResult[] = Parser.parse(utterance);
            world.printDebugInfo("Found " + parses.length + " parses");
            parses.forEach((result, n) => {
                world.printDebugInfo("  (" + n + ") " + Parser.stringify(result));
            });
        }
        catch(err) {
            world.printError("Parsing error", err);
            callback(null);
        }

        // Interpretation
        try {
            var interpretations : Interpreter.InterpretationResult[] = Interpreter.interpret(parses, world.currentState, successIndices);
            world.printDebugInfo("Found " + interpretations.length + " interpretations");
            interpretations.forEach((result, n) => {
                world.printDebugInfo("  (" + n + ") " + Interpreter.stringify(result));
            });

            if (interpretations.length > 1) {
                // First let planner try to do something with both plans, then let user decide if there are 
				// several possible solutions
            }
        }
        catch(err) {
            world.printError("Interpretation error", err);
            callback(null);
        }

        // Planning
        try {
            var plans : Planner.PlannerResult[] = Planner.plan(interpretations, world.currentState);
            world.printDebugInfo("Found " + plans.length + " plans");
            plans.forEach((result, n) => {
                world.printDebugInfo("  (" + n + ") " + Planner.stringify(result));
            });

            if (plans.length > 1) {
				try {
					world.printSystemOutput("There are " + plans.length + " ways of parenthesizing what you wrote that make sense:")
					for(var s of ParenthesizedCommandParser.parsesToStrings(parses, successIndices)) {
						world.printSystemOutput(s);
					}
					world.readUserInput("What to do? Answer with a number please.", function (s : string): void {
						var answer : number = parseInt(s);
						if (isNaN(answer) || answer > plans.length - 1) {
							world.printSystemOutput("You did not answer the question with a valid number, so I will just pick the first option");
							plans = [plans[0]];
						} else {
							plans = [plans[answer]];
						}
						var finalPlan : string[] = plans[0].plan;
						world.printDebugInfo("Final plan: " + finalPlan.join(", "));
 
						callback(finalPlan);
					});
				} 
				//unimplemented readUserInput, just pick the first plan
				catch (err) {
					if (err == "Not implemented!") {
						world.printSystemOutput("Since your world implementation does not allow me to ask you anything, I'm just picking the first of those possible interpretations");
						plans = [plans[0]];
						var finalPlan : string[] = plans[0].plan;
						world.printDebugInfo("Final plan: " + finalPlan.join(", "));
						callback(finalPlan);
					} else {
						throw err;
					}
				}
				
				
                // several plans were found -- how should this be handled?
                // this means that we have several interpretations,
                // should we throw an ambiguity error?
                // ... throw new Error("Ambiguous utterance");
                // or should we select the interpretation with the shortest plan?
                // ... plans.sort((a, b) => {return a.length - b.length});
            } 
			//only one plan found
			else {
				var finalPlan : string[] = plans[0].plan;
				world.printDebugInfo("Final plan: " + finalPlan.join(", "));
				callback(finalPlan);
			}
        }
        catch(err) {
            world.printError("Planning error", err);
            callback(null);
        }
    }

    /** This is a convenience function that recognizes strings
     * of the form "p r r d l p r d"
     */
    export function splitStringIntoPlan(planstring : string) : string[] {
        var plan : string[] = planstring.trim().split(/\s+/);
        var actions : {[act:string] : string}
            = {p:"Picking", d:"Dropping", l:"Going left", r:"Going right"};
        for (var i = plan.length-1; i >= 0; i--) {
            if (!actions[plan[i]]) {
                return;
            }
            plan.splice(i, 0, actions[plan[i]]);
        }
        return plan;
    }

}
