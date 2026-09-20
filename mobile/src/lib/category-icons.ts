import type { Feather } from "@expo/vector-icons";
import type { ComponentProps } from "react";

import type { TransactionCategory } from "./categories";

// Mobile-only presentational mapping (unlike categoryLabels/categoryColor,
// this doesn't need to stay in sync with backend/frontend/bot - there's no
// "icon" concept on the API side, it's purely how the mobile UI renders a
// category). See docs/code-conventions.md for the fields that DO need to
// stay in sync across workspaces.
type FeatherIconName = ComponentProps<typeof Feather>["name"];

export const categoryIcon: Record<TransactionCategory, FeatherIconName> = {
	food: "coffee",
	transport: "truck",
	housing: "home",
	health: "heart",
	education: "book-open",
	entertainment: "film",
	shopping: "shopping-bag",
	salary: "briefcase",
	investment: "trending-up",
	rental_income: "key",
	extra_income: "plus-circle",
	freelancer: "monitor",
	gifts: "gift",
	prizes: "award",
	transfers: "repeat",
	credit_card_bill: "credit-card",
	insurance: "shield",
	other: "more-horizontal",
};
