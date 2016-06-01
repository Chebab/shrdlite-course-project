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
        var interpretation = [];
        var currentState = new collections.Dictionary();
        for (var i = 0; i < state.stacks.length; i++) {
            for (var j = 0; j < state.stacks[i].length; j++) {
                currentState.setValue(state.stacks[i][j], [i, j]);
            }
        }
        if (state.holding != null) {
            objects.push(state.holding);
            currentState.setValue(state.holding, [-2, -2]);
        }
        objects.push("floor");
        currentState.setValue("floor", [-1, -1]);
        var sourceobj = findEntites(cmd.entity, state, objects, currentState);
        if (sourceobj.length < 1) {
            throw new Error("No source objects found");
        }
        var targetobj = [];
        if (cmd.location != null) {
            targetobj = findEntites(cmd.location.entity, state, objects, currentState);
        }
        if (cmd.command == "move") {
            if (targetobj.length < 1) {
                throw new Error("No target objects");
            }
            var sourceQuant = cmd.entity.quantifier;
            var targetQuant = cmd.location.entity.quantifier;
            var sourceChecked = [];
            var targetChecked = [];
            var allCombinations = [];
            for (var i = 0; i < sourceobj.length; i++) {
                for (var j = 0; j < targetobj.length; j++) {
                    if (sourceobj[i] == targetobj[j]) {
                        continue;
                    }
                    var theObjects = objectFactory(sourceobj[i], targetobj[j], state);
                    var sourceObject = theObjects[0];
                    var targetObject = theObjects[1];
                    if (isPhysical(cmd.location.relation, sourceObject, targetObject)) {
                        allCombinations.push({
                            polarity: true,
                            relation: cmd.location.relation,
                            args: [sourceobj[i], targetobj[j]]
                        });
                        if (sourceChecked.indexOf(sourceobj[i]) < 0) {
                            sourceChecked.push(sourceobj[i]);
                        }
                        if (targetChecked.indexOf(targetobj[j]) < 0) {
                            targetChecked.push(targetobj[j]);
                        }
                    }
                }
            }
            if (allCombinations.length < 1) {
                throw new Error("NO combinations to evaluate.");
            }
            var checkedElements;
            var startingElems = [];
            var isAllsrc = sourceQuant == "all";
            var isAlltrgt = targetQuant == "all";
            for (var i = 0; i < allCombinations.length; i++) {
                if (isAllsrc && !isAlltrgt) {
                    if (allCombinations[i].args[0] == sourceobj[0]) {
                        startingElems.push([allCombinations[i]]);
                    }
                }
                else if (!isAllsrc && isAlltrgt) {
                    if (allCombinations[i].args[1] == targetobj[0]) {
                        startingElems.push([allCombinations[i]]);
                    }
                }
                else {
                    startingElems.push([allCombinations[i]]);
                    break;
                }
            }
            interpretation = findFeasibleCombinations(startingElems, allCombinations, isAllsrc, isAlltrgt, sourceChecked, targetChecked, 0);
        }
        else if (cmd.command == "take") {
            for (var i = 0; i < sourceobj.length; i++) {
                if (!(sourceobj[i] == "floor")) {
                    interpretation.push(makeLiteral(true, "holding", [sourceobj[i]]));
                }
            }
        }
        if (interpretation.length < 1) {
            throw new Error("No interpretations found");
        }
        return interpretation;
    }
    function findFeasibleCombinations(combinations, allCombinations, isSourceAll, isTargetAll, sourceIDs, targetIDs, index) {
        if (allCombinations.length < 1) {
            throw new Error("No combinations to evaluate");
        }
        var returnVal = [];
        if (isSourceAll && isTargetAll || !isSourceAll && !isTargetAll) {
            return feasibleCombination([], allCombinations, isSourceAll, isTargetAll);
        }
        else if (isSourceAll && !isTargetAll) {
            if (index > sourceIDs.length - 1) {
                return combinations;
            }
            var partCombinations = [];
            for (var i = 0; i < allCombinations.length; i++) {
                if (sourceIDs[index] == allCombinations[i].args[0]) {
                    partCombinations.push(allCombinations[i]);
                }
            }
            var newCombinations = [];
            for (var i = 0; i < combinations.length; i++) {
                newCombinations = newCombinations.concat(feasibleCombination(combinations[i], partCombinations, isSourceAll, isTargetAll));
            }
            for (var i = 0; i < newCombinations.length; i++) {
                for (var j = 0; j < newCombinations[i].length; j++) {
                }
            }
            returnVal = findFeasibleCombinations(newCombinations, allCombinations, isSourceAll, isTargetAll, sourceIDs, targetIDs, ++index);
        }
        else {
            if (index > sourceIDs.length - 1) {
                return combinations;
            }
            var partCombinations = [];
            for (var i = 0; i < allCombinations.length; i++) {
                if (targetIDs[index] == allCombinations[i].args[1]) {
                    partCombinations.push(allCombinations[i]);
                }
            }
            var newCombinations = [];
            for (var i = 0; i < combinations.length; i++) {
                newCombinations = newCombinations.concat(feasibleCombination(combinations[i], partCombinations, isSourceAll, isTargetAll));
            }
            for (var i = 0; i < newCombinations.length; i++) {
                console.log("newCombination[" + i + "], length:" + newCombinations.length);
                for (var j = 0; j < newCombinations[i].length; j++) {
                    console.log(stringifyLiteral(newCombinations[i][j]));
                }
            }
            returnVal = findFeasibleCombinations(newCombinations, allCombinations, isSourceAll, isTargetAll, sourceIDs, targetIDs, ++index);
        }
        return returnVal;
    }
    function feasibleCombination(combination, allCombinations, isSourceAll, isTargetAll) {
        if (allCombinations.length < 1) {
            throw new Error("allCombinations empty");
        }
        var returnVal = [];
        var srcIndent = [];
        var trgtIndent = [];
        for (var i = 0; i < combination.length; i++) {
            srcIndent.push(combination[i].args[0]);
            trgtIndent.push(combination[i].args[1]);
        }
        for (var i = 0; i < allCombinations.length; i++) {
            var comb = allCombinations[i];
            var sourceElemExists = srcIndent.indexOf(comb.args[0]) >= 0;
            var targetElemExists = trgtIndent.indexOf(comb.args[1]) >= 0;
            var isTargetFloor = comb.args[1] == "floor";
            if (isSourceAll && isTargetAll) {
                if (returnVal.length < 1) {
                    returnVal.push([comb]);
                }
                else {
                    returnVal[0].push(comb);
                }
            }
            else if (!isSourceAll && !isTargetAll) {
                returnVal.push([comb]);
            }
            else if (combination[0].relation == "inside" || combination[0].relation == "ontop") {
                if (!sourceElemExists && (!targetElemExists || isTargetFloor)) {
                    returnVal.push(combination.concat([comb]));
                }
            }
            else if (isSourceAll && !isTargetAll) {
                if (!sourceElemExists) {
                    returnVal.push(combination.concat([comb]));
                }
            }
            else if (!isSourceAll && isTargetAll) {
                if (!targetElemExists) {
                    returnVal.push(combination.concat([comb]));
                }
            }
        }
        if (returnVal.length < 1) {
            returnVal = [combination];
        }
        return returnVal;
    }
    function findEntites(ent, state, objects, currentState) {
        var obj = ent.object;
        var currobjs = findObjects(obj, state, objects, currentState);
        if (ent.quantifier == "the" && currobjs.length > 1) {
            throw new Error("Too many indentifications of type THE");
        }
        if (obj.location == null) {
            return currobjs;
        }
        var relobjs = findEntites(obj.location.entity, state, objects, currentState);
        var result = filterRelation(obj.location.relation, currobjs, relobjs, state, currentState);
        return result;
    }
    function findObjects(obj, state, objects, currentState) {
        if (obj == null) {
            return [];
        }
        var sourceobjs = [];
        if (obj.object == null && obj.location == null) {
            for (var i = 0; i < objects.length; i++) {
                var temp;
                if (objects[i] == "floor") {
                    temp = { form: "floor", size: null, color: null };
                }
                else {
                    temp = state.objects[objects[i]];
                }
                var isSame = true;
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
            var tempsourceobjs = findObjects(obj.object, state, objects, currentState);
            var temptargetobjs = findEntites(obj.location.entity, state, objects, currentState);
            sourceobjs = filterRelation(obj.location.relation, tempsourceobjs, temptargetobjs, state, currentState);
        }
        return sourceobjs;
    }
    function filterRelation(filter, sourceobj, targetobj, state, currentState) {
        var result = [];
        outer: for (var i = 0; i < sourceobj.length; i++) {
            for (var j = 0; j < targetobj.length; j++) {
                var theObjects = objectFactory(sourceobj[i], targetobj[j], state);
                var sourceObject = theObjects[0];
                var targetObject = theObjects[1];
                var cpos = currentState.getValue(sourceobj[i]);
                var rpos = currentState.getValue(targetobj[j]);
                if (cpos[0] == -2) {
                    continue;
                }
                if (!isPhysical(filter, sourceObject, targetObject)) {
                    continue;
                }
                else if (isFeasible(filter, cpos, rpos)) {
                    result.push(sourceobj[i]);
                    continue outer;
                }
            }
        }
        return result;
    }
    function allHandle(relation, sourceobj, targetobj, state) {
        return [];
    }
    function isFeasible(relation, spos, tpos) {
        var xs = spos[0];
        var ys = spos[1];
        var xt = tpos[0];
        var yt = tpos[1];
        if (xs == -1) {
            xs = xt;
        }
        else if (xt == -1) {
            xt = xs;
        }
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
    Interpreter.isFeasible = isFeasible;
    function isPhysical(relation, sourceObj, targetObj) {
        switch (relation) {
            case "rightof":
            case "leftof":
            case "beside":
                if (sourceObj.form == "floor" || targetObj.form == "floor") {
                    return false;
                }
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
                if (targetObj.form == "pyramid" || targetObj.form == "ball" ||
                    (sourceObj.form == "ball" && (targetObj.form == "table" ||
                        targetObj.form == "brick" || targetObj.form == "plank")) ||
                    targetObj.form == "box" ||
                    (sourceObj.form == "box" && sourceObj.size == "small" &&
                        targetObj.form == "brick" && targetObj.size == "small") ||
                    sourceObj.form == "floor") {
                    return false;
                }
                else {
                    return true;
                }
            case "above":
                if (sourceObj.size == "large" && targetObj.size == "small" ||
                    sourceObj.form == "floor") {
                    return false;
                }
                return true;
            case "below":
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
    Interpreter.isPhysical = isPhysical;
    function objectFactory(source, target, state) {
        var sourceObject;
        var targetObject;
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
    function makeLiteral(polarity, relation, args) {
        return [{ polarity: polarity, relation: relation, args: args }];
    }
})(Interpreter || (Interpreter = {}));
var result = Parser.parse("put any object under all tables");
console.log(Parser.stringify(result[0]));
var formula = Interpreter.interpret(result, ExampleWorlds["complex"]);
console.log(Interpreter.stringify(formula[0]));
