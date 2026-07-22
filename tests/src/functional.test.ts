import { describe, it, expect } from "vitest";

const FRONTEND = "http://localhost:8080";
const CONSUL = "http://localhost:8500";

let jwt: string;

describe("Rede Social de Emojis — Testes Funcionais", () => {
  describe("Consul", () => {
    it("tem líder eleito", async () => {
      const res = await fetch(`${CONSUL}/v1/status/leader`);
      expect(res.ok).toBe(true);
    });

    it("auth-service registrado e saudável", async () => {
      const res = await fetch(`${CONSUL}/v1/health/service/auth-service?passing=true`);
      const data = await res.json() as unknown[];
      expect(data.length).toBeGreaterThan(0);
    });

    it("posts-service registrado e saudável", async () => {
      const res = await fetch(`${CONSUL}/v1/health/service/posts-service?passing=true`);
      const data = await res.json() as unknown[];
      expect(data.length).toBeGreaterThan(0);
    });
  });

  describe("Auth JWT", () => {
    it("gera token via service discovery", async () => {
      const res = await fetch(`${FRONTEND}/api/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "test-001" }),
      });
      expect(res.ok).toBe(true);
      const data = await res.json() as { token: string };
      expect(data.token.split(".")).toHaveLength(3);
      jwt = data.token;
    });
  });

  describe("Posts", () => {
    it("envia emoji → 201", async () => {
      const res = await fetch(`${FRONTEND}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ emoji: "🔥" }),
      });
      expect(res.status).toBe(201);
      const data = await res.json() as { success: boolean };
      expect(data.success).toBe(true);
    });

    it("feed contém emoji", async () => {
      const res = await fetch(`${FRONTEND}/api/feed`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const data = await res.json() as { feed: Array<{ emoji: string }> };
      expect(data.feed[0]?.emoji).toBe("🔥");
    });

    it("sem JWT → 401", async () => {
      const res = await fetch(`${FRONTEND}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji: "😍" }),
      });
      expect(res.status).toBe(401);
    });
  });
});
