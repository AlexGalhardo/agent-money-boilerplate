import {
	Banknote,
	Bus,
	CreditCard,
	Film,
	Gift,
	GraduationCap,
	Heart,
	Home,
	Landmark,
	PiggyBank,
	Repeat,
	Shield,
	ShoppingBag,
	Sparkles,
	Trophy,
	UtensilsCrossed,
	Wallet,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import type { TransactionCategory } from "./categories";

const categoryIconComponents: Record<TransactionCategory, ComponentType<SVGProps<SVGSVGElement>>> = {
	food: UtensilsCrossed,
	transport: Bus,
	housing: Home,
	health: Heart,
	education: GraduationCap,
	entertainment: Film,
	shopping: ShoppingBag,
	salary: Wallet,
	investment: PiggyBank,
	rental_income: Landmark,
	extra_income: Banknote,
	gifts: Gift,
	prizes: Trophy,
	transfers: Repeat,
	credit_card_bill: CreditCard,
	insurance: Shield,
	other: Sparkles,
};

export function CategoryIcon({ category, className }: { category: string; className?: string }) {
	const Icon =
		category in categoryIconComponents ? categoryIconComponents[category as TransactionCategory] : Sparkles;
	return <Icon className={className} aria-hidden="true" />;
}
