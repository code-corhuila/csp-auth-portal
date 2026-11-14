// Compares src/contract/auth-service.requirements.json with the auth contract (csp-docs, auth-service.yaml).
// Usage: AUTH_CONTRACT_FILE=<path to auth-service.yaml> node scripts/check-contract.mjs
// The contract is read line by line (no YAML dependency): an operation is a method under a path, and a header is
// required when the operation lists the shared parameter `IdempotencyKey` (declared `required: true` in _shared.yaml).
import { readFileSync } from 'node:fs';

const file = process.env.AUTH_CONTRACT_FILE;
if (!file) {
  console.error('AUTH_CONTRACT_FILE is not set: the check needs the approved contract of csp-docs.');
  process.exit(2);
}

const mirror = JSON.parse(readFileSync(new URL('../src/contract/auth-service.requirements.json', import.meta.url), 'utf8'));
const lines = readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n');

const operations = new Map();
let inPaths = false;
let path = null;
let current = null;
for (const line of lines) {
  if (/^paths:/.test(line)) {
    inPaths = true;
    continue;
  }
  if (inPaths && /^\S/.test(line) && !/^paths:/.test(line)) {
    inPaths = false;
  }
  if (!inPaths) {
    continue;
  }
  const pathMatch = /^ {2}(\/\S*):\s*$/.exec(line);
  if (pathMatch) {
    path = pathMatch[1];
    current = null;
    continue;
  }
  const methodMatch = /^ {4}(get|post|put|patch|delete):\s*$/.exec(line);
  if (methodMatch) {
    current = { method: methodMatch[1].toUpperCase(), path, operationId: null, headers: [] };
    operations.set(`${current.method} ${path}`, current);
    continue;
  }
  if (!current) {
    continue;
  }
  const idMatch = /^ {6}operationId:\s*(\w+)/.exec(line);
  if (idMatch) {
    current.operationId = idMatch[1];
  }
  if (/components\/parameters\/IdempotencyKey/.test(line)) {
    current.headers.push('Idempotency-Key');
  }
}

const problems = [];
for (const expected of mirror.operations) {
  const found = operations.get(`${expected.method} ${expected.path}`);
  if (!found) {
    problems.push(`${expected.method} ${expected.path} (${expected.operationId}) is not in the contract`);
    continue;
  }
  if (found.operationId !== expected.operationId) {
    problems.push(`${expected.method} ${expected.path}: operationId is ${found.operationId}, the table says ${expected.operationId}`);
  }
  const want = [...expected.requiredHeaders].sort().join(',');
  const have = [...found.headers].sort().join(',');
  if (want !== have) {
    problems.push(`${expected.method} ${expected.path}: the contract requires headers [${have}], the table says [${want}]`);
  }
}

if (problems.length > 0) {
  console.error(`contract check FAILED (${problems.length} problem(s)):`);
  problems.forEach(problem => console.error(` - ${problem}`));
  process.exit(1);
}
console.log(`contract check passed: ${mirror.operations.length} operations match ${file}`);
