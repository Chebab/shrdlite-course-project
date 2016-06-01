///<reference path="World.ts"/>
///<reference path="Parser.ts"/>
/// <reference path="./ExampleWorlds.ts"/>
///<reference path="lib/collections.ts"/>

/**
* Interpreter module
*
* The goal of the Interpreter module is to interpret a sentence
* written by the user in the context of the current world state. In
* particular, it must figure out which objects in the world,
* i.e. which elements in the `objects` field of WorldState, correspond
* to the ones referred to in the sentence.
*
* Moreover, it has to derive what the intended goal state is and
* return it as a logical formula described in terms of literals, where
* each literal represents a relation among objects that should
* hold. For example, assuming a world state where "a" is a ball and
* "b" is a table, the command "put the ball on the table" can be
* interpreted as the literal ontop(a,b). More complex goals can be
* written using conjunctions and disjunctions of these literals.
*
* In general, the module can take a list of possible parses and return
* a list of possible interpretations, but the code to handle this has
* already been written for you. The only part you need to implement is
* the core interpretation function, namely `interpretCommand`, which produces a
* single interpretation for a single command.
*/
module Interpreter {

    //////////////////////////////////////////////////////////////////////
    // exported functions, classes and interfaces/types

    /**
    Top-level function for the Interpreter. It calls `interpretCommand` for each possible parse of the command. No need to change this one.
    * @param parses List of parses produced by the Parser.
    * @param currentState The current state of the world.
    * @returns Augments ParseResult with a list of interpretations. Each interpretation is represented by a list of Literals.
    */
    var relationStr: string[] = ["leftof", "rightof", "inside", "ontop", "under", "beside", "above"];
    var quantm: string[] = ["any", "all", "a"];
    var quants: string[] = ["the"];
    export function interpret(parses: Parser.ParseResult[], currentState: WorldState): InterpretationResult[] {
        var errors: Error[] = [];
        var interpretations: InterpretationResult[] = [];

        parses.forEach((parseresult) => {
            try {
                var result: InterpretationResult = <InterpretationResult>parseresult;
                result.interpretation = interpretCommand(result.parse, currentState);
                interpretations.push(result);
            } catch (err) {
                errors.push(err);
            }
        });
        if (interpretations.length) {
            return interpretations;
        } else {
            // only throw the first error found
            throw errors[0];
        }
    }

    export interface InterpretationResult extends Parser.ParseResult {
        interpretation: DNFFormula;
    }

    export type DNFFormula = Conjunction[];
    type Conjunction = Literal[];

    /**
    * A Literal represents a relation that is intended to
    * hold among some objects.
    */
    export interface Literal {
        /** Whether this literal asserts the relation should hold
         * (true polarity) or not (false polarity). For example, we
         * can specify that "a" should *not* be on top of "b" by the
         * literal {polarity: false, relation: "ontop", args:
         * ["a","b"]}.
         */

        polarity: boolean;
        /** The name of the relation in question. */
        relation: string;
        /** The arguments to the relation. Usually these will be either objects
         * or special strings such as "floor" or "floor-N" (where N is a column) */

        args: string[];

    }

    export function stringify(result: InterpretationResult): string {

        return result.interpretation.map((literals) => {
            return literals.map((lit) => stringifyLiteral(lit)).join(" & ");
            // return literals.map(stringifyLiteral).join(" & ");
        }).join(" | ");
    }

    export function stringifyLiteral(lit: Literal): string {
        return (lit.polarity ? "" : "-") + lit.relation + "(" + lit.args.join(",") + ")";
    }

