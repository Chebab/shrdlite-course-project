///<reference path="Parser.ts"/>


module ParenthesizedCommandParser {
	//Returns an array of strings of stringified parses where parentheses are added to make it clear
	//how the sentence was parsed
	export function parsesToStrings(parses: Parser.ParseResult[], indices : number[]) : string[] {
		var result : string[] = [];
		var count : number = 0;
		for (var i of indices) {
			result.push("(" + count + ") " + parseToString(parses[i]));
			count++;
		}
		
		return result;
	}

	//Nothing fancy, just boilerplate traversal of the parse tree
	export function parseToString(parse: Parser.ParseResult) : string {
		var result = parse.parse.command + " ";
		if (parse.parse.entity == null) {
			result += "it ";
		} else {
			result += entityToString(parse.parse.entity) + " ";
		}
		if (parse.parse.location != null) {
			result += locationToString(parse.parse.location);
		}
		
		return result;
	}
	
	//Nothing fancy, just boilerplate traversal of the parse tree
	export function entityToString(ent : Parser.Entity) : string {
		var result = "(" + ent.quantifier + " ";
		result += objectToString(ent.object, ent.quantifier == "all");
		return result + ")";
	}
	
	//Nothing fancy, just boilerplate traversal of the parse tree
	export function objectToString(obj : Parser.Object, isPlural : boolean) : string {
		var result = "";
		var plurals : { [s:string]: string; } = {"thing" : "s", "box" : "es", "plank" : "s", "ball": "s", 
			"pyramid" : "s", "brick" : "s"};
		var strings : string[] = [];
		if (obj.location == null) {
			if (obj.size != null) {
				strings.push(obj.size);
			}
			if (obj.color != null) {
				strings.push(obj.color);
			}
			if (obj.form != null) {
				if (obj.form != "anyform") {
					strings.push(obj.form + (isPlural ? plurals[obj.form] : ""));
				} else {
					strings.push("thing" + (isPlural ? "s" : ""));
				}
			}
			result += strings.join(" ");
		} else {
			result += "(" + objectToString(obj.object, isPlural) + " " + locationToString(obj.location) + ")";
		}
		return result;
	}
	
	
	//Nothing fancy, just boilerplate traversal of the parse tree
	export function locationToString(rel : Parser.Location) : string {
		var relations : { [s:string]: string; } = {"leftof" : "left of", 
				"rightof" : "right of ", "inside" : "inside",  
				"ontop" : "on top of", "under" : "under", "beside" : "beside", "above" : "above"};
		var result : string = "(" + relations[rel.relation] + " ";
		result += entityToString(rel.entity);
		return result + ")";
	}
	
}