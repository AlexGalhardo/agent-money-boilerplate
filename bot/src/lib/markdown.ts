// Characters with meaning in Telegram's legacy "Markdown" parse mode. User
// input (names, descriptions) interpolated into such a message must be
// escaped, or a stray "_" makes Telegram reject the whole message.
const LEGACY_MARKDOWN_SPECIALS = /([_*`[])/g;

export function escapeMarkdown(text: string): string {
	return text.replace(LEGACY_MARKDOWN_SPECIALS, "$1");
}
