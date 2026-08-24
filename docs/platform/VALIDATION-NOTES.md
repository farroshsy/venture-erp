# Validation Notes

## 2026-08-23 — Workspace preview

The authenticated ERP workspace successfully resolved the connected account and rendered the portfolio dashboard. The initial unstyled preview was traced to missing Tailwind utility generation in the global stylesheet; `@import "tailwindcss"` was restored before final visual verification. The workspace begins with no venture records by design and exposes a venture-creation control that establishes the tenant boundary before operational workflows begin.

The corrected portfolio dashboard and module catalog both render with the intended enterprise visual system. The catalog exposes the expected eight bounded contexts with ownership, data authority, contract, release, health, maturity score, and explicitly stated missing operational evidence.

The decision-governance workbench visibly presents the six weighted build-versus-buy criteria, comparative SAP/alternative/custom scorecard, low-confidence interpretation, and mandatory human-approval controls. The architecture handbook visibly presents the gateway boundary, bounded-context topology, staged extraction roadmap, and non-negotiable data, contract, and rollback controls.

## Final release validation

The managed schema was queried after migration. The required physical tables are present as `ventures`, `venture_memberships`, `governance_cases`, and `decision_evidence_reviews` (the Drizzle schema uses camelCase TypeScript identifiers with snake_case physical table names). The project also passed TypeScript checking, the production build, 16 Vitest tests across unit and integration suites, public contract validation, and foundation verification. An authenticated browser check confirmed the portfolio dashboard still rendered after the dependency-injected router change.

### Responsive visual checks

The Portfolio, Operations, Decision Governance, and Architecture routes were captured at 375×812, 768×1024, and 1440×1000. The mobile view collapses the desktop shell into a compact top bar and stacks all dense workspace panels without horizontal clipping. The tablet view preserves readable decision criteria, domain controls, and architecture stages in a single-column layout. The desktop view uses the full workspace grid, side navigation, and two-column decision/architecture compositions. No navigation overlap, clipped text, or unsafe horizontal overflow was observed in the captured routes.

## 2026-08-23 — Enterprise control-plane upgrade validation

The executive architecture dashboard, architecture governance portal, platform catalog, architecture assistant, and access-administration workspace were captured at 1440×1000 and 375×812. At desktop size, the executive scorecard, catalog density, ADR timeline, engineering governance register, assistant policy boundary, and access-administration empty state rendered with the intended hierarchy. At the mobile breakpoint, each workspace reduced to a readable single-column sequence without horizontal clipping. The assistant and access screens correctly exposed a safe “select a venture” posture when no tenant had been created.

The complete local quality suite passed: TypeScript checking, all 23 Vitest tests, public contract validation, foundation verification, and the production build. Focused tests cover assistant membership scope, bounded conversation persistence, IAM authorization refusal, reviewable access-request creation, role/permission logic, distinct revoke-versus-suspend behavior, ADR/catalog linkage, truthful KPI posture, and prior tenant-isolation paths. The managed database was queried after the migration; `platform_roles`, `platform_permissions`, `platform_role_permissions`, `platform_access_assignments`, `access_change_requests`, and `assistant_messages` are all present.

One build advisory remains: the generated JavaScript bundle exceeds the default 500 kB warning threshold. It does not block the current build, but the roadmap should introduce route-level code splitting before the platform acquires additional operational dashboards or external integrations.

### Access lifecycle validation note

The Access Administration route was re-captured after grant, suspend, revoke, and portfolio/venture/module scope controls were added. Its desktop and mobile no-venture state correctly blocks assignment administration until a real tenant is selected, preserving the membership-first guardrail. The API and service tests cover grant, suspend, and revoke request creation plus distinct suspend/revoke effects. A browser walkthrough of the populated form and approval queue requires a real venture and member, which have not been created to avoid introducing unsolicited test data into the user’s workspace.

## 2026-08-24 — Asia sandbox job milestone

The Asia Operations API now exposes tenant-scoped sandbox job listing, queueing, and simulation routes. Queueing accepts an optional active BPMN workflow definition and operational-record reference, while simulation remains an evidence-only operation with no external transmission path. The expanded router suite passes with 34 tests, including a finance-lead queue request linked to a workflow definition and operational record.

During the latest live-preview diagnostic, the managed development server returned the root document and unauthenticated `auth.me` RPC normally after restart. However, the authenticated My Browser preview remained on the application loading shell and did not issue its expected application RPC calls. This is recorded as an outstanding browser-session/preview validation blocker; it does not invalidate the successful TypeScript check or unit coverage, but the refreshed desktop and mobile screenshots must be captured after the authenticated preview recovers.

