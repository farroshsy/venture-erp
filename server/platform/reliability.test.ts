import { describe, expect, it } from "vitest";
import { getProductionHardeningOverview } from "./reliability";

describe("Gate 1 reliability overview", () => {
  it("discloses implemented controls, per-process rate-limit limits, and unmeasured operational evidence without manufacturing an SLO result", async () => {
    const overview = await getProductionHardeningOverview({
      now: () => new Date("2026-08-27T00:00:00.000Z"),
      readinessCheck: async () => ({ ready: true, checkedAt: "2026-08-27T00:00:00.000Z", durationMs: 3, scope: "process_and_database" }),
    });

    expect(overview.posture.status).toBe("in_progress");
    expect(overview.readiness.ready).toBe(true);
    expect(overview.runtime.controls.find(control => control.key === "request_correlation")?.status).toBe("implemented");
    expect(overview.runtime.controls.find(control => control.key === "api_rate_limit")?.status).toBe("partial");
    expect(overview.runtime.controls.find(control => control.key === "telemetry_pipeline")?.status).toBe("not_measured");
    expect(overview.gates.find(gate => gate.gate === "Gate 2")?.status).toBe("blocked_by_gate_1");
    expect(overview.runtime.boundaries.noAutomaticSloAttainment).toBe(true);
  });
});
