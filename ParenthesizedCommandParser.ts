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
		result += objectToString(ent.object);
		return result + ")";
	}
	
	//Nothing fancy, just boilerplate traversal of the parse tree
	export function objectToString(obj : Parser.Object) : string {
		var result = "";
		var strings : string[] = [];
		if (obj.location == null) {
			if (obj.size != null) {
				strings.push(obj.size);
			}
			if (obj.color != null) {
				strings.push(obj.color);
			}
			if (obj.form != null) {
				
				strings.push(obj.form);
			}
			result += strings.join(" ");
		} else {
			result += "(" + objectToString(obj.object) + " " + locationToString(obj.location) + ")";
		}
		return result;
	}
	
	//Nothing fancy, just boilerplate traversal of the parse tree
	export function locationToString(rel : Parser.Location) : string {
		var result = "(" + rel.relation + " ";
		result += entityToString(rel.entity);
		return result + ")";
	}
	
}