### Physical schema verification

The initial direct schema commands timed out under TiDB Serverless despite being additive. A longer-lived, idempotent migration run then completed successfully. Read-only verification confirmed the nullable `erp_operational_records.publicBudgetNodeId` column and the complete `erp_integration_jobs` table, including its primary key and six tenant/reference foreign keys. The source migrations now use the corresponding short, MySQL/TiDB-safe foreign-key names for reproducible fresh environments.

### Cross-border workspace validation

The managed preview successfully rendered both the Asia Operations and Cross-Border Finance workspaces for `RBAC Validation Venture — 2026-08-23`. The persisted currency reference contained the eight supported Asia rollout currencies, and the cross-border form visibly presented transaction currency, functional currency, approved-rate, public-budget, accounting-period, and actual-record register controls.

In the authenticated browser walkthrough, a clearly labelled validation-only IDR/USD draft FX record was created after discovering that the exchange form’s internal default target was `USD` while the select rendered the first supported currency. It remains a **draft** and is explicitly not a market, tax, or filing rate. The default was immediately corrected in code to `CNY`, a supported rollout currency, before proceeding with further cross-border validation. No payment, filing, transfer, or statutory submission was initiated.

After reload, the Asia Operations screen loaded the persisted eight-currency profile list and displayed the intentionally unapproved validation-only draft record. The page continued to show zero approved FX rates, zero public budget nodes, and zero sandbox adapters, confirming that no operational payment, filing, or external connector capability has been enabled by this validation work.

The corrected validation-only **IDR/CNY** draft was then approved through the venture-scoped control. The Asia summary increased to one approved FX rate while sandbox adapters remained zero. The older IDR/USD validation draft remains unapproved; it was not selected for any cross-border workflow.

The real tenant-scoped service path was exercised against the migrated database using a minimally scoped, clearly named validation-only CNY public-budget node and cross-border record. The persisted record `VALIDATION-CB-IDR-CNY-20260824` is a draft finance record with transaction currency `IDR`, functional currency `CNY`, approved exchange-rate reference `30001`, calculated functional amount `45.00`, and public-budget node `1`. Its payload explicitly records `noPayment: true` and `noFiling: true`; no payment, transfer, tax filing, or statutory submission was created.

### Venture-scoped country-pack enforcement

Pack-dependent payroll calendars, payroll runs, and public-budget nodes now require both a globally approved pack and an active selection for the same venture and purpose. Focused service tests prove that an approved-but-unselected pack is rejected for both payroll and public-budget configuration, while the router suite proves that a public-budget pack reference is only forwarded through the finance-authorized venture route. The focused suite passed with 43 tests after this enforcement change.

The enforcement proof was then expanded to 46 passing tests. Service coverage rejects a selection object from a different venture as defense in depth, while router coverage verifies that both public-budget and payroll mutations surface an active-selection rejection through the tenant-scoped contract. This provides a positive enforcement boundary without treating a globally approved pack as automatically applicable to every venture.

### Sandbox adapter and job lifecycle

The real sandbox service path was exercised in the authorized validation venture using an explicitly named, credential-free validation adapter. Its health simulation gate was invoked before a job was queued against the validation cross-border record. The persisted job reached `simulated` with response evidence `simulationOutcome: accepted`, `simulationOnly: true`, and `externalTransmission: false`. It has no workflow instance because this proof intentionally validated the direct queued-to-simulated sandbox branch; no provider endpoint, banking action, transfer, filing, statutory report, or credential was used.

The browser-rendered sandbox form clearly stated that credentials are not stored and production needs a separate review. Its interactive submit did not visibly refresh the connection list during the automated click, so the service-level validation was used to isolate the contract and state-machine proof; this remains a UI-walkthrough observation for final responsive validation, not a claim that production integration is available.

### Post-restart live UI verification

After a clean development-server restart, authenticated live requests returned the correct venture-scoped FX, public-budget, operational-record, sandbox-connection, and sandbox-job lists. The Asia Operations summary rendered one approved FX rate and one sandbox adapter. The Cross-Border Finance page rendered the approved IDR/CNY evidence, the active CNY public-budget node, and the validation-only record with its saved IDR-to-CNY conversion, rate reference, functional amount, and draft status.

### Approval-gated sandbox evidence

The linked approval branch was also exercised in the same validation venture. The active workflow `VALIDATION_SANDBOX_APPROVAL_20260824` created an internal approval task for sandbox job `30001`; the task was approved before the job was simulated. The final job persisted `workflowInstanceId: 1`, `status: simulated`, `simulationOnly: true`, `externalTransmission: false`, and `simulationOutcome: accepted`. This validates the BPMN-style approval gate without contacting a provider or initiating any financial, tax, payroll, or statutory action.

