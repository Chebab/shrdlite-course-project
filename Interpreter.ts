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

<<<<<<< HEAD
=======

>>>>>>> master
    /**
    Top-level function for the Interpreter. It calls `interpretCommand` for each possible parse of the command. No need to change this one.
    * @param parses List of parses produced by the Parser.
    * @param currentState The current state of the world.
    * @returns Augments ParseResult with a list of interpretations. Each interpretation is represented by a list of Literals.
    */
<<<<<<< HEAD
    var relationStr: string[] = ["leftof", "rightof", "inside", "ontop", "under", "beside", "above"];
    var quantm: string[] = ["any", "all", "a"];
    var quants: string[] = ["the"];
    export function interpret(parses: Parser.ParseResult[], currentState: WorldState): InterpretationResult[] {
        var errors: Error[] = [];
        var interpretations: InterpretationResult[] = [];
=======

    export function interpret(parses : Parser.ParseResult[], currentState : WorldState) : InterpretationResult[] {
        var errors : Error[] = [];
        var interpretations : InterpretationResult[] = [];
>>>>>>> master
        parses.forEach((parseresult) => {
            try {
                var result: InterpretationResult = <InterpretationResult>parseresult;
                result.interpretation = interpretCommand(result.parse, currentState);
                interpretations.push(result);
                console.log(Interpreter.stringify(result));
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
<<<<<<< HEAD
        polarity: boolean;
        /** The name of the relation in question. */
        relation: string;
        /** The arguments to the relation. Usually these will be either objects
         * or special strings such as "floor" or "floor-N" (where N is a column) */
        args: string[];
=======
        polarity : boolean;
        /** The name of the relation in question. */
        relation : string;
        /** The arguments to the relation. Usually these will be either objects
         * or special strings such as "floor" or "floor-N" (where N is a column) */

        args : string[];
>>>>>>> master
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
<<<<<<< HEAD
        var objects: string[] = Array.prototype.concat.apply([], state.stacks);
        var a: string = objects[Math.floor(Math.random() * objects.length)];
        var b: string = objects[Math.floor(Math.random() * objects.length)];
        var interpretation: DNFFormula =[[]]/* [[
            { polarity: true, relation: "ontop", args: [a, "floor"] },
            { polarity: true, relation: "holding", args: [b] }
        ]];*/
        var currentState : collections.Dictionary<string,number[]>
                = new collections.Dictionary<string, number[]>();
        for (var i = 0; i < state.stacks.length; i++) {
            for (var j = 0; j < state.stacks[i].length; j++) {
                currentState.setValue(state.stacks[i][j], [i, j]);
            }
        }
        if(state.holding != null){
          console.log("adding holding");
          currentState.setValue(state.holding,[-1,-1]);
          objects.push(state.holding);
        }
        var sourceobj : string[] =
          findEntites(cmd.entity,state,objects,currentState);

        if(sourceobj.length<1)
        {
          return [[]];
        }
        else if(sourceobj[0].indexOf("__Error__")>=0)
        {
          var error = sourceobj[0].split("#");
          var errorCode = error[1];
          //do something with the error code
          return [[]];
        }

        var targetobj : string[] = [];
        console.log(cmd.location.relation);
        if(cmd.location!=null)
        {
          findEntites(cmd.location.entity,state,objects,currentState);
        }
        // Find object/objects in command that exists in the world
        // if found >=1 -> continue
        // if found 0 -> stop

        if (cmd.command == "move"){
            // Find the current value

            console.log("Length of target is "+targetobj.length);
            if(targetobj.length<1)
            {
              return [[]];
            }
            else if(targetobj[0].indexOf("__Error__")>=0)
            {
              var error = sourceobj[0].split("#");
              var errorCode = error[1];
              //do something with the error code
              return [[]];
            }
            for(var i = 0;i<sourceobj.length;i++)
            {
              for(var j = 0;j<targetobj.length;j++)
              {
                if(sourceobj[i]==targetobj[j]){
                  continue;
                }
                switch(cmd.location.relation){
                  case "leftof":
                  case "rightof":
                  case "inside":
                  case "ontop":
                  case "under":
                  case "beside":
                  case "above":
                    interpretation.push([
                      {
                        polarity: true,
                        relation: cmd.location.relation,
                        args:[sourceobj[i],targetobj[j]]
                      }
                    ]);
                  default:
                    break;
                }
              }
            }
        }
        else if (cmd.command=="take"){

        }


=======
        var objects : string[] = Array.prototype.concat.apply([], state.stacks);
        var a : string = objects[Math.floor(Math.random() * objects.length)];
        var b : string = objects[Math.floor(Math.random() * objects.length)];
        var interpretation : DNFFormula = [[
            {polarity: true, relation: "ontop", args: [a, "floor"]},
            {polarity: true, relation: "holding", args: [b]}
        ]];
>>>>>>> master

        return interpretation;
    }
    function findEntites(
        ent: Parser.Entity,
        state: WorldState,
        objects: string[],
        currentState: collections.Dictionary<string, number[]>)
        : string[] {


        var obj: Parser.Object = ent.object
        // find all of the current object
        var currobjs: string[] = [];
        for (var i = 0; i < objects.length; i++) {
            var temp: ObjectDefinition = state.objects[objects[i]];
            var isSame: boolean = true;
            if (obj.size != null) {
                isSame = isSame && obj.size == temp.size;
            }
            if (obj.color != null) {
                isSame = isSame && obj.color == temp.color;
            }
            if (obj.form != null) {
                isSame = isSame && obj.form == temp.form;
            }
            if (isSame) {
                currobjs.push(objects[i]);
            }
        }
        if (obj.location == null) {
            // Handle the and any
            // if the and currobjs>1 return Error
            if (ent.quantifier == "the" && currobjs.length > 1) {
                return ["__Error__#0"]
            }
            return currobjs;
        }
        console.log("about to find relations");
        var relobjs: string[] =
            findEntites(obj.location.entity, state, objects, currentState);
            console.log("Found relations");
        if (relobjs.length < 1) {
            return ["__Error__#1"];
        }
        else if (relobjs[0].indexOf("__Error__") >= 0) {
            return relobjs;
        }
        var result : string[] =
          filterRelation(obj.location.relation,currobjs,relobjs,state,currentState);
        if (ent.quantifier == "the" && currobjs.length > 1) {
            return ["__Error__#0"]
        }
        return result;
    }

    function filterRelation(
      filter : string,
      currobjs : string[],
      relobjs : string[],
      state : WorldState,
      currentState : collections.Dictionary<string,number[]>): string[]
      {
        var result : string[] = [];

        for (var i = 0; i < currobjs.length; i++) {
            for (var j = 0; j < relobjs.length; j++) {
              var cpos : number[] = currentState.getValue(currobjs[i]);
              var rpos : number[] = currentState.getValue(relobjs[j]);
              if(cpos[0]<0||rpos[0]<0){
                continue;
              }
                switch (filter) {
                    case "leftof":
                        if(cpos[0]<rpos[0]){
                          result.push(currobjs[i]);
                        }
                        continue;
                    case "rightof":
                        if(cpos[0]>rpos[0]){
                          result.push(currobjs[i]);
                        }
                        continue;
                    case "inside":
                        if(cpos[0]==rpos[0] &&
                            cpos[1]-rpos[1]==1 &&
                            state.objects[relobjs[j]].form=="box"){
                          result.push(currobjs[i]);
                        }
                        continue;
                    case "ontop":
                        if(cpos[0]==rpos[0] &&
                            cpos[1]-rpos[1]==1){
                          result.push(currobjs[i]);
                        }
                        continue;
                    case "under":
                        if(cpos[1]<rpos[1] &&
                            cpos[0]==rpos[0]){
                          result.push(currobjs[i]);
                        }
                        continue;
                    case "beside":
                        if(cpos[0]-rpos[0]==1||
                            cpos[0]-rpos[0]==-1){
                          result.push(currobjs[i]);
                        }
                        continue;
                    case "above":
                        if(cpos[1]>rpos[1]&&
                            cpos[0]==rpos[0]){
                          result.push(currobjs[i]);
                        }
                        continue;
                    default:
                        return [];
                }
            }
        }
        return result;
      }
}
var result: Parser.ParseResult[] = Parser.parse("put the large green brick on the large red box");
//Interpreter.interpretCommand(result, ExampleWorlds["small"]);
console.log(Parser.stringify(result[0]));
var formula : Interpreter.InterpretationResult[] = Interpreter.interpret(result, ExampleWorlds["small"]);



//console.log(Interpreter.stringify(formula[0]));
