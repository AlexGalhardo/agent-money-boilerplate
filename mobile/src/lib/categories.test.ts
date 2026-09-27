import {
	categoryLabels,
	categoryOptions,
	expenseCategories,
	getCategoryColor,
	getCategoryLabel,
	incomeCategories,
} from "./categories";

describe("categories", () => {
	it("splits every category into either income or expense, with no overlap", () => {
		expect(incomeCategories.length + expenseCategories.length).toBe(categoryOptions.length);
		for (const category of incomeCategories) {
			expect(expenseCategories).not.toContain(category);
		}
	});

	it("has a portuguese label for every category", () => {
		for (const category of categoryOptions) {
			expect(categoryLabels[category]).toBeTruthy();
		}
	});

	it("returns the raw value for an unknown category label", () => {
		expect(getCategoryLabel("not-a-real-category")).toBe("not-a-real-category");
	});

	it("assigns a color to every category and falls back for unknown ones", () => {
		expect(getCategoryColor("food", "expense")).toMatch(/^#/);
		expect(getCategoryColor("salary", "income")).toMatch(/^#/);
		expect(getCategoryColor("not-a-real-category", "expense")).toBe("#71717a");
	});
});
