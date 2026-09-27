import { describe, expect, it } from "bun:test";
import { escapeMarkdown } from "./markdown";

describe("escapeMarkdown", () => {
	it("escapes every legacy Markdown control character", () => {
		expect(escapeMarkdown("a_b*c`d[e")).toBe("a_b*c`d[e");
	});

	it("leaves plain text untouched", () => {
		expect(escapeMarkdown("Maria Silva")).toBe("Maria Silva");
	});
});
