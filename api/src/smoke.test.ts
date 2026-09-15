import { describe, expect, it } from "bun:test";
import { app } from "./server";

describe("smoke", () => {
	it("boots the app and serves the health check", async () => {
		const response = await app.handle(new Request("http://localhost/"));
		expect(response.status).toBe(200);
	});

	it("serves the OpenAPI docs page", async () => {
		const response = await app.handle(new Request("http://localhost/docs"));
		expect(response.status).toBe(200);
	});

	it("returns 404 for an unknown route", async () => {
		const response = await app.handle(new Request("http://localhost/this-route-does-not-exist"));
		expect(response.status).toBe(404);
	});
});