    //////////////////////////////////////////////////////////////////////
    // private functions
    /**
     * The core interpretation function. The code here is just a
     * template; you should rewrite this function entirely. In this
     * template, the code produces a dummy interpretation which is not
     * connected to `cmd`, but your version of the function should
     * analyse cmd in order to figure out what interpretation to
     * return.
     * @param cmd The actual command. Note that it is *not* a string, but rather
     * an object of type `Command` (as it has been parsed by the parser).
     * @param state The current state of the world. Useful to look up objects in the world.
     * @returns A list of list of Literal, representing a formula in disjunctive
     * normal form (disjunction of conjunctions). See the dummy interpetation
     * returned in the code for an example, which means ontop(a,floor) AND holding(b).
     */
    function interpretCommand(cmd: Parser.Command, state: WorldState): DNFFormula {


        // IDks of all objects placed in the world
        var objects: string[] = Array.prototype.concat.apply([], state.stacks);
        // Return value
        var interpretation: DNFFormula = [];
        // Mapping the position of all of the states in the world.
        var currentState: collections.Dictionary<string, number[]>
            = new collections.Dictionary<string, number[]>();

        // Add all of the states and their position to the Map
        for (var i = 0; i < state.stacks.length; i++) {
            for (var j = 0; j < state.stacks[i].length; j++) {
                currentState.setValue(state.stacks[i][j], [i, j]);
            }
        }

        if (state.holding != null) {
            // If the arm is holding an object, add that object to the state
            objects.push(state.holding);

            // The position [-2,-2] is used for finding the held object
            currentState.setValue(state.holding, [-2, -2]);

        }

        // Add the floor.
        objects.push("floor");

        //The first element in the position is used to indentify
        // the floor. The second element is the actual position of the floor
        currentState.setValue("floor", [-1, -1]);

        // Find all of the objects given in the first entity

        var sourceobj: string[];
        if (cmd.entity) {
            sourceobj = findEntites(cmd.entity, state, objects, currentState);
            if (sourceobj.length < 1) {
                // If there are no objects found, throw error.
                throw new Error("No source objects found");
            }
        } else {
            if (state.holding) {
                sourceobj = [state.holding];
            } else {
                throw new Error("Not holding anything");
            }
        }
        // All of the objects at the location entity
        var targetobj: string[] = [];

        if (cmd.location != null) {
            // If a location is specified then find the entities at that location
            targetobj = findEntites(cmd.location.entity, state, objects, currentState);
        }



        if (cmd.command == "move" || cmd.command == "put") {
            if (targetobj.length < 1) {
                // If no target object is found, we cannot continue the move,
                // throw error.
                throw new Error("No target objects")
            }
            // Source and target quantifiers
            var sourceQuant: string = "the";
			if (cmd.entity) {
				sourceQuant = cmd.entity.quantifier;
			}
            var targetQuant: string = cmd.location.entity.quantifier;

            // Variables for keeping track of which elements have been explored
            var sourceChecked: string[] = [];
            var targetChecked: string[] = [];
            console.log("Source: "+sourceobj+" "+"Target: "+targetobj);
            // Find all of the combinations of goals
            var allCombinations: Literal[] = [];
            for (var i = 0; i < sourceobj.length; i++) {
                for (var j = 0; j < targetobj.length; j++) {
                    if (sourceobj[i] == targetobj[j]) {
                        // if the objects are the same, nothing can be done
                        continue;
                    }
                    // Fetch the objects from the WorldState
                    var theObjects: ObjectDefinition[] = objectFactory(null,null,
                        sourceobj[i], targetobj[j], state);
                    // The objects to be checked
                    var sourceObject: ObjectDefinition = theObjects[0];
                    var targetObject: ObjectDefinition = theObjects[1];
                    // Check if the combination is physically possible
                    if (isPhysical(cmd.location.relation, sourceObject, targetObject)) {
                        allCombinations.push(
                            {
                                polarity: true,
                                relation: cmd.location.relation,
                                args: [sourceobj[i], targetobj[j]]
                            });
                        //If the source element does not exist in the list, add it
                        if (sourceChecked.indexOf(sourceobj[i]) < 0) {
                            sourceChecked.push(sourceobj[i]);
                        }
                        //If the target element does not exist in the list, add it
                        if (targetChecked.indexOf(targetobj[j]) < 0) {
                            targetChecked.push(targetobj[j]);
                        }
                    }
                }
            }
            // Simple error check so that the combination generation hasn't
            // gone wrong
            if(allCombinations.length < 1 ){
              throw new Error("NO combinations to evaluate.");
            }
            // Keep track of which quantifier is all
            var isAllsrc : boolean = sourceQuant == "all";
            var isAlltrgt : boolean = targetQuant == "all";


            // The starting elements for finding all feasible combinations
            // of literals. The methods used for this require a valid
            // starting state to not generate all permutations
            var startingElems : Literal[][] = [];
            // Depending on which is all, find the starting elements
            for(var i = 0;i<allCombinations.length;i++){
              if(isAllsrc&&!isAlltrgt){
                if(allCombinations[i].args[0]==sourceobj[0]){
                  // if the source quantifier is all, add all combinations
                  // containing the first source element to the starting list.
                  startingElems.push([allCombinations[i]]);
                }
              }
              else if(!isAllsrc&&isAlltrgt){
                // if the target quantifier is all, add all combinations
                // containing the first target element to the starting list.
                if(allCombinations[i].args[1]==targetobj[0]){
                  startingElems.push([allCombinations[i]]);
                }
              }
              else {
                // if both are all or none is all, just add the first element
                // and move on
                startingElems.push([allCombinations[i]]);
                break;
              }
            }
            // Find all possible feasible combinations from all of the possible
            // combinations
            interpretation = findFeasibleCombinations(
              startingElems,
              allCombinations,
              isAllsrc,
              isAlltrgt,
              sourceChecked,
              targetChecked,
              0
            );
        }
        else if (cmd.command == "take") {
            // Since the command is take, there is no need for checking the target
            // object
            for (var i = 0; i < sourceobj.length; i++) {
                // Handle is the object is the floor
                if (!(sourceobj[i] == "floor")) {
                    interpretation.push(makeLiteral(true, "holding", [sourceobj[i]]));
                }
            }
        }
        else if (cmd.command == "find") {

            for (var i = 0; i < sourceobj.length; i++) {

                var spos: number[] = currentState.getValue(sourceobj[i]);
                var sObj: ObjectDefinition = state.objects[sourceobj[i]];

                // Create SPECIAL CASE LITERAL
                var special: string[] = [];
                special[0] = "print";

                var returnString: string = createFindString(sourceobj[i], spos, sObj, state);

                // Return the special case literal
                interpretation.push(makeLiteral(false, returnString, special));
            }

        }
        else if (cmd.command = "what") {

            var returnString: string = "";

            for (var i = 0; i < sourceobj.length; i++) {

                var spos: number[] = currentState.getValue(sourceobj[i]);
                var sObj: ObjectDefinition = state.objects[sourceobj[i]];

                returnString = createWhatString(sourceobj[i], spos, state, cmd);

                // Create SPECIAL CASE LITERAL
                var special: string[] = [];
                special[0] = "print";

                interpretation.push(makeLiteral(false, returnString, special));
            }
        }
        if (interpretation.length < 1) {
            throw new Error("No interpretation found");
        }

        return interpretation;
    }

