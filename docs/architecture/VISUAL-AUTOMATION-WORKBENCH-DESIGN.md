# Visual Automation Workbench Design

**Status:** Implementation design  
**Scope:** Tenant-scoped BPMN-style process visualization, template-backed definitions, controlled activation, workflow instances, human approval tasks, exception outcomes, and audit visibility.

## Design intent

The workbench must make the existing workflow model operationally legible without introducing an unsafe general-purpose code execution engine. Workflow definitions remain explicit node-and-transition documents; the visual layer renders those persisted documents as a BPMN-inspired directed flow. Activation, instance creation, and task completion continue through the typed server contract with venture membership and operational-role checks.

| Capability | Delivered boundary | Explicitly excluded |
|---|---|---|
| Process design | Template-backed start, task, approval, gateway, and end nodes with labelled transitions. | Arbitrary scripts, webhooks, or unreviewed expressions. |
| Execution | Activated definitions create tenant-scoped instances and pending human tasks. | Automatic external payment, filing, or credentialed provider calls. |
| Exception handling | Approval rejection and explicit task outcomes persist an auditable rejected/completed state. | Silent retry loops or production side effects. |
| Visualization | SVG-like layout generated from persisted node/transition JSON, with status evidence from instances/tasks. | A claim of complete BPMN 2.0 notation or interchange compatibility. |

> Workflow automation in this increment remains **human-gated and evidence-oriented**. Sandbox integration jobs may attach to a completed approval workflow, but no visual action enables external transmission.

## Controlled template set

The initial workbench exposes three plainly labelled templates: expense approval, procurement receipt approval, and sandbox-adapter approval. They are defaults a venture operator may inspect and adjust before creation; none is silently activated or applied to a business record.

## Implemented execution surface

The workbench now lists tenant-scoped workflow instances for the selected definition and joins their human tasks by workflow-instance identifier. Operators can start an instance only after deliberate activation, then use the typed task contract to approve, reject, or complete a pending human task. Every successful state change invalidates the workflow definition, instance, task, and audit queries so the rendered status is the persisted state rather than an optimistic display.

| Rendered evidence | Source | Control boundary |
|---|---|---|
| Definition diagram and activation state | Persisted workflow definition | Definition creation and activation require operational role checks; activation additionally requires venture-lead or portfolio-admin authority. |
| Instance status and creation time | Tenant-scoped workflow instances | The list query verifies venture membership before data is returned. |
| Task title, assignee, node, and outcome | Tenant-scoped workflow tasks | Approve, reject, and complete actions use the typed `completeTask` procedure and carry the authenticated actor. |
| Exception history | Workflow audit events | Rejection remains visible as both the persisted task/instance status and `workflow.task_completed` audit evidence. |

The initial selected definition defaults to the newest saved definition after the list query resolves. This removes the empty-canvas dead end while preserving the ability to switch definitions explicitly. The workbench still does not execute webhooks, scripts, payments, statutory filings, provider calls, or other external actions.
