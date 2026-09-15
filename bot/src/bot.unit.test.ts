import { describe, expect, it } from "bun:test";
import { createBot } from "./bot";

describe("createBot", () => {
	it("builds a Bot instance wired with the configured token, without starting polling", () => {
		const bot = createBot();

		expect(bot.token).toBe("test-token-not-real");
	});
});
