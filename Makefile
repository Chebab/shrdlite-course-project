
TARGETS = html ajax ansi offline

.DELETE_ON_ERROR:

.PHONY: help clean all doc

TSFILES = $(wildcard *.ts)

help:
	@echo "make help | clean | all | aStarTests | interpretationTests | shrdlite-html.js | shrdlite-offline.js"

clean:
	rm -f $(TSFILES:%.ts=%.js) *.map
	rm -rf doc

doc:
	typedoc --name Shrdlite --out doc .

all: shrdlite-html.js shrdlite-offline.js

int:
	tsc Interpreter.ts ExampleWorlds.ts World.ts Parser.ts lib/collections --out a.js
	node a.js

plan:
	tsc Interpreter.ts Graph.ts Planner.ts ExampleWorlds.ts World.ts Parser.ts lib/collections --out a.js
	node a.js

aStarTests: TestAStar.js
	node $< all

interpretationTests: TestInterpreter.js
	node $< all

# Make TypeScript as strict as possible:
TSC = tsc --noFallthroughCasesInSwitch --noImplicitReturns --noImplicitAny

%.js: %.ts $(TSFILES)
	$(TSC) --out $@ $<

grammar.js: grammar.ne
	nearleyc $< > $@
