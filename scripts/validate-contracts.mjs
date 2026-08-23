import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const directory = resolve("contracts/public");
const files = (await readdir(directory)).filter(file => file.endsWith(".json"));

if (files.length === 0) {
  throw new Error("No public contract files were found.");
}

for (const file of files) {
  const contract = JSON.parse(await readFile(resolve(directory, file), "utf8"));
  const required = ["contractId", "version", "owner", "compatibility", "operations"];
  const missing = required.filter(key => !(key in contract));
  if (missing.length > 0) {
    throw new Error(`${file} is missing required contract fields: ${missing.join(", ")}`);
  }
  if (!Array.isArray(contract.operations) || contract.operations.length === 0) {
    throw new Error(`${file} must declare at least one operation.`);
  }
  if (!/^\d+\.\d+\.\d+$/.test(contract.version)) {
    throw new Error(`${file} must use semantic versioning.`);
  }
}

console.log(`Validated ${files.length} public service contract(s).`);