	/**
     * Function to create a string of neighbours given an object in the world. This to locate
	 * an object when using the 'find' command (in relation to other objects)
     *
     * @param sourceobj - The label of the object searched for
     * @param spos - The position of the object
     * @param sObj - The ObjectDefinition of the searched object
     *
     * @param state - The WorldState
	 * @returns A natural language string describing the position of the object in relation to other objects
     */
    function createFindString(sourceobj: string, spos: number[], sObj: ObjectDefinition, state: WorldState): string {
        var retVal: string = "";


        // If the arm is holding the item
        if (sourceobj == state.holding) {

            return "The " + findAttributes(state.objects[sourceobj], state) + " is in the arm.";
        }

        // Check if the item is on the floor or not
        if (findBelow(spos, state) == null) {
            var retVal: string = "The " + findAttributes(state.objects[sourceobj], state) + " is on the floor,";
        } else {
            var retVal: string = "The " + findAttributes(state.objects[sourceobj], state) + " is";
        }

        // Count the number of neighbours
        var foundArray: boolean[] = [];
        foundArray[0] = findLeft(spos, state) != null;
        foundArray[1] = findRight(spos, state) != null;
        foundArray[2] = findBelow(spos, state) != null;
        foundArray[3] = findAbove(spos, state) != null;

        var totalFound: number = 0;
        for (var elem of foundArray) {
            if (elem) {
                totalFound++;
            }
        }


        // Variable to keep track of where we are
        var currentlyFound: number = 0;

        // Find the first object to the left
        if (findLeft(spos, state) != null) {
            currentlyFound++;
            var currentObject: ObjectDefinition = findLeft(spos, state);

            // If it is the last neighbour, add a sentence mark.
            if (currentlyFound == totalFound) {
                retVal = retVal + " to the right of the " + findAttributes(currentObject, state) + ".";
            }
            // If it is the second last, add an 'and'
            else if (currentlyFound == totalFound - 1) {
                retVal = retVal + " to the right of the " + findAttributes(currentObject, state) + " and";
            }
            // Else, add a comma
            else {
                retVal = retVal + " to the right of the " + findAttributes(currentObject, state) + ",";
            }
        }

        // Find the first object to the right
        if (findRight(spos, state) != null) {
            currentlyFound++;
            var currentObject: ObjectDefinition = findRight(spos, state);

            // If it is the last neighbour, add a sentence mark.
            if (currentlyFound == totalFound) {
                retVal = retVal + " to the left of the " + findAttributes(currentObject, state) + ".";
            }
            // If it is the second last, add an 'and'
            else if (currentlyFound == totalFound - 1) {
                retVal = retVal + " to the left of the " + findAttributes(currentObject, state) + " and";
            }
            // Else, add a comma
            else {
                retVal = retVal + " to the left of the " + findAttributes(currentObject, state) + ",";
            }
        }

        if (findAbove(spos, state) != null) {

            currentlyFound++;
            var currentObject: ObjectDefinition = findAbove(spos, state);

            // For all the following, check if the object is a box and
            // create the phrasing accordingly

            // If it is the last neighbour, add a sentence mark.
            if (currentlyFound == totalFound) {
                if (sObj.form == "box") {
                    retVal = retVal + " contains the " + findAttributes(currentObject, state) + ".";
                } else {
                    retVal = retVal + " is below the " + findAttributes(currentObject, state) + ".";
                }
            }
            // If it is the second last, add an 'and'
            else if (currentlyFound == totalFound - 1) {
                if (sObj.form == "box") {
                    retVal = retVal + " contains the " + findAttributes(currentObject, state) + " and";
                } else {
                    retVal = retVal + " is below the " + findAttributes(currentObject, state) + " and";
                }
            }
            // Else, add a comma
            else {
                if (sObj.form == "box") {
                    retVal = retVal + " contains the " + findAttributes(currentObject, state) + ",";
                } else {
                    retVal = retVal + " is below the " + findAttributes(currentObject, state) + ",";
                }
            }
        }

        if (findBelow(spos, state) != null) {
            currentlyFound++;
            var currentObject: ObjectDefinition = findBelow(spos, state);

            // For all the following, check if the neighbour is a box and
            // create the phrasing accordingly

            // If it is the last neighbour, add a sentence mark.
            if (currentlyFound == totalFound) {
                if (currentObject.form == "box") {
                    retVal = retVal + " is inside the " + findAttributes(currentObject, state) + ".";
                } else {
                    retVal = retVal + " is ontop of the " + findAttributes(currentObject, state) + ".";
                }
            }
            // If it is the second last, add an 'and'
            else if (currentlyFound == totalFound - 1) {
                if (currentObject.form == "box") {
                    retVal = retVal + " is inside the " + findAttributes(currentObject, state) + " and";
                } else {
                    retVal = retVal + " ontop of the " + findAttributes(currentObject, state) + " and";
                }
            }
            // Else, add a comma
            else {
                if (currentObject.form == "box") {
                    retVal = retVal + " is inside the " + findAttributes(currentObject, state) + ",";
                } else {
                    retVal = retVal + " is ontop of the " + findAttributes(currentObject, state) + ",";
                }
            }
        }

        return retVal;
    }


