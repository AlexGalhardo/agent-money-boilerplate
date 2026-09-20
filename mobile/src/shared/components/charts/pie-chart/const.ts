import type { WithSpringConfig } from "react-native-reanimated";

const SPRING_CONFIG: WithSpringConfig = {
	damping: 20,
	stiffness: 260,
	mass: 1,
};

const GROW_DURATION = 900;
const MORPH_DURATION = 550;

const SLICE_COLORS = ["#4DA3FF", "#1479FF", "#0A5FE0", "#0B49B8", "#0E3596", "#122A78"] as const;

const LABEL_COLOR = "#8A8A8E";
const VALUE_COLOR = "#1C1C1E";

const START_ANGLE = 0;
const PAD_ANGLE = 0;
const INNER_RADIUS = 0;
const ACTIVE_OFFSET = 10;
const BOTTOM_INSET = 0;
const RADIUS_INSET = 4;

const TAU = Math.PI * 2;
const ANGLE_ORIGIN = -Math.PI / 2;
const EPSILON = 1e-4;

export {
	ACTIVE_OFFSET,
	ANGLE_ORIGIN,
	BOTTOM_INSET,
	EPSILON,
	GROW_DURATION,
	INNER_RADIUS,
	LABEL_COLOR,
	MORPH_DURATION,
	PAD_ANGLE,
	RADIUS_INSET,
	SLICE_COLORS,
	SPRING_CONFIG,
	START_ANGLE,
	TAU,
	VALUE_COLOR,
};
