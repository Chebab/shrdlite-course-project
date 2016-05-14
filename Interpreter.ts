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
                ////console.log(Parser.stringify(parseresult));
                result.interpretation = interpretCommand(result.parse, currentState);
                interpretations.push(result);
                ////console.log(Interpreter.stringify(result));
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
        // This returns a dummy interpretation involving two random objects in the world

        var objects: string[] = Array.prototype.concat.apply([], state.stacks);
        var a: string = objects[Math.floor(Math.random() * objects.length)];
        var b: string = objects[Math.floor(Math.random() * objects.length)];
        var interpretation: DNFFormula = [];
        var currentState: collections.Dictionary<string, number[]>
            = new collections.Dictionary<string, number[]>();
        for (var i = 0; i < state.stacks.length; i++) {
            for (var j = 0; j < state.stacks[i].length; j++) {
                currentState.setValue(state.stacks[i][j], [i, j]);
            }
        }
        if (state.holding != null) {

            currentState.setValue(state.holding, [-2, -2]);
            objects.push(state.holding);
        }
        // Add the floor
        currentState.setValue("floor", [-1, -1]);
        objects.push("floor");


        var sourceobj: string[] =
            findEntites(cmd.entity, state, objects, currentState);

        if (sourceobj.length < 1) {
            ////console.log("no source objects");
            //console.log("ERROR line 153")
            throw new Error("No source objects found");
        }
        //console.log("SRC_OBJs:"+sourceobj.length);
        var targetobj: string[] = [];

        if (cmd.location != null) {

            targetobj = findEntites(cmd.location.entity, state, objects, currentState);
            //console.log("TARGET OBJECTS: " + targetobj);
        }
        // Find object/objects in command that exists in the world
        // if found >=1 -> continue
        // if found 0 -> stop

        if (cmd.command == "move") {
            // Find the current value


            if (targetobj.length < 1) {
                ////console.log("no target objects");
                //console.log("ERROR line 174")
                throw new Error("No target objects")

            }
            ////console.log("amount of sobj=" + sourceobj.length + " and amount of tobj=" + sourceobj.length)
            for (var i = 0; i < sourceobj.length; i++) {
                for (var j = 0; j < targetobj.length; j++) {

                    if (sourceobj[i] == targetobj[j]) {
                        continue;
                    }
                    var sourceObject: ObjectDefinition;
                    var targetObject: ObjectDefinition;
                    if (sourceobj[i] == "floor") {
                        sourceObject = { form: "floor", size: null, color: null };
                        targetObject = state.objects[targetobj[j]];
                    }
                    else if (targetobj[j] == "floor") {
                        sourceObject = state.objects[sourceobj[i]];
                        targetObject = { form: "floor", size: null, color: null };
                    }
                    else {
                        sourceObject = state.objects[sourceobj[i]];
                        targetObject = state.objects[targetobj[j]];
                    }
                    if (isPhysical(cmd.location.relation, sourceObject, targetObject)) {
                        var pushed: Literal[] = [
                            {
                                polarity: true,
                                relation: cmd.location.relation,
                                args: [sourceobj[i], targetobj[j]]
                            }
                        ];
                        interpretation.push(pushed);
                    }
                }
            }
        }
        else if (cmd.command == "take") {
            for (var i = 0; i < sourceobj.length; i++) {
                if (!(sourceobj[i] == "floor")) {
                    interpretation.push([
                        {
                            polarity: true,
                            relation: "holding",
                            args: [sourceobj[i]]
                        }
                    ]);
                }
            }
        }
        //////console.log("the result is:" + interpretation + " the amount of results is " + interpretation.length);
        if (interpretation.length < 1) {
            interpretation.push(null);
        }
        //console.log("FINISHED  SRC_OBJs:"+sourceobj.length+" TAR_OBJs:"+targetobj.length);
        return interpretation;
    }
    function findEntites(
        ent: Parser.Entity,
        state: WorldState,
        objects: string[],
        currentState: collections.Dictionary<string, number[]>)
        : string[] {
        //console.log("findEntites() started");
        var obj: Parser.Object = ent.object;
        var currobjs: string[] = findObjects(obj, state, objects, currentState);
        //console.log("Found SRCOBJs:"+currobjs);
        if (ent.quantifier == "the" && currobjs.length > 1) {
            //console.log("ERROR line 247")
            throw new Error("Too many indentifications of type THE");
        }
        //////console.log("RESULT_Source: " + currobjs);

        if (obj.location == null) {
            return currobjs;
        }
        //console.log("Finding target objects")
        var relobjs: string[] =
            findEntites(obj.location.entity, state, objects, currentState);
        //console.log("found target OBJs:"+relobjs)
        var result: string[] =
            filterRelation(obj.location.relation, currobjs, relobjs, state, currentState);
        if (ent.quantifier == "the" && currobjs.length > 1) {
            //console.log("ERROR line 262")
            throw new Error("Too many indentifications of type THE");
        }

        return result;
    }
    function findObjects(
        obj: Parser.Object,
        state: WorldState,
        objects: string[],
        currentState: collections.Dictionary<string, number[]>
    ): string[] {

        var sourceobjs: string[] = [];
        if (obj == null) {
            return [];
        }
        // find all of the current object
        else if (obj.object == null && obj.location == null) {
            //////console.log("OBJ: " + obj.form + " " + obj.color);
            for (var i = 0; i < objects.length; i++) {

                var temp: ObjectDefinition;

                if (objects[i] == "floor") {

                    temp = { form: "floor", size: null, color: null };
                }
                else {
                    temp = state.objects[objects[i]];
                }
                //////console.log("TEMP: " + temp.form + " " + temp.color);

                var isSame: boolean = true;
                if (obj.size != null) {
                    isSame = isSame && obj.size == temp.size;
                }
                if (obj.color != null) {
                    isSame = isSame && obj.color == temp.color;
                }
                if (obj.form == "anyform") {
                    //////console.log("ANYFORM COLOR: " + temp.color);
                    isSame = isSame && true;
                    //////console.log(isSame);
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
            var tempsourceobjs: string[] =
                findObjects(obj.object, state, objects, currentState);
            //console.log("tempsourceobjs:"+tempsourceobjs)
            var temptargetobjs: string[] =
                findEntites(obj.location.entity, state, objects, currentState);
            //console.log("temptargetobjs:"+temptargetobjs)
            sourceobjs = filterRelation(obj.location.relation, tempsourceobjs,
                temptargetobjs, state, currentState);
        }
        return sourceobjs;
    }

    function filterRelation(
        filter: string,
        currobjs: string[],
        relobjs: string[],
        state: WorldState,
        currentState: collections.Dictionary<string, number[]>): string[] {
        var result: string[] = [];
        //////console.log("searchword is " + filter + " and nrcur=" + currobjs.length + ",nrrel=" + relobjs.length);
        for (var i = 0; i < currobjs.length; i++) {
            for (var j = 0; j < relobjs.length; j++) {
                var sourceObject: ObjectDefinition;
                var targetObject: ObjectDefinition;
                if (currobjs[i] == "floor") {
                    sourceObject = { form: "floor", size: null, color: null };
                    targetObject = state.objects[relobjs[j]];
                }
                else if (relobjs[j] == "floor") {
                    sourceObject = state.objects[currobjs[i]];
                    targetObject = { form: "floor", size: null, color: null };
                }
                else {
                    sourceObject = state.objects[currobjs[i]];
                    targetObject = state.objects[relobjs[j]];
                }
                var cpos: number[] = currentState.getValue(currobjs[i]);
                var rpos: number[] = currentState.getValue(relobjs[j]);
                if (cpos[0] == -2) {
                    //console.log("continue")
                    continue;
                }
                if (!isPhysical(filter, sourceObject, targetObject)) {

                    continue;
                }
                else if (isFeasible(filter, cpos, rpos, state.stacks.length)) {
                    //console.log("isFeasible with currobj:"+currobjs[i]);
                    result.push(currobjs[i]);
                    continue;
                }
            }
        }

        return result;
    }

    function isFeasible(
        relation: string,
        cpos: number[],
        rpos: number[],
        worldSize: number): boolean {

        var xs: number = cpos[0];
        var ys: number = cpos[1];
        var xt: number = rpos[0];
        var yt: number = rpos[1];

        //console.log("Entered isFeasible with spos:"+[xs,ys]+" and tpos:"+[xt,yt]);
        if (xs == -1) {
            xs = xt;
        }
        else if (xt == -1) {
            xt = xs;
        }
        //console.log("Changed pos: spos:"+[xs,ys]+" and tpos:"+[xt,yt]);
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
                    ////console.log("object is beside");
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

    function isPhysical(relation: string, sourceObj: ObjectDefinition, targetObj: ObjectDefinition): boolean {
        //console.log("Entered isPhysical with relation "+relation +" Source is "+sourceObj.form +", Target is "+targetObj.form);
        ////console.log("Source is "+sourceObj.form +", Target is "+targetObj.form);
        switch (relation) {
            case "rightof": case "leftof": case "beside":
                if (sourceObj.form == "floor" || targetObj.form == "floor") {
                    return false;
                }
                // Maybe check if there actually is a "rightof" the targetObject. Or maybe not here?
                //////console.log("checking beside constraints")
                return true;
            case "inside":
                if (sourceObj.form == "floor" || targetObj.form == "floor" ||
                    targetObj.form == "box" && (targetObj.size == "small" && sourceObj.size == "large" ||
                        ((sourceObj.form == "pyramid" || sourceObj.form == "plank" || sourceObj.form == "box") &&
                            targetObj.size == sourceObj.size))) {
                    return false;
                }
                return true;

            case "ontop":
                // Maybe add ball ontop of table and brick?
                if (targetObj.form == "pyramid" ||
                    (sourceObj.form == "ball" && (targetObj.form == "table" ||
                        targetObj.form == "brick" || targetObj.form == "plank")) ||
                    targetObj.form == "ball" ||
                    targetObj.form == "box" ||
                    (sourceObj.form == "box" && sourceObj.size == "small" &&
                        targetObj.form == "brick" && targetObj.size == "small") ||
                    sourceObj.form == "floor") {
                    return false;
                } else {
                    return true;
                }
            case "above":
                if (sourceObj.size == "large" && targetObj.size == "small" ||
                    sourceObj.form == "floor") {
                    return false;
                }
                // How handle above?
                return true;
            case "below":
                if (targetObj.form == "floor" ||
                    sourceObj.form == "ball" || sourceObj.form == "pyramid" ||
                    (sourceObj.size == "small" && targetObj.size == "large")) {
                    return false;
                }
                // How handle below?
                return true;
            default:
                return false;
        }
    }


}

var result: Parser.ParseResult[] = Parser.parse("put the large green brick on a table");
//Interpreter.interpretCommand(result, ExampleWorlds["small"]);
var formula: Interpreter.InterpretationResult[] = Interpreter.interpret(result, ExampleWorlds["small"]);
console.log("First parse");
console.log(Parser.stringify(result[0]));
console.log(Interpreter.stringify(formula[0]));
/*
//console.log("First parse");
//console.log(Parser.stringify(result[0]));
//console.log(Interpreter.stringify(formula[0]));
//console.log("Second parse:")
//console.log(Parser.stringify(result[1]));
//console.log(Interpreter.stringify(formula[1]));
*/