	/**
     * Function to create a string of the objects to the <relation> of an object. For example, returns a string
	 * containing the objects <to the left> of the 'red box'.
     *
     * @param sourceobj - The label of the object searched for
     * @param spos - The position of the object
     * @param sObj - The ObjectDefinition of the searched object
	 * @param cmdObj - the object specified by the command
	 * @param cmmd - the command
     * @param state - The WorldState
	 *
	 * @returns A natural language string telling what is <relation> of the object
     */
    function createWhatString(sourceobj: string, spos: number[], state: WorldState, cmd: Parser.Command): string {
        var returnString: string = "";

        // If the arm is holding the item
        if (sourceobj == state.holding) {
            return "The " + findAttributes(state.objects[sourceobj], state) + " is in the arm.";
        }

        // If the relation is "leftof"
        if (cmd.relation == "leftof") {
            var leftOfArray: ObjectDefinition[] = findAllLeft(spos, state);
            var multipleAnswers: boolean = false;

            if (leftOfArray.length == 0) {
                returnString = "There is nothing to the left of";
            } else {
                // For all results, add them to the string with corresponding dividers
                for (var i = 0; i < leftOfArray.length; i++) {
                    if (i == 0) {
                        returnString = returnString + "The " + findAttributes(leftOfArray[i], state);
                    } else if (i == leftOfArray.length - 1) {
                        multipleAnswers = true;
                        returnString = returnString + " and " + findAttributes(leftOfArray[i], state);
                    } else {
                        multipleAnswers = true;
                        returnString = returnString + ", the " + findAttributes(leftOfArray[i], state);
                    }
                }

                // If there are multiple answers we need to use plural, else singular
                if (multipleAnswers) {
                    returnString = returnString + " are to the left of";
                } else {
                    returnString = returnString + " is to the left of"
                }
            }
        }

        if (cmd.relation == "rightof") {
            var rightOfArray: ObjectDefinition[] = findAllRight(spos, state);
            var multipleAnswers: boolean = false;

            if (rightOfArray.length == 0) {
                returnString = "There is nothing to the right of";
            } else {
                // For all results, add them to the string with corresponding dividers
                for (var i = 0; i < rightOfArray.length; i++) {
                    if (i == 0) {
                        returnString = returnString + "The " + findAttributes(rightOfArray[i], state);
                    } else if (i == rightOfArray.length - 1) {
                        multipleAnswers = true;
                        returnString = returnString + " and " + findAttributes(rightOfArray[i], state);
                    } else {
                        multipleAnswers = true;
                        returnString = returnString + ", the " + findAttributes(rightOfArray[i], state);
                    }
                }

                // If there are multiple answers we need to use plural, else singular
                if (multipleAnswers) {
                    returnString = returnString + " are to the right of";
                } else {
                    returnString = returnString + " is to the right of"
                }
            }
        }

        if (cmd.relation == "above") {
            var aboveArray: ObjectDefinition[] = findAllAbove(spos, state);
            var multipleAnswers: boolean = false;

            if (aboveArray.length == 0) {
                returnString = "There is nothing above";
            } else {
                // For all results, add them to the string with corresponding dividers
                for (var i = 0; i < aboveArray.length; i++) {
                    if (i == 0) {
                        returnString = returnString + "The " + findAttributes(aboveArray[i], state);
                    } else if (i == aboveArray.length - 1) {
                        multipleAnswers = true;
                        returnString = returnString + " and " + findAttributes(aboveArray[i], state);
                    } else {
                        multipleAnswers = true;
                        returnString = returnString + ", the " + findAttributes(aboveArray[i], state);
                    }
                }

                // If there are multiple answers we need to use plural, else singular
                if (multipleAnswers) {
                    returnString = returnString + " are above";
                } else {
                    returnString = returnString + " is above"
                }
            }
        }

        if (cmd.relation == "under") {
            var belowArray: ObjectDefinition[] = findAllBelow(spos, state);
            var multipleAnswers: boolean = false;
            if (belowArray.length == 0) {
                returnString = "There is nothing below";
            } else {
                // For all results, add them to the string with corresponding dividers
                for (var i = 0; i < belowArray.length; i++) {
                    if (i == 0) {
                        returnString = returnString + "The " + findAttributes(belowArray[i], state);
                    } else if (i == belowArray.length - 1) {
                        multipleAnswers = true;
                        returnString = returnString + " and " + findAttributes(belowArray[i], state);
                    } else {
                        multipleAnswers = true;
                        returnString = returnString + ", the " + findAttributes(belowArray[i], state);
                    }
                }

                // If there are multiple answers we need to use plural, else singular
                if (multipleAnswers) {
                    returnString = returnString + " are below";
                } else {
                    returnString = returnString + " is below";
                }
            }
        }

        if (cmd.relation == "beside") {
            var rightObj: ObjectDefinition = findRight(spos, state);
            var leftObj: ObjectDefinition = findLeft(spos, state);

            // Depending on if there are objects to the right and left, add them to the string with the correct
            // gramatical structure
            if (rightObj != null && leftObj != null) {
                returnString = "The " + findAttributes(rightObj, state) + " and the " + findAttributes(leftObj, state) +
                    " are beside";
            } else if (rightObj != null) {
                returnString = "The " + findAttributes(rightObj, state) + " is beside";
            } else if (leftObj != null) {
                returnString = "The " + findAttributes(leftObj, state) + " is beside";
            } else {
                returnString = "There is nothing beside"
            }
        }

        if (cmd.relation == "ontop" || cmd.relation == "inside") {

            // Depending on wheather or not the command is inside or ontop, create the correct
            // return string
            var ontopObj: ObjectDefinition = findAbove(spos, state);
            if (ontopObj == null) {
                if (cmd.relation == "inside") {
                    returnString = "There is nothing inside";
                } else {
                    returnString = "There is nothing ontop of";
                }
            } else {
                if (cmd.relation == "inside") {
                    returnString = "The " + findAttributes(ontopObj, state) + " is inside";
                } else {
                    returnString = "The " + findAttributes(ontopObj, state) + " is ontop of";
                }
            }
        }

        returnString = returnString + " the " + findAttributes(state.objects[sourceobj], state) + ".";

        return returnString;
    }

    // Finds the first object to the left (on the ground level)
    function findLeft(sPos: number[], state: WorldState): ObjectDefinition {

        // Start on position - 1
        var sPosX: number = sPos[0] - 1;

        while (sPosX >= 0) {
            if (state.stacks[sPosX][0] == null) {
                sPosX--;
                continue;
            } else {
                return state.objects[state.stacks[sPosX][0]];
            }
        }
        return null;
    }

    // Finds all objects to the left (on the ground level)
    function findAllLeft(sPos: number[], state: WorldState): ObjectDefinition[] {
        var retVal: ObjectDefinition[] = [];
        // Start on position - 1
        var sPosX: number = sPos[0] - 1;

        while (sPosX >= 0) {
            if (state.stacks[sPosX][0] == null) {
                sPosX--;
                continue;
            } else {
                // Loop through the stack in Y
                var y: number = 0;
                while (y < state.stacks[sPosX].length) {
                    retVal.push(state.objects[state.stacks[sPosX][y]]);
                    y++;
                }

            }
            sPosX--;
        }
        return retVal;
    }

    // Finds the first object to the right (on the ground level)
    function findRight(sPos: number[], state: WorldState): ObjectDefinition {

        // Start on position + 1
        var sPosX: number = sPos[0] + 1;

        while (sPosX <= state.stacks.length - 1) {
            if (state.stacks[sPosX][0] == null) {
                sPosX++;
                continue;
            } else {
                return state.objects[state.stacks[sPosX][0]];
            }
        }
        return null;
    }

    // Finds all objects to the right of sPos (a position in the world)
    function findAllRight(sPos: number[], state: WorldState): ObjectDefinition[] {
        var retVal: ObjectDefinition[] = [];
        // Start on position + 1
        var sPosX: number = sPos[0] + 1;

        while (sPosX <= state.stacks.length - 1) {
            if (state.stacks[sPosX][0] == null) {
                sPosX++;
                continue;
            } else {
                // Loop through the stack in y-axis
                var y: number = 0;
                while (y < state.stacks[sPosX].length) {
                    retVal.push(state.objects[state.stacks[sPosX][y]]);
                    y++;
                }

            }
            sPosX++;
        }
        return retVal;
    }

