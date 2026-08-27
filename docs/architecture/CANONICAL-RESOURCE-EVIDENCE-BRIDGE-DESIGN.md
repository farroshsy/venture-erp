# Canonical Resource Evidence Bridge

The Canonical Resource Evidence Bridge (CREB) is a tenant-scoped, read-only projection over active canonical item profiles, retained inventory movements, and retained inventory-balance snapshots. Its initial canonical resource key is `Resource:{itemMasterId}`. It reports retained on-hand, reserved, and available quantities; movement-derived quantities; item/profile and unit-evidence references; reconciliation exceptions; evidence completeness; traceability; and current readiness signals.

CREB verifies evidence only. A reconciliation exception is an observed inconsistency, not a correction instruction. It does not create a second inventory ledger; alter balances or movements; normalize or convert units; calculate valuation, cost, or COGS; amend journal proposals; create/post journals; affect the GL, tax, payroll, payments, filing, integration, or any external system.

Future asset, WIP, and investment consumers must adopt separately authorized source, policy, invariant, and effective-dated semantic contracts before they can project into CREB.
