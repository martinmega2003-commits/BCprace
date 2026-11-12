import { describe, expect, it } from "vitest";
import { vytvorLimiter } from "@/lib/rateLimit";

describe("rate limit", () => {
    it("pusti 3 pozadavky a ctvrty zablokuje", () => {
        const smiProjit = vytvorLimiter(3, 60_000);
        expect(smiProjit("1.2.3.4")).toBe(true);
        expect(smiProjit("1.2.3.4")).toBe(true);
        expect(smiProjit("1.2.3.4")).toBe(true);
        expect(smiProjit("1.2.3.4")).toBe(false);
});
});