    // Finds the first object above sPos (a position in the world)
    function findAbove(sPos: number[], state: WorldState): ObjectDefinition {

        // Start on position + 1
        var sPosY: number = sPos[1] + 1;

        // Same X position
        var sPosX: number = sPos[0];

        if (sPosY > state.stacks[sPosX].length - 1) {
            return null;
        }

        return state.objects[state.stacks[sPosX][sPosY]];
    }

    // Finds all objects above sPos (a position in the world)
    function findAllAbove(sPos: number[], state: WorldState): ObjectDefinition[] {
        var retVal: ObjectDefinition[] = [];

        // Start on position + 1
        var sPosY: number = sPos[1] + 1;

        // Same X position
        var sPosX: number = sPos[0];

        while (sPosY < state.stacks[sPosX].length) {
            retVal.push(state.objects[state.stacks[sPosX][sPosY]]);
            sPosY++;
        }

        return retVal;
    }

    // Finds the first object below sPos (a position in the world)
    function findBelow(sPos: number[], state: WorldState): ObjectDefinition {

        // Start on position - 1
        var sPosY: number = sPos[1] - 1;

        // Same X position
        var sPosX: number = sPos[0];

        if (sPosY < 0) {
            return null;
        }

        return state.objects[state.stacks[sPosX][sPosY]];
    }

    // Finds all objects below sPos (a position in the world)
    function findAllBelow(sPos: number[], state: WorldState): ObjectDefinition[] {
        var retVal: ObjectDefinition[] = [];

        // Start on position - 1
        var sPosY: number = sPos[1] - 1;

        // Same X position
        var sPosX: number = sPos[0];

        while (sPosY >= 0) {
            retVal.push(state.objects[state.stacks[sPosX][sPosY]]);
            sPosY--;
        }

        return retVal;
    }

	/**
     * findAttributes will return a string containing all the attributes
	 * needed in order to specify an object. If, for example, there are
	 * two yellow objects, "the yellow object" is not sufficient. Always
     * returns as few attributes as possible needed to describe the object.
	 *
     * @param obj - The object definition of the searched object
     * @param state - The WorldState in which we currently are
	 *
     * @returns a string describing the object
     */
    function findAttributes(obj: ObjectDefinition, state: WorldState): string {
        var stacks: string[][] = state.stacks;

        var nrForm: number = 0;

        var multipleSameSize: boolean = false;
        var multipleSameColor: boolean = false;

        var foundColors: string[] = [];
        var foundSizes: string[] = [];

        for (var i = 0; i < stacks.length; i++) {
            for (var j = 0; j < stacks[i].length; j++) {
                // If two objects are of the same form, increase the number of forms
                // And add the objects attributes to arrays
                if (state.objects[stacks[i][j]].form == obj.form) {
                    nrForm++;
                    foundColors.push(state.objects[stacks[i][j]].color);
                    foundSizes.push(state.objects[stacks[i][j]].size);
                }
            }
        }

        // Checks if there are multiple objects with same color as
        // the target object
        for (var firstColor of foundColors) {
            var i: number = 0;
            for (var secondColor of foundColors) {
                if (secondColor == obj.color) {
                    i++;
                }
                if (i > 1) {
                    multipleSameColor = true;
                }
            }
        }

        // Checks if there are multiple objects with same size as
        // the target object
        for (var firstSize of foundSizes) {
            var i: number = 0;
            for (var secondSize of foundSizes) {

                if (secondSize == obj.size) {
                    i++;
                }

                if (i > 1) {
                    multipleSameSize = true;
                }
            }
        }

        // If there are no object of this form
        if (nrForm < 1) {
            return "";
        }
        // If there are objects of the same form, check what attributes are needed
        // in order to describe a unique object
        else {
            if (nrForm == 1) {
                return obj.form;
            } else if (nrForm > 1 && !multipleSameColor) {
                return obj.color + " " + obj.form;
            } else if (nrForm > 1 && multipleSameColor && !multipleSameSize) {
                return obj.size + " " + obj.form;
            } else if (nrForm > 1 && multipleSameColor && multipleSameSize) {
                return obj.size + " " + obj.color + " " + obj.form;
            } else {
                return "";
            }
        }
    }

    /**
     * findEntities() recursively finds all of the objects within a given entity.
     * The indentifiers of the objects are returned in a string[].
     *
     * @param ent - The entity which is to be explored
     * @param state - The WorldState in which we currently are
     * @param objects - Indentifiers of all the objects currently placed in the
     * world
     * @param currentState - The Map of objects to its position
     */
    function findEntites(
        ent: Parser.Entity,
        state: WorldState,
        objects: string[],
        currentState: collections.Dictionary<string, number[]>)
        : string[] {

        var obj: Parser.Object = ent.object; // The object in the entity

        // Find all of the objects inside of the Entity
        var currobjs: string[] = findObjects(obj, state, objects, currentState);


        if (ent.quantifier == "the" && currobjs.length > 1) {
            // In case there are several ofjects when the entity specifies
            // one specific, throw error
            throw new Error("Too many indentifications of type THE");
        }

        if (obj.location == null) {
            // In the case of no location, return the found objects
            return currobjs;
        }

        // If there is a location, find all of the objects inside of the location
        // entity
        var relobjs: string[] =
            findEntites(obj.location.entity, state, objects, currentState);

        var result: string[];
        if (obj.location.entity.quantifier == "all") {
            result = currobjs;
            for (var i = 0; i < relobjs.length; i++) {
                result = filterRelation(obj.location.relation, result, [relobjs[i]], state, currentState);
            }
        } else {
            // Filter between the objects within the entity and at the location
            // based on the relation between
            result = filterRelation(obj.location.relation, currobjs, relobjs, state, currentState);
        }
        return result;
    }

