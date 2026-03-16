import "dotenv/config";
import cron from "node-cron";
import { Client, GatewayIntentBits } from "discord.js";
import { registerCommands } from "./commands/index.js";
import { sendDailyUpdate } from "./report/daily.js";

const { BOT_TOKEN, CRON_SCHEDULE = "0 8 * * *" } = process.env;

if (!BOT_TOKEN) {
	throw new Error("Thiếu BOT_TOKEN trong .env");
}

const client = new Client({
	intents: [GatewayIntentBits.Guilds],
});

registerCommands(client);

client.once("clientReady", async () => {
	console.log(`✅ Bot online: ${client.user.tag}`);

	cron.schedule(
		CRON_SCHEDULE,
		async () => {
			try {
				await sendDailyUpdate(client);
			} catch (err) {
				console.error("❌ Auto update lỗi:", err);
			}
		},
		{
			timezone: "Asia/Ho_Chi_Minh",
		},
	);
});

client.on("error", (err) => {
	console.error("❌ Discord client error:", err.message);
});

client.login(BOT_TOKEN);
