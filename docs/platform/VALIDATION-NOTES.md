# Validation Notes

## 2026-08-23 — Workspace preview

The authenticated ERP workspace successfully resolved the connected account and rendered the portfolio dashboard. The initial unstyled preview was traced to missing Tailwind utility generation in the global stylesheet; `@import "tailwindcss"` was restored before final visual verification. The workspace begins with no venture records by design and exposes a venture-creation control that establishes the tenant boundary before operational workflows begin.

The corrected portfolio dashboard and module catalog both render with the intended enterprise visual system. The catalog exposes the expected eight bounded contexts with ownership, data authority, contract, release, health, maturity score, and explicitly stated missing operational evidence.

The decision-governance workbench visibly presents the six weighted build-versus-buy criteria, comparative SAP/alternative/custom scorecard, low-confidence interpretation, and mandatory human-approval controls. The architecture handbook visibly presents the gateway boundary, bounded-context topology, staged extraction roadmap, and non-negotiable data, contract, and rollback controls.

## Final release validation

The managed schema was queried after migration. The required physical tables are present as `ventures`, `venture_memberships`, `governance_cases`, and `decision_evidence_reviews` (the Drizzle schema uses camelCase TypeScript identifiers with snake_case physical table names). The project also passed TypeScript checking, the production build, 16 Vitest tests across unit and integration suites, public contract validation, and foundation verification. An authenticated browser check confirmed the portfolio dashboard still rendered after the dependency-injected router change.

### Responsive visual checks

The Portfolio, Operations, Decision Governance, and Architecture routes were captured at 375×812, 768×1024, and 1440×1000. The mobile view collapses the desktop shell into a compact top bar and stacks all dense workspace panels without horizontal clipping. The tablet view preserves readable decision criteria, domain controls, and architecture stages in a single-column layout. The desktop view uses the full workspace grid, side navigation, and two-column decision/architecture compositions. No navigation overlap, clipped text, or unsafe horizontal overflow was observed in the captured routes.
