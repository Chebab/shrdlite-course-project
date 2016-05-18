var Planner;
(function (Planner) {
    function plan(interpretations, currentState) {
        var errors = [];
        var plans = [];
        interpretations.forEach(function (interpretation) {
            try {
                var result = interpretation;
                result.plan = planInterpretation(result.interpretation, currentState);
                if (result.plan.length == 0) {
                    result.plan.push("That is already true!");
                }
                plans.push(result);
            }
            catch (err) {
                errors.push(err);
            }
        });
        if (plans.length) {
            return plans;
        }
        else {
            throw errors[0];
        }
    }
    Planner.plan = plan;
    function stringify(result) {
        return result.plan.join(", ");
    }
    Planner.stringify = stringify;
    function planInterpretation(interpretation, state) {
        function goalIsReached(state) {
            var positions = new collections.Dictionary();
            for (var i = 0; i < state.stacks.length; i++) {
                for (var j = 0; j < state.stacks[i].length; j++) {
                    positions.setValue(state.stacks[i][j], [i, j]);
                }
            }
            if (state.holding != null) {
                positions.setValue(state.holding, [-2, -2]);
            }
            positions.setValue("floor", [-1, -1]);
            for (var _i = 0, interpretation_1 = interpretation; _i < interpretation_1.length; _i++) {
                var conjunct = interpretation_1[_i];
                var goalReached = true;
                for (var _a = 0, conjunct_1 = conjunct; _a < conjunct_1.length; _a++) {
                    var literal = conjunct_1[_a];
                    var relation = literal.relation;
                    var pos1 = positions.getValue(literal.args[0]);
                    var pos2 = null;
                    if (literal.args.length > 1) {
                        pos2 = positions.getValue(literal.args[1]);
                    }
                    if (literal.relation == "holding") {
                        goalReached = state.holding == literal.args[0];
                    }
                    else if (!Interpreter.isFeasible(literal.relation, pos1, pos2)) {
                        goalReached = false;
                    }
                    if (!goalReached)
                        break;
                }
                if (goalReached)
                    return true;
            }
            return false;
        }
        var plan = [];
        var foundResult = aStarSearch(new WorldStateGraph(), new WorldStateNode(state.stacks, state.holding, state.arm, state.objects), goalIsReached, function (a) { return 0; }, 10);
        console.log("Found result:");
        console.log(foundResult);
        var nodeResult = foundResult.path;
        var prevNode;
        var currNode;
        for (var i = 0; i < nodeResult.length; i++) {
            currNode = nodeResult[i];
            if (i++ < nodeResult.length) {
            }
        }
        return plan;
    }
})(Planner || (Planner = {}));
var WorldStateNode = (function () {
    function WorldStateNode(stacks, holding, arm, objects) {
        this.stacks = stacks;
        this.holding = holding;
        this.arm = arm;
        this.objects = objects;
        this.examples = null;
    }
    WorldStateNode.prototype.toString = function () {
        var value = "";
        for (var _i = 0, _a = this.stacks; _i < _a.length; _i++) {
            var s = _a[_i];
            value = value + "[" + s + "]";
        }
        value = value + "   arm: " + this.arm;
        value = value + "   holding: " + this.holding;
        return value;
    };
    WorldStateNode.prototype.clone = function () {
        var newStacks = [];
        for (var i = 0; i < this.stacks.length; i++) {
            newStacks.push(this.stacks[i].slice());
        }
        return new WorldStateNode(newStacks, this.holding, this.arm, this.objects);
    };
    return WorldStateNode;
}());
var WorldStateGraph = (function () {
    function WorldStateGraph() {
    }
    WorldStateGraph.prototype.outgoingEdges = function (gn) {
        var results = [];
        if (!gn.holding && gn.stacks[gn.arm].length > 0) {
            var gnnew = gn.clone();
            var currStack = gnnew.stacks[gnnew.arm];
            gnnew.holding = currStack.pop();
            var newEdge = { from: gn, to: gnnew, cost: 1 };
            results.push(newEdge);
        }
        if (gn.holding) {
            var gnnew = gn.clone();
            var currStack = gnnew.stacks[gnnew.arm];
            var newEdge = { from: gn, to: gnnew, cost: 1 };
            if (currStack.length > 0) {
                var heldObject = gn.objects[gn.holding];
                var topObject = gn.objects[currStack[currStack.length - 1]];
                if (Interpreter.isPhysical("ontop", heldObject, topObject) ||
                    Interpreter.isPhysical("inside", heldObject, topObject)) {
                    currStack.push(gn.holding);
                    gnnew.holding = null;
                    results.push(newEdge);
                }
            }
            else {
                currStack.push(gn.holding);
                gnnew.holding = null;
                results.push(newEdge);
            }
        }
        if (gn.arm != 0) {
            var gnnew = gn.clone();
            var newEdge = { from: gn, to: gnnew, cost: 1 };
            gnnew.arm--;
            results.push(newEdge);
        }
        if (gn.arm != gn.stacks.length - 1) {
            var gnnew = gn.clone();
            var newEdge = { from: gn, to: gnnew, cost: 1 };
            gnnew.arm++;
            results.push(newEdge);
        }
        return results;
    };
    WorldStateGraph.prototype.compareStacks = function (stackA, stackB) {
        var retVal = false;
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
                }
                else {
                    return false;
                }
            }
        }
        return retVal;
    };
    WorldStateGraph.prototype.compareNodes = function (stateA, stateB) {
        if (this.compareStacks(stateA.stacks, stateB.stacks) && stateA.holding == stateB.holding &&
            stateA.arm == stateB.arm) {
            return 0;
        }
        else {
            return 1;
        }
    };
    return WorldStateGraph;
}());
var hard = "put the black ball in the large yellow box";
var easy = "take a ball";
var result = Parser.parse(hard);
var formula = Interpreter.interpret(result, ExampleWorlds["small"]);
var plan = Planner.plan(formula, ExampleWorlds["small"]);
