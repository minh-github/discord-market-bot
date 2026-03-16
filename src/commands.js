import { SlashCommandBuilder } from "discord.js";

export const commands = [
	new SlashCommandBuilder()
		.setName("market-now")
		.setDescription("Xem giá BTC, vàng SJC và VN-Index hiện tại"),

	new SlashCommandBuilder()
		.setName("market-date")
		.setDescription("Xem giá BTC, vàng SJC, VN-Index của một ngày trước đó")
		.addStringOption((option) =>
			option
				.setName("date")
				.setDescription('Ngày (YYYY-MM-DD) hoặc số ngày trước (vd: 1, 7)')
				.setRequired(true),
		),

	new SlashCommandBuilder()
		.setName("chart")
		.setDescription("Xem biểu đồ theo ngày hoặc trong ngày (intraday)")
		.addStringOption((option) =>
			option
				.setName("asset")
				.setDescription("Loại dữ liệu")
				.setRequired(true)
				.addChoices(
					{ name: "Bitcoin", value: "btc" },
					{ name: "Vàng SJC", value: "gold" },
					{ name: "VN-Index", value: "vnindex" },
					{ name: "DCDS (Quỹ Dragon)", value: "dcds" },
				),
		)
		.addStringOption((option) =>
			option
				.setName("scope")
				.setDescription("Theo ngày hay trong ngày")
				.setRequired(false)
				.addChoices(
					{ name: "Theo ngày (nhiều ngày)", value: "daily" },
					{ name: "Trong ngày (intraday)", value: "intraday" },
				),
		)
		.addIntegerOption((option) =>
			option
				.setName("days")
				.setDescription("Số ngày quá khứ (2–7, mặc định 7)")
				.setRequired(false)
				.setMinValue(2)
				.setMaxValue(7),
		)
		.addIntegerOption((option) =>
			option
				.setName("interval")
				.setDescription("Khung thời gian trong ngày: 15 phút hoặc 1 giờ")
				.setRequired(false)
				.addChoices(
					{ name: "15 phút", value: 15 },
					{ name: "1 giờ", value: 60 },
				),
		),
].map((cmd) => cmd.toJSON());
