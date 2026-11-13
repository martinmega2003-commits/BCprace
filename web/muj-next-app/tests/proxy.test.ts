import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "@/proxy";

function pozadavek(xForwardedFor: string) {
  return new NextRequest("http://localhost/api/hello", {
    headers: { "x-forwarded-for": xForwardedFor },
  });
}

describe("proxy (rate limit na vstupu API)", () => {
  it("podvrzena IP na zacatku x-forwarded-for neobejde limit", () => {
    // utocnik posila pokazde jinou falesnou IP, Azure na konec pripise tu skutecnou (9.9.9.9)
    for (let i = 0; i < 60; i++) {
      const odpoved = proxy(pozadavek(`10.0.0.${i}, 9.9.9.9`));
      expect(odpoved.status).not.toBe(429);
    }

    // 61. pozadavek ze stejne skutecne IP -> zablokovan, i kdyz falesna IP je zase nova
    expect(proxy(pozadavek("10.0.0.200, 9.9.9.9")).status).toBe(429);
  });
});
