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

        polarity : boolean;
        /** The name of the relation in question. */
        relation : string;
        /** The arguments to the relation. Usually these will be either objects
         * or special strings such as "floor" or "floor-N" (where N is a column) */

        args : string[];

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
        var interpretation: DNFFormula = []/* [[
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

          currentState.setValue(state.holding,[-1,-1]);
          objects.push(state.holding);
        }
        var sourceobj : string[] =
          findEntites(cmd.entity,state,objects,currentState);

        if(sourceobj.length<1)
        {
          console.log("no source objects");
          return [[]];
        }
        else if(sourceobj[0].indexOf("__Error__")>=0)
        {
          var error = sourceobj[0].split("#");
          var errorCode = error[1];
          console.log("cannot find a source object, error code:"+errorCode);
          //do something with the error code
          return [[]];
        }

        var targetobj : string[] = [];

        if(cmd.location!=null)
        {
          console.log("trying to find targetobj");
          targetobj = findEntites(cmd.location.entity,state,objects,currentState);
		  console.log("TARGET OBJECTS: " + targetobj);
        }
        // Find object/objects in command that exists in the world
        // if found >=1 -> continue
        // if found 0 -> stop

        if (cmd.command == "move"){
            // Find the current value


            if(targetobj.length<1)
            {
              console.log("no target objects");
              return [[]];
            }
            else if(targetobj[0].indexOf("__Error__")>=0)
            {
              var error = sourceobj[0].split("#");
              var errorCode = error[1];
              console.log("cannot find a target object, error code:"+errorCode);
              //do something with the error code
              return [[]];
            }
            console.log("amount of sobj="+sourceobj.length+" and amount of tobj="+sourceobj.length)
            for(var i = 0;i<sourceobj.length;i++)
            {
              for(var j = 0;j<targetobj.length;j++)
              {

                if(sourceobj[i]==targetobj[j]){
                  continue;
                }
                var sourceObject : ObjectDefinition = state.objects[sourceobj[i]];
                var targetObject : ObjectDefinition = state.objects[targetobj[j]];
                var cpos : number[] = currentState.getValue(sourceobj[i]);
                var rpos : number[] = currentState.getValue(targetobj[j]);
                if(isPhysical(sourceObject,targetObject,cmd.location.relation)){
                  interpretation.push([
                    {
                      polarity: true,
                      relation: cmd.location.relation,
                      args:[sourceobj[i],targetobj[j]]
                    }
                  ]);
                }
              }
            }
        }
        else if (cmd.command=="take"){

        }

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
			console.log("RESULT: " + currobjs);
            return currobjs;
        }

        var relobjs: string[] =
            findEntites(obj.location.entity, state, objects, currentState);

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
        console.log("searchword is "+filter);
        for (var i = 0; i < currobjs.length; i++) {
            for (var j = 0; j < relobjs.length; j++) {
              var sourceObject : ObjectDefinition = state.objects[currobjs[i]];
              var targetObject : ObjectDefinition = state.objects[relobjs[j]];
              var cpos : number[] = currentState.getValue(currobjs[i]);
              var rpos : number[] = currentState.getValue(relobjs[j]);
              if(cpos[0]<0||rpos[0]<0){
                continue;
              }
              if(isFeasible(currobjs[i],relobjs[j],filter,sourceObject,targetObject,cpos,rpos)){
                result.push(currobjs[i]);
                continue;
              }
            }
        }
        return result;
      }

      function isFeasible(
        sourceId : string,
        targetId : string,
        relation : string,
        sourceObj : ObjectDefinition,
        targetObj : ObjectDefinition,
        spos : number[],
        tpos : number[]) : boolean
        {
          switch (relation) {
              case "leftof":
                  if(spos[0]<tpos[0]){
                    return true;
                  }
                  return false;
              case "rightof":
                  if(spos[0]>tpos[0]){
                    return true;
                  }
                  return false;
              case "inside":
                  if(spos[0]==tpos[0] &&
                      spos[1]-tpos[1]==1 &&
                      targetObj.form=="box"&&
                      !(sourceObj.size=="large" &&
                      targetObj.size=="small")){
                    console.log(sourceObj.size + " " + sourceObj.form);
                    console.log(targetObj.size + " " + targetObj.form);
                    return true;
                  }
                  return false;
              case "ontop":
                  if(spos[0]==tpos[0] &&
                      spos[1]-tpos[1]==1){
                    return true;
                  }
                  return false;
              case "under":
                  if(spos[1]<tpos[1] &&
                      spos[0]==tpos[0]){
                    return true;
                  }
                  return false;
              case "beside":
                  if(spos[0]-tpos[0]==1||
                      spos[0]-tpos[0]==-1){
                    return true;
                  }
                  return false;
              case "above":
                  if(spos[1]>tpos[1]&&
                      spos[0]==tpos[0]){
                    return true;
                  }
                  return false;
              default:
                  return false;
          }
        }
		
	function isPhysical(sourceObj : ObjectDefinition, targetObj : ObjectDefinition, relation : string) : boolean {
		switch(relation){
			case "rightof", "leftof", "beside":
				// Maybe check if there actually is a "rightof" the targetObject. Or maybe not here?
				return true;
			case "inside":
				if(targetObj.form=="box" && !(sourceObj.size=="large" && targetObj.size=="small")){
					return true;
				} else {
					return false;
				}
			case "ontop":
				// Maybe add ball ontop of table and brick?
				if(targetObj.form == "pyramid" || 
				  (sourceObj.form == "ball" && (targetObj.form == "table" || targetObj.form == "brick"))){
					return false;
				} else {
					return true;
				}
			case "above":
				// How handle above?
				return true;
			case "below":
				// How handle below?
				return true;
			default:
				return false;
		  }
	}
}
var result: Parser.ParseResult[] = Parser.parse("put a ball in a box");
//Interpreter.interpretCommand(result, ExampleWorlds["small"]);
console.log(Parser.stringify(result[0]));
var formula : Interpreter.InterpretationResult[] = Interpreter.interpret(result, ExampleWorlds["small"]);



//console.log(Interpreter.stringify(formula[0]));
