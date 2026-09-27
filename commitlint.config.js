// https://www.conventionalcommits.org/en/v1.0.0/ — enforced by .husky/commit-msg.
// `merge` is kept on top of the conventional types: this repo titles its
// dev -> main merge commits "merge: ..." (see CONTRIBUTING.md).
module.exports = {
	extends: ["@commitlint/config-conventional"],
	rules: {
		"type-enum": [
			2,
			"always",
			["build", "chore", "ci", "docs", "feat", "fix", "merge", "perf", "refactor", "revert", "style", "test"],
		],
	},
};
