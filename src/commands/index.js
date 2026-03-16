import { MessageFlags } from "discord.js";
import { handleMarketNow } from "./market-now.js";
import { handleMarketDate } from "./market-date.js";
import { handleChart } from "./chart.js";

function isUnknownInteraction(err) {
	return err?.code === 10062 || err?.rawError?.code === 10062;
}

export function registerCommands(client) {
	client.on("interactionCreate", async (interaction) => {
		if (!interaction.isChatInputCommand()) return;

		try {
			if (interaction.commandName === "market-now") {
				try {
					await interaction.deferReply();
				} catch (e) {
					if (isUnknownInteraction(e)) {
						console.warn("⚠️ Interaction đã hết hạn (10062), bỏ qua.");
						return;
					}
					throw e;
				}
				await handleMarketNow(interaction);
				return;
			}

			if (interaction.commandName === "market-date") {
				try {
					await interaction.deferReply();
				} catch (e) {
					if (isUnknownInteraction(e)) {
						console.warn("⚠️ Interaction đã hết hạn (10062), bỏ qua.");
						return;
					}
					throw e;
				}
				await handleMarketDate(interaction);
				return;
			}

			if (interaction.commandName === "chart") {
				try {
					await interaction.deferReply();
				} catch (e) {
					if (isUnknownInteraction(e)) return;
					throw e;
				}
				await handleChart(interaction);
				return;
			}
		} catch (err) {
			console.error("❌ interaction lỗi:", err);

			if (isUnknownInteraction(err)) {
				console.warn(
					"⚠️ Interaction đã hết hạn, không thể gửi thông báo lỗi.",
				);
				return;
			}

			try {
				if (interaction.deferred || interaction.replied) {
					await interaction.editReply("Bot bị lỗi lúc xử lý lệnh 😵");
				} else {
					await interaction.reply({
						content: "Bot bị lỗi lúc xử lý lệnh 😵",
						flags: MessageFlags.Ephemeral,
					});
				}
			} catch (replyErr) {
				console.error(
					"❌ Không gửi được thông báo lỗi cho user:",
					replyErr.message,
				);
			}
		}
	});
}
