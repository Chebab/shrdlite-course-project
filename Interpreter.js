var Interpreter;
(function (Interpreter) {
    var relationStr = ["leftof", "rightof", "inside", "ontop", "under", "beside", "above"];
    var quantm = ["any", "all", "a"];
    var quants = ["the"];
    function interpret(parses, currentState) {
        var errors = [];
        var interpretations = [];
        parses.forEach(function (parseresult) {
            try {
                var result = parseresult;
                result.interpretation = interpretCommand(result.parse, currentState);
                interpretations.push(result);
                console.log(Interpreter.stringify(result));
            }
            catch (err) {
                errors.push(err);
            }
        });
        if (interpretations.length) {
            return interpretations;
        }
        else {
            throw errors[0];
        }
    }
    Interpreter.interpret = interpret;
    function stringify(result) {
        return result.interpretation.map(function (literals) {
            return literals.map(function (lit) { return stringifyLiteral(lit); }).join(" & ");
        }).join(" | ");
    }
    Interpreter.stringify = stringify;
    function stringifyLiteral(lit) {
        return (lit.polarity ? "" : "-") + lit.relation + "(" + lit.args.join(",") + ")";
    }
    Interpreter.stringifyLiteral = stringifyLiteral;
    function interpretCommand(cmd, state) {
        var objects = Array.prototype.concat.apply([], state.stacks);
        var a = objects[Math.floor(Math.random() * objects.length)];
        var b = objects[Math.floor(Math.random() * objects.length)];
        var interpretation = [[]];
        var currentState = new collections.Dictionary();
        for (var i = 0; i < state.stacks.length; i++) {
            for (var j = 0; j < state.stacks[i].length; j++) {
                currentState.setValue(state.stacks[i][j], [i, j]);
            }
        }
        if (state.holding != null) {
            console.log("adding holding");
            currentState.setValue(state.holding, [-1, -1]);
            objects.push(state.holding);
        }
        var sourceobj = findEntites(cmd.entity, state, objects, currentState);
        if (sourceobj.length < 1) {
            return [[]];
        }
        else if (sourceobj[0].indexOf("__Error__") >= 0) {
            var error = sourceobj[0].split("#");
            var errorCode = error[1];
            return [[]];
        }
        var targetobj = [];
        console.log(cmd.location.relation);
        if (cmd.location != null) {
            findEntites(cmd.location.entity, state, objects, currentState);
        }
        if (cmd.command == "move") {
            console.log("Length of target is " + targetobj.length);
            if (targetobj.length < 1) {
                return [[]];
            }
            else if (targetobj[0].indexOf("__Error__") >= 0) {
                var error = sourceobj[0].split("#");
                var errorCode = error[1];
                return [[]];
            }
            for (var i = 0; i < sourceobj.length; i++) {
                for (var j = 0; j < targetobj.length; j++) {
                    if (sourceobj[i] == targetobj[j]) {
                        continue;
                    }
                    switch (cmd.location.relation) {
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
                                    args: [sourceobj[i], targetobj[j]]
                                }
                            ]);
                        default:
                            break;
                    }
                }
            }
        }
        else if (cmd.command == "take") {
        }
        return interpretation;
    }
    function findEntites(ent, state, objects, currentState) {
        var obj = ent.object;
        var currobjs = [];
        for (var i = 0; i < objects.length; i++) {
            var temp = state.objects[objects[i]];
            var isSame = true;
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
            if (ent.quantifier == "the" && currobjs.length > 1) {
                return ["__Error__#0"];
            }
            return currobjs;
        }
        console.log("about to find relations");
        var relobjs = findEntites(obj.location.entity, state, objects, currentState);
        console.log("Found relations");
        if (relobjs.length < 1) {
            return ["__Error__#1"];
        }
        else if (relobjs[0].indexOf("__Error__") >= 0) {
            return relobjs;
        }
        var result = filterRelation(obj.location.relation, currobjs, relobjs, state, currentState);
        if (ent.quantifier == "the" && currobjs.length > 1) {
            return ["__Error__#0"];
        }
        return result;
    }
    function filterRelation(filter, currobjs, relobjs, state, currentState) {
        var result = [];
        for (var i = 0; i < currobjs.length; i++) {
            for (var j = 0; j < relobjs.length; j++) {
                var cpos = currentState.getValue(currobjs[i]);
                var rpos = currentState.getValue(relobjs[j]);
                if (cpos[0] < 0 || rpos[0] < 0) {
                    continue;
                }
                switch (filter) {
                    case "leftof":
                        if (cpos[0] < rpos[0]) {
                            result.push(currobjs[i]);
                        }
                        continue;
                    case "rightof":
                        if (cpos[0] > rpos[0]) {
                            result.push(currobjs[i]);
                        }
                        continue;
                    case "inside":
                        if (cpos[0] == rpos[0] &&
                            cpos[1] - rpos[1] == 1 &&
                            state.objects[relobjs[j]].form == "box") {
                            result.push(currobjs[i]);
                        }
                        continue;
                    case "ontop":
                        if (cpos[0] == rpos[0] &&
                            cpos[1] - rpos[1] == 1) {
                            result.push(currobjs[i]);
                        }
                        continue;
                    case "under":
                        if (cpos[1] < rpos[1] &&
                            cpos[0] == rpos[0]) {
                            result.push(currobjs[i]);
                        }
                        continue;
                    case "beside":
                        if (cpos[0] - rpos[0] == 1 ||
                            cpos[0] - rpos[0] == -1) {
                            result.push(currobjs[i]);
                        }
                        continue;
                    case "above":
                        if (cpos[1] > rpos[1] &&
                            cpos[0] == rpos[0]) {
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
})(Interpreter || (Interpreter = {}));
var result = Parser.parse("put the large green brick on the large red box");
console.log(Parser.stringify(result[0]));
var formula = Interpreter.interpret(result, ExampleWorlds["small"]);
