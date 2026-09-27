import { readFile, writeFile } from 'node:fs/promises';
import * as ts from 'typescript';

for (const file of ['server/database.js', 'server/app.js']) {
  const source = await readFile(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const prepared = new Set();
  const calls = [];
  const functions = new Set();

  function nameOf(node) {
    return ts.isIdentifier(node) ? node.text : ts.isPropertyAccessExpression(node) ? node.name.text : '';
  }

  function isPrepareCall(node) {
    return ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'prepare' && nameOf(node.expression.expression) === 'db';
  }

  function isTargetCall(node) {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return false;
    const method = node.expression.name.text;
    const receiver = node.expression.expression;
    if (['get', 'all', 'run'].includes(method)) {
      if (isPrepareCall(receiver)) return true;
      return ts.isIdentifier(receiver) && prepared.has(receiver.text);
    }
    return method === 'exec' && ts.isIdentifier(receiver) && receiver.text === 'db';
  }

  function collectPrepared(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && isPrepareCall(node.initializer)) prepared.add(node.name.text);
    ts.forEachChild(node, collectPrepared);
  }
  collectPrepared(ast);

  function visit(node) {
    if (isTargetCall(node)) {
      calls.push(node);
      let fn = node.parent;
      while (fn && !ts.isFunctionLike(fn)) fn = fn.parent;
      if (fn) functions.add(fn);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);

  const edits = [];
  for (const call of calls) {
    const alreadyAwaited = ts.isAwaitExpression(call.parent);
    if (alreadyAwaited) continue;
    const propertyResult = (ts.isPropertyAccessExpression(call.parent) && call.parent.expression === call) ||
      (ts.isElementAccessExpression(call.parent) && call.parent.expression === call);
    edits.push({ at: call.getStart(ast), text: propertyResult ? '(await (' : 'await (' });
    edits.push({ at: call.getEnd(), text: propertyResult ? '))' : ')' });
  }
  for (const fn of functions) {
    if (fn.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword)) continue;
    edits.push({ at: fn.getStart(ast), text: 'async ' });
  }
  edits.sort((a, b) => b.at - a.at);
  let updated = source;
  for (const edit of edits) updated = `${updated.slice(0, edit.at)}${edit.text}${updated.slice(edit.at)}`;
  await writeFile(file, updated);
  console.log(`${file}: awaited ${calls.length} database calls`);
}
