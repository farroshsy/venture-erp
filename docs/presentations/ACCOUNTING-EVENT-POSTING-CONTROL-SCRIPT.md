## Cover

**From operational facts to controlled journal proposals**

Accounting Event → Posting Rule → Journal Proposal

Venture ERP architecture script

## Slide 1

### The financial-control gap is between operations and the ledger

- Procurement, inventory, sales, projects, and service already create tenant-scoped operational evidence.
- A mature finance backbone needs a governed way to translate those facts into accounting intent.
- The proposed engine creates traceable **journal proposals**, not autonomous postings.

**Speaker script:** Today’s ERP records operational state and supports controlled journals. The missing seam is the financial-control translation layer: how an approved operational fact becomes an explainable accounting proposal without allowing each module to invent its own ledger logic.

## Slide 2

### The control engine has four distinct ownership zones

- Source modules emit immutable internal accounting events.
- Finance owns effective-dated posting-rule revisions.
- The control engine produces a balanced proposal or refusal evidence.
- Existing finance controls remain the only route to a posted journal.

**Speaker script:** The separation is deliberate. Operations owns what happened, finance owns how it is mapped, the engine owns deterministic evaluation, and the existing journal workflow owns approval and posting. No module writes directly into the ledger.

## Slide 3

### Immutable events preserve the original accounting input

- Each event has a tenant-scoped idempotency key and source-transition reference.
- Source, dimension, and evidence snapshots are captured at emission time.
- Corrections create linked new events; historical events are never edited or deleted.

**Speaker script:** Immutability means later changes to a purchase order, customer, or project cannot silently rewrite historical accounting input. Corrections stay visible as new events, preserving a complete internal evidence trail.

## Slide 4

### Posting rules are finance-owned, effective-dated, and declarative

- A stable rule identity contains append-only revisions.
- Revisions carry effective dates, review evidence, and approval state.
- Selectors are constrained to approved accounts, dimensions, and deterministic amount sources.

**Speaker script:** We are deliberately not embedding JavaScript or SQL in finance configuration. The first rule language is small and testable: approved accounts, declared event fields, deterministic amounts, and controlled dimensions.

## Slide 5

### The engine refuses ambiguity instead of guessing

- No matching rule produces no-match evidence.
- Multiple matching approved rules, missing dimensions, or invalid accounts are refused.
- Closed periods, unbalanced lines, and unsupported currency conversion are hard stops.

**Speaker script:** A financial engine should never silently choose a default account. Ambiguity is an exception with evidence, not a reason to weaken control.

## Slide 6

### Journal proposals are reviewable artifacts, not ledger entries

- A proposal stores the event, selected rule revision, generated lines, and calculation snapshot.
- It moves through draft, review, approval, rejection, and explicit conversion states.
- Conversion uses the existing balanced-journal and period controls.

**Speaker script:** This is the central safeguard. Even a correct rule match produces a proposal first. Finance can inspect the exact inputs and expected debit/credit lines before permitting the existing journal control to create the authoritative draft.

## Slide 7

### Finance configuration is a governed workspace

- Rule register, revision timeline, constrained line editor, simulator, and proposal queue.
- Finance leads and portfolio administrators own edits, reviews, and approval evidence.
- The interface carries a permanent no-payment, no-filing, no-external-effect boundary.

**Speaker script:** The user experience is built for finance accountability. It lets finance configure and test rules without letting source-module operators or ambiguous templates create autonomous financial effects.

## Slide 8

### Currency and dimensions remain first-class controls

- Events retain transaction and functional currency plus approved FX evidence when required.
- Proposals cannot mix currencies or fabricate reporting conversion.
- Required dimensions such as cost center, project, supplier, or warehouse are explicit policy choices.

**Speaker script:** The current ERP already protects reporting currency and internal aging from mixed-currency totals. The new engine extends that discipline: no cross-currency proposal is accepted without approved FX evidence.

## Slide 9

### Delivery begins with one bounded, internal source event

- Add append-only event and rule schemas with tenant and role tests.
- Build a read-only simulator before proposal generation.
- Start with a non-statutory procurement-receipt event after finance approves the first mapping.

**Speaker script:** The sequence minimizes blast radius. We validate the control model before we connect operational modules. Payroll, tax, treasury, valuation, consolidation, and external interfaces remain out of scope.

## Slide 10

### Approval decisions required before implementation

- Finance must approve the rule DSL, dimensions, account-selector policy, and proposal review criteria.
- The first source event and its account mapping require explicit owner and evidence.
- Indonesia payroll remains draft-only and blocked pending qualified written local review.

**Speaker script:** The architecture is ready for a controlled build decision, not an automatic rollout. The next implementation step must start with finance-owned configuration policy and a bounded non-payroll source event.
