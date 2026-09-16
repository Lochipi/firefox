var g = newGlobal({newCompartment: true});
var dbg = new Debugger;
var gw = dbg.addDebuggee(g);

// executeInGlobal is strict by default.
assertEq(gw.executeInGlobal(`let x = 42; x;`).return, 42);
assertEq(gw.executeInGlobal(`x;`).return, 42);
assertEq("throw" in gw.executeInGlobal(`let x = 84; x;`), true);

// REPL mode may reinitialize a binding from an earlier evaluation, while
// duplicate declarations in the same evaluation remain errors.
const allowRedeclare = { allowRedeclaringExistingLexicalBinding: true };
assertEq(gw.executeInGlobal(`let r = 42; r;`, allowRedeclare).return, 42);
assertEq(gw.executeInGlobal(`let r = 84; r;`, allowRedeclare).return, 84);
assertEq(gw.executeInGlobal(`const c = 1; c;`, allowRedeclare).return, 1);
assertEq(gw.executeInGlobal(`const c = 2; c;`, allowRedeclare).return, 2);
assertEq(
  "throw" in
    gw.executeInGlobal(`let a = 3; let a = 4;`, allowRedeclare),
  true
);
assertEq(
  "throw" in
    gw.executeInGlobal(`const b = 3; const b = 4;`, allowRedeclare),
  true
);

// Lexical bindings (let / const / class) live in the same environment, so in
// redeclare mode they can replace each other across evaluations. Bindings on
// the global object (var / function) still conflict with lexical ones and those
// throw in both directions.

// var -> let: throws
assertEq(gw.executeInGlobal(`var v1 = 1;`, allowRedeclare).return, undefined);
assertEq("throw" in gw.executeInGlobal(`let v1 = 2;`, allowRedeclare), true);

// let -> var: throws
assertEq(gw.executeInGlobal(`let v2 = 1;`, allowRedeclare).return, undefined);
assertEq("throw" in gw.executeInGlobal(`var v2 = 2;`, allowRedeclare), true);

// class -> let: allowed (both lexical)
assertEq(gw.executeInGlobal(`class C1 {}`, allowRedeclare).return, undefined);
assertEq(gw.executeInGlobal(`let C1 = 2; C1;`, allowRedeclare).return, 2);

// let -> class: allowed (both lexical)
assertEq(gw.executeInGlobal(`let C2 = 1;`, allowRedeclare).return, undefined);
assertEq(
  gw.executeInGlobal(`class C2 {} typeof C2;`, allowRedeclare).return,
  "function"
);

// function -> let: throws
assertEq(
  gw.executeInGlobal(`function f1() {}`, allowRedeclare).return,
  undefined
);
assertEq("throw" in gw.executeInGlobal(`let f1 = 2;`, allowRedeclare), true);

// let -> function: throws
assertEq(gw.executeInGlobal(`let f2 = 1;`, allowRedeclare).return, undefined);
assertEq(
  "throw" in gw.executeInGlobal(`function f2() {}`, allowRedeclare),
  true
);

// A closure that captures a lexical binding sees the new value after
// a REPL-mode redeclaration and the redeclaration reuses the same slot.
assertEq(
  gw.executeInGlobal(
    `let closureVar = 1; function readClosureVar() { return closureVar; }`,
    allowRedeclare
  ).return,
  undefined
);
assertEq(gw.executeInGlobal(`readClosureVar();`, allowRedeclare).return, 1);
assertEq(
  gw.executeInGlobal(`let closureVar = 2;`, allowRedeclare).return,
  undefined
);
assertEq(gw.executeInGlobal(`readClosureVar();`, allowRedeclare).return, 2);

// By contrast, Debugger.Frame.eval is like direct eval, and shouldn't be able
// to introduce new lexical bindings.
dbg.onDebuggerStatement = function (frame) { frame.eval(`let y = 84;`); };
g.eval(`debugger;`);
assertEq("throw" in gw.executeInGlobal(`y;`), true);
