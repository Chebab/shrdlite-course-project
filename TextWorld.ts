///<reference path="World.ts"/>
///<reference path="lib/node.d.ts"/>

class TextWorld implements World {

    constructor(public currentState : WorldState) {
        if (!this.currentState.arm) this.currentState.arm = 0;
        if (this.currentState.holding) this.currentState.holding = null;
    }

    public readUserInput(prompt : string, callback : (input:string) => void) : void {
        throw "Not implemented!";
    }

    public printSystemOutput(output : string, participant? : string) : void {
        if (participant == "user") {
            output = '"' + output + '"';
        }
        console.log(output);
    }

    public printDebugInfo(info : string) : void {
        console.log(info);
    }

    public printError(error : string, message? : string) : void {
        console.error(error, message);
    }

    public printWorld(callback? : () => void) {
        var world = this;
        console.log();
        var stacks : Stack[] = this.currentState.stacks;
        var maxHeight : number = Math.max.apply(null, stacks.map((s) => {return s.length}));
        var stackWidth : number = 3 + Math.max.apply(null, stacks.map((s) => {
            return Math.max.apply(null, s.map((o) => {return o.length}))
        }));
        var line : string = Array(this.currentState.arm * stackWidth).join(" ");
        console.log(line + this.centerString("\\_/", stackWidth));
        if (this.currentState.holding) {
            console.log(line + this.centerString(this.currentState.holding, stackWidth));
        }
        for (var y = maxHeight; y >= 0; y--) {
            var line = "";
            for (var x = 0; x < stacks.length; x++) {
                var obj = stacks[x][y] || "";
                line += this.centerString(obj, stackWidth);
            }
            console.log(line);
        }
        console.log("+" + Array(1+stacks.length).join(Array(stackWidth).join("-") + "+"));
        var line = "";
        for (var x = 0; x < stacks.length; x++) {
            line += this.centerString(x+"", stackWidth);
        }
        console.log(line);
        console.log();
        var printObject = (obj : string) => {
            var props : ObjectDefinition = world.currentState.objects[obj];
            console.log(this.centerString(obj, stackWidth) + ": " +
                        props.form + ", " + props.size + ", " + props.color
                       );
                        // Object.keys(props).map((k) => {return props[k]}).join(", "));
        };
        if (this.currentState.holding) printObject(this.currentState.holding);
        stacks.forEach((stack : string[]) => stack.forEach(printObject));
        console.log();
        if (callback) callback();
    }

    public performPlan(plan : string[], callback? : () => void) : void {
		var planctr = 0;
        var world = this;
        function performNextAction() {
            planctr++;
            if (plan && plan.length) {
                var item = plan.shift().trim();
                var action = world.getAction(item);
                if (action) {
                    try {
                        action.call(world, performNextAction);
                    } catch(err) {
                        world.printSystemOutput("ERROR: " + err);
                        if (callback) setTimeout(callback, 1);
                    }
                } else {
                    if (item && item[0] != "#") {
                        world.printSystemOutput(item);
                    }
                    performNextAction();
                }
            } else {
                if (callback) setTimeout(callback, 1);
            }
        }
        performNextAction();
    }

    //////////////////////////////////////////////////////////////////////
    // The basic actions: left, right, pick, drop

    private getAction(act : string) : (callback:()=>void) => void {
        var actions : {[act:string] : (a: number) => void}
            = {p:this.pick, d:this.drop, l:this.left, r:this.right, n: this.nullAction};
		var actions2 : {[act:string] : (callback:()=>void) => void} = {};
		
		
				
		for (var a in actions) {
			for (var a2 in actions) {
				
				actions2[a + a2] = function(str1: string, str2: string) : (callback: () => void) => void  {
					return function(callback: () => void) {
						actions[str1].call(this, 1);
						actions[str2].call(this, 2);
						
						if (callback) callback();
					}
				}	(a, a2);
			}
		}
        return actions2[act.toLowerCase()];
    }

	private nullAction(armNr : number) : void {
		
        return ;
	}

	
    private left(armNr : number) : void {
		
		if ((armNr == 1 && this.currentState.arm <= 0) || (armNr == 2 && this.currentState.arm2 <= 0)) {
            throw "Already at left edge!";
        }
		if (armNr == 1) {
			this.currentState.arm--;
		} else {
			this.currentState.arm2--;
		}
    }

    private right(armNr : number) : void {
		if ((armNr == 1 && this.currentState.arm >= this.currentState.stacks.length - 1) ||
			 (armNr == 2 && this.currentState.arm2 >= this.currentState.stacks.length - 1)) {
            throw "Already at right edge!";
        }
		if (armNr == 1) {
			this.currentState.arm++;
		} else {
			this.currentState.arm2++;
		}
    }
	
    private drop(armNr : number) : void {
		if ((armNr == 1 && !this.currentState.holding) || (armNr == 2 && !this.currentState.holding2) ) {
            throw "Not holding anything!";
        }
        if (armNr == 1) {
			this.currentState.stacks[this.currentState.arm].push(this.currentState.holding);
			this.currentState.holding = null;
		} else {
			this.currentState.stacks[this.currentState.arm2].push(this.currentState.holding2);
			this.currentState.holding2 = null;
		}
    }

    private pick(armNr : number) : void {
		if ((armNr == 1 && this.currentState.holding) || (armNr == 2 && this.currentState.holding2)) {
            throw "Already holding something!";
        }
		if (armNr == 1)  {
			this.currentState.holding = this.currentState.stacks[this.currentState.arm].pop();
		} else {
			this.currentState.holding2 = this.currentState.stacks[this.currentState.arm2].pop();
		}
    }


    //////////////////////////////////////////////////////////////////////
    // Utilities

    private centerString(str : string, width : number) : string {
		var padlen = width - str.length;
	    if (padlen > 0) {
            str = Array(Math.floor((padlen+3)/2)).join(" ") + str + Array(Math.floor((padlen+2)/2)).join(" ");
	    }
        return str;
    }

}
