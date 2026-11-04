import { existsSync } from "node:fs";
import path from "node:path";
import request from "supertest";
import { app, webStaticRoot } from "./app.js";

describe("static root", () => {
  it("points at apps/web (not repo-root web/)", () => {
    expect(webStaticRoot.endsWith(`${path.sep}apps${path.sep}web`)).toBe(true);
    expect(existsSync(path.join(webStaticRoot, "index.html"))).toBe(true);
  });
});

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.timestamp).toBe("string");
    expect(Number.isNaN(Date.parse(res.body.timestamp))).toBe(false);
  });
});