    /**
     * findObjects() recursively finds all of the objects within a given object.
     * The indentifiers of the objects are returned in a string[].
     *
     * @param obj - The object which is to be explored
     * @param state - The WorldState in which we currently are
     * @param objects - Indentifiers of all the objects currently placed in the
     * world
     * @param currentState - The Map of objects to its position
     */
    export function findObjects(
        obj: Parser.Object,
        state: WorldState,
        objects: string[],
        currentState: collections.Dictionary<string, number[]>
    ): string[] {

        if (obj == null) {
            // Base case for finding the object
            return [];
        }
        var sourceobjs: string[] = [];

        // Handle if the object has properties or is linking to another object
        // with a relation
        if (obj.object == null && obj.location == null) {
            // If the object has properties
            // Loop through all objects in the world to find one matching the
            // object obj
            for (var i = 0; i < objects.length; i++) {
                var temp: ObjectDefinition;
                if (objects[i] == "floor") {
                    // Handle if an object is the world is the floor
                    // Create a "floor" object
                    temp = { form: "floor", size: null, color: null };
                }
                else {
                    temp = state.objects[objects[i]];
                }

                // keeping track of the objects being the same
                var isSame: boolean = true;
                if (obj.size != null) {
                    isSame = isSame && obj.size == temp.size;
                }
                if (obj.color != null) {
                    isSame = isSame && obj.color == temp.color;
                }
                if (obj.form == "anyform") {
                    isSame = isSame && true;
                }
                else {
                    isSame = isSame && obj.form == temp.form;
                }
                if (isSame) {
                    sourceobjs.push(objects[i]);
                }
            }
        }
        else {
            // In case the object is linking to another another object

            // find the objects in obj.object
            var tempsourceobjs: string[] =
                findObjects(obj.object, state, objects, currentState);

            // find the objects in the location entity
            var temptargetobjs: string[] =
                findEntites(obj.location.entity, state, objects, currentState);



            // Filter objects in obj.objects on the relation to the objects in
            // the location entity
            sourceobjs = filterRelation(obj.location.relation, tempsourceobjs,
                temptargetobjs, state, currentState);
        }
        return sourceobjs;
    }

    /**
     * filterRelation() compares a list of source objects to another list of objects
     * based on a relation between them. It does filtering on source objects
     * based on physical laws and positioning. The objects which passes are
     * returned as a list of indentifiers in the format of string[].
     *
     * @param filter - the relation which is applied in the filtering
     * @param currobjs - list of intentifiers of the source objects
     * @param relobjs - the list of objects which source is compared against
     * @param state - The WorldState in which we currently are
     * @param currentState - The Map of objects to its position
     */
    function filterRelation(
        filter: string,
        sourceobj: string[],
        targetobj: string[],
        state: WorldState,
        currentState: collections.Dictionary<string, number[]>): string[] {
        // The result
        var result: string[] = [];
        // Go through all of the possible combinations
        outer: for (var i = 0; i < sourceobj.length; i++) {
            for (var j = 0; j < targetobj.length; j++) {

                // Fetch the objects from the WorldState
                var theObjects: ObjectDefinition[] =
                    objectFactory(
                        sourceObject,
                        targetObject,
                        sourceobj[i],
                        targetobj[j],
                        state);

                // The objects to be checked
                var sourceObject: ObjectDefinition = theObjects[0];
                var targetObject: ObjectDefinition = theObjects[1];
                // The position of the objects
                var cpos: number[] = currentState.getValue(sourceobj[i]);
                var rpos: number[] = currentState.getValue(targetobj[j]);

                if (cpos[0] == -2) {
                    // If the source object is being held, it has no relation
                    // to any other object, so skip the check
                    continue;
                }
                if (!isPhysical(filter, sourceObject, targetObject)) {
                    // If the objects do not pass the physical laws, skip.
                    continue;
                }
                // Objects passed the physical laws, check if they are in a
                // feasible position
                else if (isFeasible(filter, cpos, rpos)) {
                    // Once found add the source object to the result list.
                    result.push(sourceobj[i]);
                    continue outer;
                }
            }
        }

        return result;
    }
    /**
     * isFeasible() checks the feasiblity of the position of two objects
     * based on the relation between them.
     *
     * @param relation - The relation between the two objects
     * @param spos - position of the first object.
     * @param tpos - position of the second object.
     */
    export function isFeasible(
        relation: string,
        spos: number[],
        tpos: number[]): boolean {

        // Extract the x and y coordinates of the two objects.
        var xs: number = spos[0];
        var ys: number = spos[1];
        var xt: number = tpos[0];
        var yt: number = tpos[1];

        // Handle if any of the objects are the floor. If anyone is, set
        // the x position of the floor to be equal to the x value of the
        // other object
        if (xs == -1) {
            xs = xt;
        }
        else if (xt == -1) {
            xt = xs;
        }

        //Handle left/right of if something is in hand
        if (xs == -2 || xt == -2) {
            return false;
        }


        // Handle different relations
        switch (relation) {
            case "leftof":
                if (xs < xt) {
                    return true;
                }
                return false;
            case "rightof":
                if (xs > xt) {
                    return true;
                }
                return false;
            case "inside":
                if (xs == xt &&
                    (ys - yt) == 1) {
                    return true;
                }
                return false;
            case "ontop":

                if (xs == xt &&
                    (ys - yt) == 1) {
                    return true;
                }
                return false;
            case "under":
                if (ys < yt &&
                    xs == xt) {
                    return true;
                }
                return false;
            case "beside":
                if ((xs - xt) == 1 ||
                    (xs - xt) == -1) {
                    return true;
                }
                return false;
            case "above":
                if (ys > yt &&
                    xs == xt) {
                    return true;
                }
                return false;
            default:
                return false;
        }
    }