### Final quality gate and responsive review

The final quality gate passed after all schema, service, router, UI, and documentation changes: TypeScript check, 46-unit-test suite, eight integration tests, contract validation, foundation verification, and production build. The responsive 375px captures rendered both Asia Operations and Cross-Border Finance without clipped controls or horizontal overflow. The production build emitted a chunk-size advisory for the main client bundle; this is a performance follow-up, not a build failure.

No end-to-end statutory payroll calculation was created because the validation venture has no reviewed and actively selected payroll jurisdiction pack. That is an intentional production prerequisite, not a missing bypass: a qualified local reviewer must supply an effective-dated, source-linked pack before the platform may rehearse a pack-dependent payroll run.

### Balanced journal workflow

The real journal service path was exercised in the authorized validation venture with an explicitly labelled open validation period and two validation-only chart-of-accounts masters. Journal `VALIDATION-JRN-20260824` persisted two narrated IDR lines—one debit and one credit—of `100.00` each and reached `posted` after the service revalidated balance and the open-period guard. This was an internal accounting-control proof only: no bank payment, external ledger transmission, filing, or statutory posting was performed.

The new finance-lead period-close action was separately exercised against an explicitly labelled empty validation period. `VALIDATION-CLOSE-2026-09` reached `closed` through the real service path and emitted its audit event. The close path rejects an already closed period and blocks a period that retains draft journals; no pre-existing or business accounting window was modified.

### Inventory movement and reservation controls

The real inventory service path was exercised in the authorized validation venture with one explicitly labelled item. A receipt of `10.000`, reservation of `3.000`, and issue of `4.000` produced an on-hand balance of `6.000`, reserved balance of `3.000`, and available balance of `3.000`. Each immutable movement recorded its own post-operation quantities and audit evidence. The validation did not connect a WMS, barcode/RFID device, supplier, carrier, or external warehouse.

### Approved purchase-order receiving

The procurement-to-inventory receipt path was exercised with a clearly labelled validation-only purchase order. `VALIDATION-PO-20260824` progressed from draft through approval, then its final receipt created linked inventory movement `30001` for `2.000` units and set the purchase-order status to `fulfilled`. The resulting validation item balance became `8.000` on hand and `3.000` reserved. No supplier payment, e-invoice, customs filing, supplier-portal interaction, or external inventory system was contacted.

The authenticated Inventory Control route rendered the persisted validation item, its on-hand/reserved/available values, and each receipt, reservation, and issue movement. The Procurement Control route rendered the receipt form and an empty eligible queue after the validation order became fulfilled, which is the intended control behavior: fulfilled orders cannot be received again.

### Work-control lifecycle

The domain-specific Work Control workspace was exercised through the real project-task lifecycle using clearly labelled record `VALIDATION-PROJECT-TASK-20260824`. The tenant-scoped record progressed through pending approval, approved, posted, fulfilled, and closed states and retained its audit trail. This validation did not create payroll, employee, customer, asset, or service fixtures, and did not involve an external work-management system.

### Transaction-specific increment quality gate

The journal, period-close, inventory, purchase-order receipt, and work-control increment passed TypeScript checking, the 51-test suite, eight integration tests, contract validation, foundation verification, and a production build. The production build continues to emit a client bundle-size advisory; route-level code splitting remains recorded as a performance follow-up before broad rollout.

### Invoice and internal payment evidence

The real receivables control path was exercised in the authorized validation venture with a clearly labelled customer, receivable invoice, and internal payment-evidence record. `VALIDATION-AR-20260824` reached `posted` with total `100.00`; linked posted evidence `VALIDATION-PAY-EVIDENCE-20260824` accounted for `60.00`, leaving an internally calculated open amount of `40.00`. The operation did not issue a collection, debit a customer, send a payment file, or contact a payment processor, bank, tax authority, or other external party.

The authenticated Cash Control workspace rendered the validation customer, the posted invoice, linked internal evidence input path, and settlement register showing total `100`, settled `60`, and open `40`. Its visible copy retained the no-payment-rail and no-external-settlement boundary.

### Operational insights dashboard

The authenticated Operational Insights workspace rendered only persisted validation-venture data: receivable open `40`, inventory available `5`, one tracked inventory balance with `8` on hand and `3` reserved, one posted internal payment-evidence record, and one fulfilled purchase order. The page explicitly distinguishes operational metrics from bank balances, filing status, and external-system claims.

