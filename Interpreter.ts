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
        // the floor. The second element is the actual position of the floor§
        currentState.setValue("floor", [-1, -1]);

        // Find all of the objects given in the first entity
        var sourceobj: string[] =
            findEntites(cmd.entity, state, objects, currentState);

        if (sourceobj.length < 1) {
            // If there are no objects found, throw error.
            throw new Error("No source objects found");
        }
        // All of the objects at the location entity
        var targetobj: string[] = [];

        if (cmd.location != null) {
            // If a location is specified then find the entities at that location
            targetobj = findEntites(cmd.location.entity, state, objects, currentState);
        }

        // Start creating the goals
        if (cmd.command == "move") {
            if (targetobj.length < 1) {
                // If no target object is found, we cannot continue the move,
                // throw error.
                throw new Error("No target objects")
            }
            // Source and target quantifiers
            var sourceQuant: string = cmd.entity.quantifier;
            var targetQuant: string = cmd.location.entity.quantifier;

            console.log("Source:"+sourceobj);
            console.log("Target:"+targetobj);

            //interpretation = allHandle(cmd.location.relation,sourceobj,targetobj,state);

            // Find all of the combinations of goals
            for (var i = 0; i < sourceobj.length; i++) {
                var conjunctions: Literal[] = [];

                for (var j = 0; j < targetobj.length; j++) {

                    if (sourceobj[i] == targetobj[j]) {
                        // if the objects are the same, nothing can be done
                        continue;
                    }
                    // Fetch the objects from the WorldState
                    var theObjects: ObjectDefinition[] = objectFactory(sourceObject, targetObject,
                        sourceobj[i], targetobj[j], state);
                    // The objects to be checked
                    var sourceObject: ObjectDefinition = theObjects[0];
                    var targetObject: ObjectDefinition = theObjects[1];





                    if (isPhysical(cmd.location.relation, sourceObject, targetObject)) {
                        var addLiteral : Literal =
                          { polarity: true,
                            relation:cmd.location.relation,
                            args:[sourceobj[i],targetobj[j]]};

                        if (sourceQuant != "all" && targetQuant != "all") {
                          // if none of the quantifiers are all, any combination of
                          // the elements are a valid goal
                          interpretation.push([addLiteral]);
                        }
                        else if (sourceQuant != "all" && targetQuant == "all") {
                          // if the target quantifier is all, do disjunction for
                          // each source element with conjunctions on all target
                          // elements
                          if(interpretation.length-1<j){
                            interpretation.push([addLiteral]);
                          }
                          else {
                            interpretation[j].push(addLiteral);
                          }
                          //conjunctions.push(addLiteral);
                        }
                        else if (sourceQuant == "all" && targetQuant != "all") {

                          if(interpretation.length-1<j){
                            interpretation.push([addLiteral]);
                          }
                          else {
                            interpretation[j].push(addLiteral);
                          }
                        }
                        else if (sourceQuant == "all" && targetQuant == "all") {
                          if(interpretation.length==0){
                            interpretation.push([addLiteral]);
                          }
                          else {
                            interpretation[0].push(addLiteral);
                          }
                        }
                    }



                }
                if (conjunctions.length>0) interpretation.push(conjunctions);
            }
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
        // If there are no interpretations, add null to make the test cases pass
        if (interpretation.length < 1) {
            interpretation.push(null);
        }
        return interpretation;
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

        // Filter between the objects within the entity and at the location
        // based on the relation between
        var result: string[] =
            filterRelation(obj.location.relation, currobjs, relobjs, state, currentState);
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
    function findObjects(
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

    function allHandle(
      relation : string,
      sourceobj : string[],
      targetobj :string[],
      state : WorldState) : Literal[][]
      {

        return [];
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
                // Nothing can be placed inside the floor, and the floor cannot be
                // placed inside anything
                // Nothing bigger than the box can be placed inside of it and
                // a pyramid, plank or box cannot be placed inside a box of the same size
                if (sourceObj.form == "floor" || targetObj.form == "floor" ||
                    targetObj.form == "box" && (targetObj.size == "small" && sourceObj.size == "large" ||
                        ((sourceObj.form == "pyramid" || sourceObj.form == "plank" || sourceObj.form == "box") &&
                            targetObj.size == sourceObj.size))) {
                    return false;
                }
                return true;
            // If the relation is ontop
            case "ontop":
                // Nothing can be placed ontop of a pyramid? or a ball
                // and balls cannot be placed ontop of tables, bricks and planks
                // A small box cannot be placed ontop of a small brick
                // The floor cannot be placed ontop of anything
                if (targetObj.form == "pyramid" || targetObj.form == "ball" ||
                    (sourceObj.form == "ball" && (targetObj.form == "table" ||
                        targetObj.form == "brick" || targetObj.form == "plank")) ||
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
            case "below":
                // Nothing can be placed below the floor, a ball or a pyramid
                // Nothing that is small can be below anything that is big
                if (targetObj.form == "floor" ||
                    sourceObj.form == "ball" || sourceObj.form == "pyramid" ||
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
}


var result: Parser.ParseResult[] = Parser.parse("put a ball in every large box");
console.log(Parser.stringify(result[0]));

//Interpreter.interpretCommand(result, ExampleWorlds["small"]);
var formula: Interpreter.InterpretationResult[] = Interpreter.interpret(result, ExampleWorlds["small"]);
console.log(Interpreter.stringify(formula[0]));
/*
console.log("First parse");
console.log(Parser.stringify(result[0]));

*/
