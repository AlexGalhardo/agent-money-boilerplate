import type { ComponentType } from "react";

function createCompoundComponent<
	// biome-ignore lint/suspicious/noExplicitAny: bounding T to ComponentType<any> (not <unknown>) is required for TS to accept any concrete FC<Props> here; the real Props type still flows through via T in the return type below, so this never widens what callers see.
	T extends ComponentType<any>,
	TCompound extends Record<string, unknown> = Record<string, never>,
>(name: string, component: T, compound: TCompound = {} as TCompound): T & TCompound {
	component.displayName = name;

	return Object.assign(component, compound);
}

export { createCompoundComponent };