	/**
     * Function to check whether or not a relation between two objects are physically possible.
	 * The world is ruled by physical laws that constrain the placement and movement of the objects.
	 *
     * @param relation the relation to be checked
     * @param sourceObj an ObjectDefinition of the source object (the object that should be moved)
	 * @param targetObj an ObjectDefinition of the target object (the object that the source should be placed upon)
     * @returns If the relation between the object is possible, return true,
				otherwise return false
     */
    export function isPhysical(relation: string, sourceObj: ObjectDefinition, targetObj: ObjectDefinition): boolean {

        // Switch statement to find out what rules apply
        switch (relation) {
            // If the relation is rightof, leftof or beside
            case "rightof": case "leftof": case "beside":
                // The floor can't be placed besides anything
                // and nothing can be placed beside the floor
                if (sourceObj.form == "floor" || targetObj.form == "floor") {
                    return false;
                }
                return true;
            // If the relation is inside
            case "inside":
                // Nothing can be placed inside anything other than a box, and the floor cannot be
                // placed inside anything
                // Nothing bigger than the box can be placed inside of it and
                // a plank, pyramid or box cannot be placed inside a box of the same size
                if (sourceObj.form == "floor" || targetObj.form != "box" ||
                    (targetObj.size == "small" && sourceObj.size == "large") ||
                    ((sourceObj.form == "plank" || sourceObj.form == "pyramid" || sourceObj.form == "box") &&
                        targetObj.size == sourceObj.size)) {
                    return false;
                }
                return true;
            // If the relation is ontop
            case "ontop":
                // Small objects cannot support big objects
                // Nothing can be placed ontop of a ball
                // and balls cannot be placed ontop of tables, bricks and planks
                // A small box cannot be placed ontop of a small brick
                // The floor cannot be placed ontop of anything
                if ((sourceObj.size == "large" && targetObj.size == "small") ||
                    targetObj.form == "ball" ||
                    (sourceObj.form == "ball" && (targetObj.form == "table" ||
                        targetObj.form == "brick" || targetObj.form == "plank" || targetObj.form == "pyramid")) ||
                    targetObj.form == "box" ||
                    (sourceObj.form == "box" && sourceObj.size == "small" &&
                        targetObj.form == "brick" && targetObj.size == "small") ||
                    sourceObj.form == "floor") {
                    return false;
                } else {
                    return true;
                }
            // If the relation is above
            case "above":
                // A large object can never be placed above a small object
                // The floor cannot be placed above anything
                if (sourceObj.size == "large" && targetObj.size == "small" ||
                    sourceObj.form == "floor") {
                    return false;
                }
                return true;
            // If the relation is below
            case "under":

                // Nothing can be placed below the floor or a ball
                // Nothing that is small can be below anything that is big
                // Do not allow stuff like "put the floor under the table"
                if (sourceObj.form == "floor" || targetObj.form == "floor" || sourceObj.form == "ball" ||
                    (sourceObj.size == "small" && targetObj.size == "large")) {
                    return false;
                }
                return true;
            default:
                return false;
        }
    }

    /**
    * Helper function that creates two ObjectDefinitions
    * Contains special cases if the objects are floors
    *
    * These objects are needed when checking all combinations of goals
    *
    * @param sourceObject first object to create
    * @param targetObject second object to create
    * @param source every object in the world
    * @param target every object in the world
    * @param state the world state. Needed to find the right object definitions
    * @returns If the object is a floor, the method returns a custom floor object, otherwise
    *			it returns the object that corresponds in the WorldState
    */
    function objectFactory(sourceObject: ObjectDefinition, targetObject: ObjectDefinition,
        source: string, target: string, state: WorldState): ObjectDefinition[] {
        if (source == "floor") {
            sourceObject = { form: "floor", size: null, color: null };
            targetObject = state.objects[target];
            return [sourceObject, targetObject];
        }
        else if (target == "floor") {
            sourceObject = state.objects[source];
            targetObject = { form: "floor", size: null, color: null };
            return [sourceObject, targetObject];
        }
        else {
            sourceObject = state.objects[source];
            targetObject = state.objects[target];
            return [sourceObject, targetObject];
        }
    }

	/**
     * Helper function to create literals
	 *
     * @param polarity the polarity
     * @param relation the relation
	 * @param args the arguments
     * @returns The literal
     */
    function makeLiteral(polarity: boolean, relation: string, args: string[]): Literal[] {
        return [{ polarity, relation, args }];
    }


    function compareStacks(stackA: string[][], stackB: string[][]) {
        var retVal: boolean = false;
        if (stackA.length != stackB.length) {
            return false;
        }
        for (var i = 0; i < stackA.length; i++) {
            if (stackA[i].length != stackB[i].length) {
                return false;
            }
            for (var j = 0; j < stackA[i].length; j++) {
                if (stackA[i][j] == stackB[i][j]) {
                    retVal = true;
                } else {
                    return false;
                }
            }
        }
        return retVal;
    }

