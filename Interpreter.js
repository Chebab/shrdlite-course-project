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
            currentState.setValue(state.holding, [-1, -1]);
            objects.push(state.holding);
        }
        var sourceobj = findEntites(cmd.entity, state, objects, currentState);
        if (sourceobj.length < 1) {
            console.log("no source objects");
            return [[]];
        }
        else if (sourceobj[0].indexOf("__Error__") >= 0) {
            var error = sourceobj[0].split("#");
            var errorCode = error[1];
            console.log("cannot find a source object, error code:" + errorCode);
            return [[]];
        }
        var targetobj = [];
        if (cmd.location != null) {
            console.log("trying to find targetobj");
            targetobj = findEntites(cmd.location.entity, state, objects, currentState);
        }
        if (cmd.command == "move") {
            if (targetobj.length < 1) {
                console.log("no target objects");
                return [[]];
            }
            else if (targetobj[0].indexOf("__Error__") >= 0) {
                var error = sourceobj[0].split("#");
                var errorCode = error[1];
                console.log("cannot find a target object, error code:" + errorCode);
                return [[]];
            }
            console.log("amount of sobj=" + sourceobj.length + " and amount of tobj=" + sourceobj.length);
            for (var i = 0; i < sourceobj.length; i++) {
                for (var j = 0; j < targetobj.length; j++) {
                    if (sourceobj[i] == targetobj[j]) {
                        continue;
                    }
                    var sourceObject = state.objects[sourceobj[i]];
                    var targetObject = state.objects[targetobj[j]];
                    var cpos = currentState.getValue(sourceobj[i]);
                    var rpos = currentState.getValue(targetobj[j]);
                    if (isFeasible(sourceobj[i], targetobj[j], cmd.location.relation, sourceObject, targetObject, cpos, rpos)) {
                        interpretation.push([
                            {
                                polarity: true,
                                relation: cmd.location.relation,
                                args: [sourceobj[i], targetobj[j]]
                            }
                        ]);
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
        var relobjs = findEntites(obj.location.entity, state, objects, currentState);
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
        console.log("searchword is " + filter);
        for (var i = 0; i < currobjs.length; i++) {
            for (var j = 0; j < relobjs.length; j++) {
                var sourceObject = state.objects[currobjs[i]];
                var targetObject = state.objects[relobjs[j]];
                var cpos = currentState.getValue(currobjs[i]);
                var rpos = currentState.getValue(relobjs[j]);
                if (cpos[0] < 0 || rpos[0] < 0) {
                    continue;
                }
                if (isFeasible(currobjs[i], relobjs[j], filter, sourceObject, targetObject, cpos, rpos)) {
                    result.push(currobjs[i]);
                    continue;
                }
            }
        }
        return result;
    }
    function isFeasible(sourceId, targetId, relation, sourceObj, targetObj, spos, tpos) {
        switch (relation) {
            case "leftof":
                if (spos[0] < tpos[0]) {
                    return true;
                }
                return false;
            case "rightof":
                if (spos[0] > tpos[0]) {
                    return true;
                }
                return false;
            case "inside":
                if (spos[0] == tpos[0] &&
                    spos[1] - tpos[1] == 1 &&
                    targetObj.form == "box" &&
                    !(sourceObj.size == "large" &&
                        targetObj.size == "small")) {
                    console.log(sourceObj.size + " " + sourceObj.form);
                    console.log(targetObj.size + " " + targetObj.form);
                    return true;
                }
                return false;
            case "ontop":
                if (spos[0] == tpos[0] &&
                    spos[1] - tpos[1] == 1) {
                    return true;
                }
                return false;
            case "under":
                if (spos[1] < tpos[1] &&
                    spos[0] == tpos[0]) {
                    return true;
                }
                return false;
            case "beside":
                if (spos[0] - tpos[0] == 1 ||
                    spos[0] - tpos[0] == -1) {
                    return true;
                }
                return false;
            case "above":
                if (spos[1] > tpos[1] &&
                    spos[0] == tpos[0]) {
                    return true;
                }
                return false;
            default:
                return false;
        }
    }
})(Interpreter || (Interpreter = {}));
var result = Parser.parse("put a ball in a box");
console.log(Parser.stringify(result[0]));
var formula = Interpreter.interpret(result, ExampleWorlds["small"]);
