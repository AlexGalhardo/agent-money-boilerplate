import { hashPassword } from "../src/lib/password";

const plainPassword = process.argv[2];

if (!plainPassword) {
	console.error('Uso: bun run hash-password "sua-senha"');
	process.exit(1);
}

const hash = hashPassword(plainPassword);
const base64 = Buffer.from(hash, "utf8").toString("base64");

console.log(`Hash bcrypt: ${hash}`);
console.log("\nCole em bot/.env:");
console.log(`BOT_PASSWORD_HASH_BASE64=${base64}`);