    function equalNode(stateA: WorldState, stateB: WorldState): boolean {
        if (compareStacks(stateA.stacks, stateB.stacks) && stateA.holding == stateB.holding &&
            stateA.arm == stateB.arm) {
            return true;
        } else {
            return false;
        }
    }
    /**
     * findFeasibleCombinations() is a recursive function that steadily expands
     * disjunction of literals such that as many literals as possible are combined.
     * Depending on which has the "all" quantifier the function goes through all
     * of the IDs to check that all elements have been explored. When it has explored
     * all, it returns the result. It uses the helper function feasibleCombination().
     *
     * @param combinations - Disjunctions between conjunctions which is expanded.
     * @param allCombinations - All availible combinations which are to be explored
     * @param isSourceAll - boolean tracking if the source element have the "all" quantifier
     * @param isTargetAll - boolean tracking if the target element have the "all" quantifier
     * @param sourceIDs - a list of IDs for the source elements
     * @param targetIDs - a list of IDs for the target elements
     * @param index - tracking which source or target element we have explored so far
     */
    function findFeasibleCombinations(
      combinations : Literal[][],
      allCombinations : Literal[],
      isSourceAll : boolean,
      isTargetAll : boolean,
      sourceIDs :string[],
      targetIDs :string[],
      index : number
    ): Literal[][]{

      if(allCombinations.length < 1){
        throw new Error("No combinations to evaluate");
      }

      var returnVal : Literal[][] = []; // The value to be returned

      // if all or none of the quantifiers are all, do a normal evaluation in
      // the helper function feasibleCombination
      if(isSourceAll && isTargetAll || !isSourceAll && !isTargetAll){
        // Since it only needs to act on allCombinations, we don't care about the
        // first parameter
        return feasibleCombination([],allCombinations,isSourceAll,isTargetAll);
      }
      else if(isSourceAll && !isTargetAll){

        // if all of the sourceIDs have been explored, return the found combinations
        if(index > sourceIDs.length-1){
          return combinations;
        }
        // Find all of combinations where the source element is sourceIDs[index]
        var partCombinations : Literal[] = [];
        for(var i = 0;i<allCombinations.length;i++){
          if(sourceIDs[index]==allCombinations[i].args[0]){
            // When found, add them to the list
              partCombinations.push(allCombinations[i]);

          }
        }

        // For all of the input combinations, call the helper function feasibleCombination
        // which finds all of the possible combinations you can pair with the one you currently
        // have the ones in partCombinations
        var newCombinations : Literal[][] = [];
        for(var i = 0; i<combinations.length;i++){
          newCombinations= newCombinations.concat(
            feasibleCombination(combinations[i],partCombinations,isSourceAll,isTargetAll)
          );
        }
        // Once found all possible combinations, do a recursive call with all of
        // the new combinations
        returnVal = findFeasibleCombinations(
          newCombinations,
          allCombinations,
          isSourceAll,
          isTargetAll,
          sourceIDs,
          targetIDs,
          ++index //Make sure we explore the next source element
        );
      }

      else{
        // if all of the sourceIDs have been explored, return the found combinations
        if(index > sourceIDs.length-1){
          return combinations;
        }
        // Find all of combinations where the source element is sourceIDs[index]
        var partCombinations : Literal[] = [];
        for(var i = 0;i<allCombinations.length;i++){
          if(targetIDs[index]==allCombinations[i].args[1]){
            // When found, add them to the list
              partCombinations.push(allCombinations[i]);
          }
        }
        // For all of the input combinations, call the helper function feasibleCombination
        // which finds all of the possible combinations you can pair with the one you currently
        // have the ones in partCombinations
        var newCombinations : Literal[][] = [];
        for(var i = 0; i<combinations.length;i++){
          newCombinations= newCombinations.concat(
            feasibleCombination(combinations[i],partCombinations,isSourceAll,isTargetAll)
          );
        }
        // Once found all possible combinations, do a recursive call with all of
        // the new combinations
        returnVal = findFeasibleCombinations(
          newCombinations,
          allCombinations,
          isSourceAll,
          isTargetAll,
          sourceIDs,
          targetIDs,
          ++index
        );
      }

      return returnVal;
    }

    /**
     * feasibleCombination() takes a list of conjunctions(@param combination) and
     * a list of combinations(@allCombinations) and creates all of the possible
     * combinations which can be made with any one of the combinations. The
     * returned value is a list of disjunctions where each elements
     * is a conjunction containting @param combination and another element from
     * @param allCombinations.
     *
     * @param combination - The current conjunction which is the base to compare against
     * @param allCombinations - All availible combinations which are to be explored
     * @param isSourceAll - boolean tracking if the source element have the "all" quantifier
     * @param isTargetAll - boolean tracking if the target element have the "all" quantifier
     */
    function feasibleCombination(
      combination : Literal[],
      allCombinations : Literal[],
      isSourceAll : boolean,
      isTargetAll : boolean
    ): Literal[][] {
      // The return value
      var returnVal : Literal[][] = [];
      // List for keeping track of what elements are already in the combination
      var srcIndent : string[] = [];
      var trgtIndent : string[]= [];
      // Find all of these elements
      for(var i = 0; i<combination.length;i++){
        srcIndent.push(combination[i].args[0]);
        trgtIndent.push(combination[i].args[1]);
      }

      // See if any of the elements in allCombinations can be paired with the current
      // combination. If so, add it to the list of return values.
      for(var i = 0;i<allCombinations.length;i++){
        // Current literal being evaluated
        var comb : Literal = allCombinations[i];
        // Booleans for knowing if the source or target element is already mentioned
        // in the current combination
        var sourceElemExists: boolean = srcIndent.indexOf(comb.args[0]) >= 0;
        var targetElemExists: boolean = trgtIndent.indexOf(comb.args[1]) >= 0;
        // Special cases apply if the target is the floor. Find this out here.
        var isTargetFloor : boolean = comb.args[1]=="floor";

        // if both of the quantifiers were all simply make one big conjunction
        if(isSourceAll && isTargetAll){
          if(returnVal.length < 1){
            returnVal.push([comb]);
          }
          else{
            returnVal[0].push(comb);
          }
        }
        // if both of the quantifiers are not all, make one big disjunction
        else if(!isSourceAll && !isTargetAll){
          returnVal.push([comb]);
        }
        // It is now known that one of the quantifiers are all. Do special treatment
        // for if the relation is inside or ontop since only one element can be
        // inside or ontop at a given point.
        else if(combination[0].relation=="inside"||combination[0].relation=="ontop"){

          // if the elements are not already in the combination (with exeption
          // of the floor) add the conjunction to the return list.
          if(!sourceElemExists && (!targetElemExists||isTargetFloor)){
            returnVal.push(combination.concat([comb]));
          }
        }
        // Check if the source has the all quantifier
        else if (isSourceAll && !isTargetAll){

          // check that the element is not already explored in the all list
          if(!sourceElemExists){
            returnVal.push(combination.concat([comb]));
          }
        }
        // Check if the target has the all quantifier
        else if (!isSourceAll && isTargetAll){

          // check that the element is not already explored in the all list
          if(!targetElemExists){
            returnVal.push(combination.concat([comb]));
          }
        }
      }
      // if no combinations could be added to the current combination, just returnVal
      // the starting combination.
      if(returnVal.length < 1){
        returnVal = [combination];
      }
      return returnVal;
    }
}
var world : string = "medium";
var result: Parser.ParseResult[] = Parser.parse("put all balls inside a box");
console.log(Parser.stringify(result[0]));

//Interpreter.interpretCommand(result, ExampleWorlds["small"]);
var formula: Interpreter.InterpretationResult[] = Interpreter.interpret(result, ExampleWorlds[world]);
console.log(Interpreter.stringify(formula[0]));
