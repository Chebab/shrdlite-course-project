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
            console.log("Source:" + sourceobj);
            console.log("Target:" + targetobj);
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
            var checkedElements;
            for (var i = 0; i < allCombinations.length; i++) {
                console.log("cComb:[" + allCombinations[i].args[0] + "," + allCombinations[i].args[1] + "]");
                checkedElements = [];
                var cComb = allCombinations[i];
                var isAllsrc = sourceQuant == "all";
                var isAlltrgt = targetQuant == "all";
                if (!isAllsrc && !isAlltrgt) {
                    interpretation.push([cComb]);
                }
                else if ((!isAllsrc && isAlltrgt) ||
                    (isAllsrc && !isAlltrgt)) {
                    var conjunctions = [];
                    conjunctions.push(cComb);
                    checkedElements.push(cComb.args[0]);
                    checkedElements.push(cComb.args[1]);
                    for (var j = i + 1; j < allCombinations.length; j++) {
                        var nComb = allCombinations[j];
                        var sourceElemExists = checkedElements.indexOf(nComb.args[0]) >= 0;
                        var targetElemExists = checkedElements.indexOf(nComb.args[1]) >= 0;
                        console.log("nComb:[" + nComb.args[0] + "," + nComb.args[1] + "]");
                        if (cmd.location.relation == "inside" || cmd.location.relation == "ontop") {
                            if (!targetElemExists && !sourceElemExists || nComb.args[1] == "floor") {
                                conjunctions.push(nComb);
                                checkedElements.push(nComb.args[0]);
                                checkedElements.push(nComb.args[1]);
                            }
                        }
                        else if (isAllsrc) {
                            if (!sourceElemExists) {
                                conjunctions.push(nComb);
                                checkedElements.push(nComb.args[0]);
                            }
                        }
                        else if (isAlltrgt) {
                            if (!targetElemExists) {
                                conjunctions.push(nComb);
                                checkedElements.push(nComb.args[1]);
                            }
                        }
                        console.log("Checked elems: " + checkedElements);
                    }
                    var qualified;
                    if (isAllsrc) {
                        qualified = sourceChecked;
                    }
                    else {
                        qualified = targetChecked;
                    }
                    console.log("qualified:" + qualified);
                    console.log("checkedElements:" + checkedElements);
                    if (qualified.every(function (val) { return checkedElements.indexOf(val) >= 0; })) {
                        console.log("conjunctions: OKEY");
                        interpretation.push(conjunctions);
                    }
                    else {
                        console.log("conjunctions: FAILED");
                    }
                }
                else if (sourceQuant == "all" && targetQuant == "all") {
                    if (interpretation.length == 0) {
                        interpretation.push([cComb]);
                    }
                    else {
                        interpretation[0].push(cComb);
                    }
                }
            }
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
var world = "complex";
var example = 0;
var result = Parser.parse(ExampleWorlds[world].examples[example]);
console.log(Parser.stringify(result[0]));
var formula = Interpreter.interpret(result, ExampleWorlds[world]);
console.log(Interpreter.stringify(formula[0]));
