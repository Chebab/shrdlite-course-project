The Shrdlite course project
============================

Shrdlite is a programming project in Artificial Intelligence, a course given
at the University of Gothenburg and Chalmers University of Technology.
For more information, see the course webpages:

- <http://ChalmersGU-AI-course.github.io/>

For the original README please visit:

- <https://github.com/ChalmersGU-AI-course/shrdlite-course-project>

##Extensions

### "all" extension
One of the currently implemented extensions in the project is the so called
"all" extension. What this means is that the user is able to use the quantifier
all in the commands to the program. An example would be:

```
"place all balls in a box"
```

This extension has been implemented in the file `Interpreter.ts` in the function
`interperetCommand(...)`. The function still uses the same methods for finding the
objects talked about, however the handling of the found objects are a bit different
when the all quantifier is found. The process is step by step explained bellow:

```
1. Find the source and target object(s)
2. Recognize the "move" or "put" command.
3. Generate all combinations between the source and target objects
4. Pass this information to the function findFeasibleCombinations(...)
5. return interpretation
```

For more information about what `findFeasibleCombinations(...)` does, see file
`Interpreter.ts`.

### Planning, overview

The planner tries to run the aStarSearch to find a solution, using the combination of the two heuristics described below. If it is unable to find a solution in a given time frame, it tries again, but with a modified non-admissible heuristic, also described below, with more and more aggressive parameters for each time that it fails to find a solution. 

### Planning extension, two arms
The first step of the planning is to find a plan for a one-arm system. After this is done, the plan in transformed into a plan for a two-arm system, by assigning each move in the plan in a (mostly) FCFS manner to one of two arms. The exception to FCFS is that the last move is always given to the first arm, so that the final state is the same as it would be if there was only one arm in the system. The two-arm planning works as follows:

```
1. aStarSearch returns a list of world states. 
2. The list of world states is transformed into a list of pairs of columns, 
or moves, where each pair corresponds to an item to be moved from the first 
to the second column. (PlannerHelpers.getMoves)
3. The list of moves is split into two lists, one for each arm. Waiting times 
are also inserted in the plans, to avoid either arm disturbing the other. 
(PlannerHelpers.getTwoArmMoves)
4. The plans are turned into lists of command strings that a one-arm system 
can perform. (PlannerHelpers.getPlanStringsFromMoves)
5. The two lists of strings are combined into one list of strings with all 
commands for both arms. 
```

Both the graphical UI the textual UI have been updated to allow commands strings of the form xx where x is either  d, p, l, r, or n where n is a null (waiting) move. 

In step 4, comments are also added to the list of command strings. These comments are displayed to the user and they describe what the arm is about to do. This is described in the next section. 

### Planning extension, textual descriptions
For a given move, a helpful describing text is displayed to the user. The PlannerHelpers.getDescribingText function is used for this. PlannerHelpers.getDescribingText returns a string that describes what object is to be moved, and where it is to be placed. To do this, it uses PlannerHelpers.objectString, which finds the shortest possible description of an object that still singles out the object in the given world. 

### Planning extension, heuristics
There are two heuristic functions in the Heuristics.ts file, and one function that takes the maximum of the two. focusOnOneConjunctHeuristic tries to get the best possible lower bound for the cost of fulfilling a single conjunct in a DNFFormula. That is, it calculates such a lower bound for all conjuncts in the given DNFFormula and returns the maximum of those values. combineAllConjunctsHeuristic on the other hand tries to look at all conjuncts combined and find a lower bound for the cost of fulfilling all the conjuncts. focusOnOneConjunctHeuristic can therefore give better results when close to the goal, since it can be more detailed for a single conjunct, but combineAllConjunctsHeuristic is usually better when there are many unfulfilled goals. 

Some ideas are common for both heuristics. They both try to find the distance that the arm needs to travel between objects mentioned in the DNFFormula and the number of objects that need to be moved to get to those objects. I describe here the way that combineAllConjunctsHeuristic works, but focusOnOneConjunctHeuristic is similar. 

#### Finding the number of objects that need to be moved to get to the items mentioned in the Literals
First, we descibe how Literals which require the arguments to be in the same column are investigated. For "ontop" and "inside" Literals, we need to remove the number of objects above both arguments. For "under" and "above" Literals, one can only be sure that the objects above the second argument and the first argument, respectively, need to be moved. Of course, if there are several items in the same column that all share the same objects above them, we cannot count these items multiple times, so we keep track of the number of already counted objects for each column. 

For "leftof", "rightof" and "beside" Literals (henceforth called lateral Literals), it is a bit more complicated. If there are two or more lateral Literals in a conjunct and they have an argument in the same column, one cannot be sure that more than one of the arguments in any of those Literals needs to be moved. Thus: 

```
1. We find all arguments mentioned in all lateral Literals in the conjunct
2. Then we loop through those Literals, marking the objects above the shallower of the arguments of each literal to be moved. 
3. The depths of all objects are updated when this is done, so that no double counting is performed. 
```

#### The distance the arm needs to travel
For lateral Literals, when a literal is considered as needed to be moved, the distance between its arguments plus a constant is added to the lower bound for the required travel distance. The constant is +1 for "leftof"/"rightof" Literals since the object needs to be put on the other side of the item from where it is currently and it is -1 for "beside" Literals, since it might be that an item can be left on the same side as it currently is. 

For non-lateral Literals where at least one argument object needs to be moved, the distance between the objects is added to the lower bound for the distance to be travelled. 

#### Non-admissible heuristic, "cheating"
combineAllConjunctsHeuristic uses the value of the variable penaltyPerLiteral to add a constant for each unfulfilled Literal in a conjunct. This can be used to create a non-admissible heuristic that results in states where there are few goals left to fulfill being prioritized. Setting the value of penaltyPerLiteral to 0 disables this feature. 

### Ambiguity resolution
If the user types something that is ambiguous, the planner first tries to make a plan for each of the possible parses of the input. If there is a plan for more than one such parse, then the user is shown a parenthesized version of the input for each parse and gets to choose which input the user wants. Parts of the file Shrdlite.ts was rewritten in a continuation-passing style for this to be easier. 


