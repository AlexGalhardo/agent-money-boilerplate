# 0003. Telegram chats link only through authenticated flows

- Status: Accepted
- Date: 2026-09-27

## Context

The audit found two account-takeover paths: linking a chat by typing an account ID into the bot, and setting any `telegramChatId` through `PUT /users/me`. Whoever controls the linked chat reads and writes the account's finances.

## Decision

A chat is linked only after the bot's e-mail/password login (rate-limited) or by redeeming a single-use, 15-minute token from an authenticated web session (`POST /telegram/link`). The profile update no longer accepts `telegramChatId`; `DELETE /telegram/link` unlinks.

## Consequences

Breaking change for users who linked by ID or chat ID — they log in from the bot instead. 2FA and Google-only accounts use the browser link.
