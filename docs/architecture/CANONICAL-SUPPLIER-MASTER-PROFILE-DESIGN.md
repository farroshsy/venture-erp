# Canonical Supplier-Master Profile Design

**Status:** Implemented as tenant-scoped supplier identity and procurement-evidence metadata only.

Each profile attaches once to an active tenant supplier master and retains a declared counterparty type, procurement scope, identity-evidence reference, procurement-evidence reference, onboarding posture, lifecycle, attributes, and audit attribution. Finance-authorized users may create a draft or activate it; any active venture member may read it.

The profile does **not** contact a supplier, send or approve a purchase order, assess a supplier, determine tax, price or value goods, calculate COGS, create a journal, mutate a balance, execute payment, file, integrate, or create any external effect. Identity and procurement references are bounded internal evidence labels, not legal/KYC/tax certification or external validation.

Future supplier onboarding, approval, site/address, banking, tax, contract, performance, payment, integration, and revision/supersession controls require separate effective-dated evidence and authorization designs.
