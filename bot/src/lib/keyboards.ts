import type { TransactionCategory } from "@agent-money-boilerplate/backend/src/modules/transactions/transaction.schema";
import { transactionCategories } from "@agent-money-boilerplate/backend/src/modules/transactions/transaction.schema";
import { InlineKeyboard } from "grammy";
import { categoryLabels } from "../formatting/format";
import { chunk } from "./chunk";

const CATEGORY_PREFIX = "cat:";

export function categoryKeyboard(): InlineKeyboard {
	const keyboard = new InlineKeyboard();
	for (const row of chunk(transactionCategories, 2)) {
		for (const category of row) keyboard.text(categoryLabels[category], `${CATEGORY_PREFIX}${category}`);
		keyboard.row();
	}
	return keyboard;
}

/** Parses a `categoryKeyboard()` callback, rejecting anything that isn't a known category. */
export function parseCategoryCallback(data: string): TransactionCategory | null {
	if (!data.startsWith(CATEGORY_PREFIX)) return null;
	const value = data.slice(CATEGORY_PREFIX.length);
	return (transactionCategories as readonly string[]).includes(value) ? (value as TransactionCategory) : null;
}
