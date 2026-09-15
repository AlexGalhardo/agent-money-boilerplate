import { redirect } from "@tanstack/react-router";
import { getServerSession } from "./server-session";

export async function redirectIfAuthenticated() {
	const session = await getServerSession();

	if (session) {
		throw redirect({ to: "/dashboard" });
	}
}
