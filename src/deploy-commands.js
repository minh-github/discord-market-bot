import "dotenv/config";
import { REST, Routes } from "discord.js";
import { commands } from "./commands.js";

const { BOT_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!BOT_TOKEN || !CLIENT_ID || !GUILD_ID) {
	throw new Error("Thiếu BOT_TOKEN, CLIENT_ID hoặc GUILD_ID trong .env");
}

const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);

async function main() {
	await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
		body: commands,
	});

	console.log("✅ Đã deploy slash commands cho guild test");
}

main().catch((err) => {
	console.error("❌ Deploy commands lỗi:", err);
	process.exit(1);
});
