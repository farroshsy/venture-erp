import { access } from "node:fs/promises";
import { resolve } from "node:path";

const required = [
  "docs/adr/ADR-001-microservices-first-evolution.md",
  "docs/architecture/BOUNDED-CONTEXTS.md",
  "docs/platform/SERVICE-MATURITY.md",
  "contracts/public/erp-platform.v1.json",
  "infra/README.md",
];

for (const file of required) {
  await access(resolve(file));
}

console.log("Foundation artifacts are present. Production rollout verification must additionally run the deployed service health probe and contract smoke suite.");
