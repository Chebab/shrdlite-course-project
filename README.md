The Shrdlite course project
============================

Shrdlite is a programming project in Artificial Intelligence, a course given
at the University of Gothenburg and Chalmers University of Technology.
For more information, see the course webpages:

- <http://ChalmersGU-AI-course.github.io/>

For the original README please visit:
-<https://github.com/ChalmersGU-AI-course/shrdlite-course-project>

##Extensions

### "all" extension
One of the currently implemented extensions in the project is the so called
"all" extension. What this means is that the user is able to use the quantifier
all in the commands to the program. An example would be:

´´´
"place all balls in a box"
´´´

This extension has been implemented in the file ´Interpreter.ts´ in the function
´interperetCommand(...)´. The function still uses the same methods for finding the
objects talked about, however the handling of the found objects are a bit different
when the all quantifier is found. The process is step by step explained bellow:

´´´
1. Find the source and target object(s)
2. Recognice the "move" or "put" command.
3. Generate all combinations between the source and target objects
4. Pass this information to the function findFeasibleCombinations(...)
5. return interpretation
´´´

For more information about what ´findFeasibleCombinations(...)´ can be found
in the file ´Interpreter.ts´
