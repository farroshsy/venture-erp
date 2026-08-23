# Infrastructure and Delivery Policy

`infra/` is reserved for environment-independent infrastructure as code, service deployment manifests, policy definitions, and observability configuration. The foundation does not fabricate a deployment topology that the current managed runtime cannot host. Instead, it defines the portable controls that any extracted service must satisfy.

The continuous-delivery template requires static analysis, unit and contract tests, production build, dependency audit, and deployment verification. A future extracted service adds its own IaC module, database migration plan, secret manifest names, alert policy, and rollback route while retaining the shared quality gates.