### Route-loading performance

The route registry now lazy-loads operational workspaces and separates React, UI, data/runtime, and remaining vendor code. The production build now emits an entry chunk of approximately `35.5 kB` and a largest vendor chunk of approximately `401.0 kB`, with all routed operational pages emitted as separate chunks; the previous 500 kB advisory no longer appears.

The receivables, internal-payment-evidence, operational-insights, and performance increment passed TypeScript checking, the 52-test suite, eight integration tests, contract validation, foundation verification, and a production build with route and vendor chunks.

### Visual automation workbench

The real workflow service path was exercised in the authorized validation venture with an explicitly labelled visual automation definition. `validation_visual_automation_20260824` was persisted, activated, started, and completed through its assigned human task `30001`, which ended with status `approved`. The instance context was explicitly marked validation-only with no external effect; no webhook, script, payment, filing, provider call, or external transmission was involved.

The lazy-loaded Automation Workbench route resolved successfully in the authenticated validation venture and listed the three persisted validation definitions. Its initial canvas state correctly required selecting a saved definition before rendering a process diagram or live task evidence.

The completed Workbench now selects the newest saved definition after load and rendered the isolated rejection-path definition `validation_visual_automation_rejection_20260824`. The page showed its three-node directed process, active status, instance `60001` with status `rejected`, task `60001` assigned to user `1` with status `rejected`, and the related workflow audit sequence: `workflow.created`, `workflow.activated`, `workflow.started`, and `workflow.task_completed`. Focused router coverage also proved tenant-scoped instance listing and forwarding of a rejected task outcome with the authenticated actor identity. This proof is internal, validation-only, and produced no external side effect.

### Scoped access lifecycle

The authenticated Access Administration workspace rendered the active validation venture, the scoped member/role/action/scope/module controls, and the access-review queue. A validation-only module-scoped `module_operator` assignment for the existing validation-venture administrator was requested and applied as a grant, then requested and applied as a suspension, and finally requested and applied as a revoke. The persisted review queue visibly retained three applied records named `VALIDATION-ACCESS-LIFECYCLE-20260824:grant`, `:suspend`, and `:revoke`, all scoped to the `finance` module. The final matching scoped-assignment count was `0`; venture membership itself was not changed, and no unrelated operational data, external integration, payment, filing, or user account was created.

To isolate the remaining browser-driven proof, `ACCESS ONLY VALIDATION VENTURE — 2026-08-24` was created through the in-app tenant-boundary control with its owner membership only. The authenticated Access Administration route resolved this venture through a membership-validated `venture=30001` selection and displayed an empty access directory and review queue before lifecycle requests were created.

The isolated route then loaded the active scope, its sole owner membership, the policy role catalog, the scoped access-change controls, and the empty request/assignment panels in the browser. No operational records or integration configuration were created in this venture.

The browser then submitted the isolated venture-scope grant request with rationale `VALIDATION-UI-GRANT: grant a reviewable architecture reviewer role only within this isolated venture.` Read-only database verification confirmed request `30001` persisted as `pending` for `architecture_reviewer` before any apply action was attempted.

After reload, the browser rendered the same request as `PENDING` in the isolated venture review queue and exposed its distinct `Apply reviewed grant` control. The assignment register still showed no scoped assignment at that pending stage, preserving the separate request-and-review lifecycle.

The browser then applied that reviewed grant. The queue rendered `APPLIED`, and the isolated tenant access directory rendered the resulting `Architecture reviewer` venture-scoped assignment with status `ACTIVE` for the validation-venture owner.

The access form was refined with explicit Grant, Suspend, and Revoke action controls so each lifecycle intent is directly reachable without relying on native selector behavior. The form continued to display the isolated tenant’s sole owner, the `Architecture reviewer` role, the venture scope, and the active assignment before the suspension path was requested.

The browser then created a separate `VALIDATION-UI-SUSPEND` request for that same isolated venture-scoped reviewer assignment. The review queue rendered it as `PENDING` beside the already applied grant, while the access directory correctly remained `ACTIVE` until the pending suspension received its own explicit apply action.

The browser subsequently applied the isolated suspension. Both the grant and suspension requests rendered `APPLIED`, and the access directory retained the reviewer assignment with status `SUSPENDED`, proving that suspension preserves its audit record while disabling the scoped assignment.

With the reviewer assignment visibly `SUSPENDED`, the browser returned to the isolated form where the explicit Revoke action remained available against the same role and venture scope. This final request is intended to remove only the validation assignment while retaining the lifecycle review record.

