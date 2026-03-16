import { EmbedBuilder } from "discord.js";
import {
	getHistoryForChart,
	getIntradayData,
	buildChartUrl,
	buildIntradayChartUrl,
	ensureChartUrlForDiscord,
	formatGrowthPercent,
} from "../market/index.js";

const LABEL_MAP = {
	btc: "Bitcoin",
	gold: "Vàng SJC",
	vnindex: "VN-Index",
	dcds: "DCDS (Quỹ Dragon)",
};

export async function handleChart(interaction) {
	const asset = interaction.options.getString("asset", true);
	const scope = interaction.options.getString("scope") ?? "daily";

	if (scope === "intraday") {
		const intervalMinutes = interaction.options.getInteger("interval") ?? 60;
		if (asset === "gold" || asset === "dcds") {
			await interaction.editReply({
				content:
					"Chưa có dữ liệu **trong ngày** (intraday) cho asset này. Chỉ hỗ trợ Bitcoin và VN-Index với khung 15 phút hoặc 1 giờ.",
			});
			return;
		}
		let intradayData;
		try {
			intradayData = await getIntradayData(asset, intervalMinutes);
		} catch (err) {
			console.error("getIntradayData:", err);
			await interaction.editReply({
				content: "Không lấy được dữ liệu intraday.",
			});
			return;
		}
		const chartResult = buildIntradayChartUrl(
			intradayData,
			asset,
			intervalMinutes,
		);
		if (!chartResult) {
			await interaction.editReply({
				content: `Chưa đủ dữ liệu để vẽ biểu đồ trong ngày cho **${LABEL_MAP[asset]}**. Thử lại sau.`,
			});
			return;
		}
		const chartUrl = await ensureChartUrlForDiscord(
			chartResult.url,
			chartResult.chartConfig,
		);
		const intervalLabel = intervalMinutes === 15 ? "15 phút" : "1 giờ";
		const growthText =
			chartResult.growthPercent != null
				? `**Tăng trưởng (24h):** ${formatGrowthPercent(chartResult.growthPercent)}`
				: null;
		const embed = new EmbedBuilder()
			.setTitle(
				`📈 ${LABEL_MAP[asset]} — trong ngày (khung ${intervalLabel})`,
			)
			.setImage(chartUrl)
			.setTimestamp(new Date());
		if (growthText) embed.setDescription(growthText);
		await interaction.editReply({ embeds: [embed] });
		return;
	}

	const days = Math.min(
		Math.max(interaction.options.getInteger("days") ?? 7, 2),
		7,
	);

	let history;
	try {
		history = await getHistoryForChart(asset, days);
	} catch (err) {
		console.error("getHistoryForChart:", err);
		await interaction.editReply({
			content: "Không lấy được dữ liệu để vẽ chart.",
		});
		return;
	}

	const chartResult = buildChartUrl(history, asset, days);

	if (!chartResult) {
		await interaction.editReply({
			content: `Chưa đủ dữ liệu để vẽ chart cho **${LABEL_MAP[asset] ?? asset}** trong ${days} ngày. Thử giảm số ngày hoặc chọn asset khác.`,
		});
		return;
	}

	const chartUrl = await ensureChartUrlForDiscord(
		chartResult.url,
		chartResult.chartConfig,
	);
	const { growthPercent } = chartResult;
	const growthText =
		growthPercent != null
			? `**Tăng trưởng:** ${formatGrowthPercent(growthPercent)} (đầu kỳ → cuối kỳ)`
			: null;

	const embed = new EmbedBuilder()
		.setTitle(`📈 ${LABEL_MAP[asset]} — ${days} ngày`)
		.setImage(chartUrl)
		.setTimestamp(new Date());
	if (growthText) embed.setDescription(growthText);

	await interaction.editReply({ embeds: [embed] });
}
