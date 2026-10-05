import { describe, it, expect } from "vitest";
import { initialState } from "../../frontend/src/domain/fixtures";
import {
  assignTeam,
  scenarioEvidence,
  transitionIncident,
} from "../../frontend/src/domain/engine";
describe("critical demo workflow rules", () => {
  it("rejects a noisy spike and stale evidence", () => {
    const rules = initialState().rules;
    expect(scenarioEvidence("spike", 99, rules).gate).toBe(false);
    expect(scenarioEvidence("stale", 99, rules).score).toBeNull();
  });
  it("requires configured persistence and supporting sources", () => {
    const rules = initialState().rules;
    expect(scenarioEvidence("rising", 2, rules).gate).toBe(false);
    expect(scenarioEvidence("rising", 4, rules).gate).toBe(true);
  });
  it("prevents double assignment and releases a resolved team", () => {
    let s = assignTeam(initialState(), "RG-1042", "R-03");
    expect(() => assignTeam(s, "RG-1042", "R-04")).toThrow();
    s = transitionIncident(s, "RG-1042", "En route");
    s = transitionIncident(s, "RG-1042", "On scene");
    s = transitionIncident(s, "RG-1042", "Resolved");
    expect(s.resources.find((r) => r.id === "R-03")?.status).toBe("Available");
  });
  it("rejects unsuitable agencies", () => {
    expect(() => assignTeam(initialState(), "RG-1042", "R-04")).toThrow(
      "suitable",
    );
  });
});
