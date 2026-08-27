import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";

const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter(path => !path.startsWith("node_modules/") && !path.startsWith("dist/") && !path.startsWith(".manus-logs/"));

const contentRules = [
  { id: "aws-access-key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: "github-token", pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ },
  { id: "slack-token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  { id: "openai-key", pattern: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { id: "private-key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
];

const violations = [];
for (const path of files) {
  const basename = path.split("/").at(-1) ?? path;
  if ((basename === ".env" || basename.startsWith(".env.")) && basename !== ".env.example") {
    violations.push({ path, rule: "tracked-environment-file" });
    continue;
  }
  if (!existsSync(path) || !statSync(path).isFile() || statSync(path).size > 1_000_000) continue;
  const source = readFileSync(path, "utf8");
  for (const rule of contentRules) {
    if (rule.pattern.test(source)) violations.push({ path, rule: rule.id });
  }
}

if (violations.length) {
  console.error(JSON.stringify({ status: "failed", scope: "Local repository baseline only; values are not printed.", violations }));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    status: "passed",
    scannedFiles: files.length,
    rules: ["tracked-environment-file", ...contentRules.map(rule => rule.id)],
    scope: "Local tracked and unignored working-tree text files under 1 MB. This is not a substitute for managed secret rotation, dependency vulnerability analysis, external scanning, or security certification.",
  }));
}
