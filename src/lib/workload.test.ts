import { describe, it, expect } from "vitest";
import { lessonsFromHours } from "./workload";
describe("aulas de 45 min", () => {
  it("60h = 80 aulas", () => expect(lessonsFromHours(60)).toBe(80));
  it("30h = 40 aulas", () => expect(lessonsFromHours(30)).toBe(40));
});