The browser submitted `VALIDATION-UI-REVOKE` as a distinct `PENDING` request. At this point the directory correctly still showed the reviewer assignment as `SUSPENDED`; the separate visible `Apply reviewed revoke` control enforced the final review boundary before deletion.

The browser applied the final revoke. The isolated access directory returned to its empty scoped-assignment state, while the review queue retained three independently `APPLIED` records for `VALIDATION-UI-GRANT`, `VALIDATION-UI-SUSPEND`, and `VALIDATION-UI-REVOKE`. This completes the UI-driven grant → pending review → apply → active assignment → suspension → revoke lifecycle in a separate access-only validation tenant. The owner’s venture membership remained active throughout; no external integration, payment, filing, payroll, or operational transaction was created.

Desktop and mobile captures confirmed that the explicit action controls, form fields, assignment register, and review cards remain visible in the responsive layout. The final quality gate passed: 18 unit test files / 53 tests, 4 integration test files / 8 tests, contract validation, foundation verification, and the production build. The production build retained lazy route splitting; the Access Administration route chunk measured approximately 30.7 kB before compression, and the largest shared vendor chunk remained approximately 401.0 kB without a bundle advisory.

### Controlled sales-order reservation and fulfillment

The tenant-scoped Sales Control workspace was added with a draft sales-order register, approval progression, approved-order inventory reservation, and final internal fulfillment controls. It explicitly states that it does not ship goods, issue invoices, collect payments, or call logistics providers. The server requires a sales-domain `sales_order` in `approved` or `posted` status, uses only inventory reservations linked to that order, updates stock in one transaction, and emits sales audit events for reservation and fulfillment.

The authorized operational validation venture used existing clearly labelled customer `VALIDATION-CUSTOMER-20260824` and item `VALIDATION-ITEM-20260824` to create `VALIDATION-SALES-ORDER-20260824`. The order progressed from draft to approved, reserved one item unit, then reached `fulfilled` through a final internal fulfillment action. Durable order-linked movements were `reserve`, `release`, and `issue`, and the sales audit trail included `sales_order.inventory_reserved` and `sales_order.inventory_fulfilled`. No shipment, carrier dispatch, invoice, payment, tax filing, statutory submission, or external provider call was created.

Desktop and 375px mobile captures showed the Sales Control boundary, order form, stock controls, and fulfilled validation order in a readable layout without horizontal overflow. The final increment quality gate passed: 18 unit test files / 54 tests, 4 integration test files / 8 tests, contract validation, foundation verification, and the production build. The lazy-loaded Sales Control route emitted as an approximately 26.0 kB pre-compression chunk, while the largest vendor chunk remained approximately 401.0 kB without a build advisory.

### Event-configured automation trigger

The Automation Workbench now persists an optional explicit operational-record transition trigger on a workflow definition. When an active definition’s trigger matches a tenant-scoped record transition, the service starts only an internal workflow instance and human task, records `workflow.event_triggered`, and adds `noExternalEffect: true` to the event context. It does not invoke a script, webhook, provider, payment, shipping, filing, or external message.

The real validation proof created and activated `validation_sales_event_trigger_20260824`, configured for `sales / sales_order → approved`, then advanced `VALIDATION-EVENT-SALES-ORDER-20260824` to approval. The persisted result was workflow instance `90001` with a pending task assigned to user `1` and one `workflow.event_triggered` audit event. The authenticated browser rendered the trigger condition, active instance, pending human task, and audit sequence together in the Workbench.

Desktop and 375px mobile captures showed the event condition, process diagram, active instance, pending task, and audit evidence without page-level horizontal overflow; the diagram remains intentionally horizontally scrollable when its nodes exceed the available viewport. The final increment quality gate passed: 18 unit test files / 55 tests, 4 integration test files / 8 tests, contract validation, foundation verification, and the production build. The Automation Workbench chunk measured approximately 36.9 kB before compression, and the largest shared vendor chunk remained approximately 401.0 kB without a build advisory.

### Read-only transaction lifecycle integration coverage

The integration suite now includes a read-only database test against the deliberately retained validation evidence. It verifies that the fulfilled validation sales order has order-linked `reserve`, `release`, and `issue` movements plus reservation and fulfillment audit events; that the approved event-trigger sales order has an active workflow instance, pending assigned task, and `workflow.event_triggered` evidence; and that the fulfillment record is absent from the separate access-only venture. The test creates, updates, and deletes no records. It passed with 5 integration test files and 9 tests.

The complete post-test quality gate passed with 19 unit test files / 56 tests, 5 integration test files / 9 tests, contract validation, foundation verification, and the production build.
