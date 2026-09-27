/**
 * Base class for expected, user-facing failures. The global error handler in
 * `app.ts` maps any `AppError` to `{ success: false, message }` with its
 * `status`, so routes never need their own try/catch. Anything that is not an
 * `AppError` is treated as a bug: logged, and answered with a generic 500.
 */
export class AppError extends Error {
	constructor(
		message: string,
		public readonly status: number,
	) {
		super(message);
		this.name = new.target.name;
	}
}
