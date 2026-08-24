# ADR-008: Evidence-Bounded Architecture Assistant

**Status:** Accepted  
**Date:** 2026-08-23  
**Decision owner:** Enterprise Architecture

## Context

An enterprise assistant must be useful without becoming a generic chatbot, a cross-tenant data leak, or an autonomous actor. The system must make the evidence, uncertainty, and scope behind a response visible to a human operator.

## Decision

The assistant runs server-side and resolves active venture membership before any retrieval. It assembles a bounded evidence packet from the accessible venture’s governance cases and platform-level catalog/ADR records, requests structured output, filters cited evidence IDs to the packet, and records the conversation inside the same venture scope. It cannot browse public sources, use tools, alter access, approve decisions, or write operating records.

| Control | Why it exists |
|---|---|
| Membership check before retrieval | Prevents a question from becoming a cross-venture lookup. |
| Structured response with citations, assumptions, gaps, and actions | Lets a human distinguish grounded evidence from inference. |
| Read-only API | Prevents a model answer from being interpreted as authorization or approval. |
| Conversation persistence with evidence metadata | Supports review, retention policy, and later safety investigation. |
| No external web tool | Avoids mixing unsanctioned public content into platform governance advice. |

## Consequences

The assistant may answer “insufficient evidence” more often than a generic chatbot. This is intentional. Its usefulness depends on catalog and ADR maintenance, and its cost depends on question volume and model selection. The immediate rollback is to disable the assistant router while preserving the stored, tenant-scoped evidence record for review.
