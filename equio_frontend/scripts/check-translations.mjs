import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const projectRoot = process.cwd();
const translationsPath = path.join(projectRoot, "src", "i18n", "translations.ts");
const sourceText = fs.readFileSync(translationsPath, "utf8");
const source = ts.createSourceFile(
  translationsPath,
  sourceText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);

function unwrap(node) {
  let current = node;
  while (
    ts.isAsExpression(current)
    || ts.isSatisfiesExpression(current)
    || ts.isParenthesizedExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function propertyName(property) {
  if (
    ts.isIdentifier(property.name)
    || ts.isStringLiteral(property.name)
    || ts.isNumericLiteral(property.name)
  ) {
    return property.name.text;
  }
  throw new Error("Translation keys must use static property names");
}

function findTranslationsObject() {
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (declaration.name.getText(source) !== "translations" || !declaration.initializer) {
        continue;
      }
      const value = unwrap(declaration.initializer);
      if (!ts.isObjectLiteralExpression(value)) {
        throw new Error("translations must be an object literal");
      }
      return value;
    }
  }
  throw new Error("translations export was not found");
}

function objectProperty(object, name) {
  const property = object.properties.find(
    (candidate) => ts.isPropertyAssignment(candidate) && propertyName(candidate) === name,
  );
  if (!property || !ts.isPropertyAssignment(property)) {
    throw new Error(`Missing translation language: ${name}`);
  }
  const value = unwrap(property.initializer);
  if (!ts.isObjectLiteralExpression(value)) {
    throw new Error(`Translation language ${name} must be an object`);
  }
  return value;
}

function collectLeaves(object, prefix = "", output = new Set()) {
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) {
      throw new Error("Translation catalogs may only contain static properties");
    }
    const name = propertyName(property);
    const key = prefix ? `${prefix}.${name}` : name;
    const value = unwrap(property.initializer);
    if (ts.isObjectLiteralExpression(value)) {
      collectLeaves(value, key, output);
    } else if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) {
      output.add(key);
    } else {
      throw new Error(`Translation ${key} must be a string or object`);
    }
  }
  return output;
}

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(entryPath);
    return /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

const root = findTranslationsObject();
const spanish = collectLeaves(objectProperty(root, "es"));
const english = collectLeaves(objectProperty(root, "en"));
const errors = [];

for (const key of spanish) {
  if (!english.has(key)) errors.push(`Missing in en: ${key}`);
}
for (const key of english) {
  if (!spanish.has(key)) errors.push(`Missing in es: ${key}`);
}

for (const file of sourceFiles(path.join(projectRoot, "src"))) {
  if (file === translationsPath) continue;
  const text = fs.readFileSync(file, "utf8");
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const fileSource = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  function visit(node) {
    if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === "t"
      && node.arguments.length > 0
      && ts.isStringLiteral(node.arguments[0])
    ) {
      const key = node.arguments[0].text;
      if (!spanish.has(key) || !english.has(key)) {
        const position = fileSource.getLineAndCharacterOfPosition(node.getStart(fileSource));
        errors.push(`${path.relative(projectRoot, file)}:${position.line + 1} unknown key: ${key}`);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(fileSource);
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Translation check passed: ${spanish.size} keys in es/en`);
