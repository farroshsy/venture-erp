# Contract Registry

Contracts are the only supported integration surface between bounded contexts. A contract owns a stable identifier, semantic version, compatibility status, deprecation date, owner, and consumer list. Contracts represent business capabilities, not database tables or UI payloads.

## Compatibility Rules

| Change | Contract handling |
|---|---|
| Optional endpoint, event field, or enum member that consumers can ignore | Minor release after contract test |
| Required field, removed endpoint, semantic change, or changed authorization behavior | New major version; retain prior compatible route through the migration window |
| Security patch without externally observable behavior change | Patch release with release note |

`public/erp-platform.v1.json` is the first gateway-facing contract. In a distributed deployment, each context publishes its own contract package, and the gateway binds client traffic to a supported major version.
