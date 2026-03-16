import { EmbedBuilder } from "discord.js";
import {
	collectSnapshot,
	saveSnapshot,
	getHistory,
	getPreviousDaySnapshot,
	get24hChangePercent,
	getHistoryForChart,
	buildChartUrl,
	ensureChartUrlForDiscord,
	formatMoney,
	formatVndShort,
	formatIndex,
} from "../market/index.js";

export async function sendDailyUpdate(client) {
	const snapshot = await collectSnapshot();
	await saveSnapshot(snapshot);

	const CHANNEL_ID = process.env.CHANNEL_ID;
	if (!CHANNEL_ID) {
		console.log("⚠️ Chưa có CHANNEL_ID, bỏ qua auto post.");
		console.log(snapshot);
		return;
	}

	const channel = await client.channels.fetch(CHANNEL_ID);
	if (!channel?.isTextBased()) {
		throw new Error("CHANNEL_ID không phải text channel hợp lệ");
	}

	const [prevSnapshot, history] = await Promise.all([
		getPreviousDaySnapshot(),
		getHistory(),
	]);
	const btc24h = get24hChangePercent(
		snapshot.btc_usd,
		prevSnapshot?.btc_usd,
	);
	const gold24h = get24hChangePercent(
		snapshot.gold_sjc_sell_vnd,
		prevSnapshot?.gold_sjc_sell_vnd,
	);
	const vn24h = get24hChangePercent(
		snapshot.vnindex,
		prevSnapshot?.vnindex,
	);

	function fmt24h(pct) {
		if (pct == null) return "N/A";
		const sign = pct >= 0 ? "+" : "";
		return `${sign}${pct.toFixed(2)}%`;
	}

	const reportLines = [
		"**Bitcoin**",
		`Price: ${formatMoney(snapshot.btc_usd, "USD")}`,
		`24h: ${fmt24h(btc24h)}`,
		"",
		"**Gold SJC**",
		`Price: ${formatVndShort(snapshot.gold_sjc_sell_vnd)}`,
		`24h: ${fmt24h(gold24h)}`,
		"",
		"**VN-Index**",
		`Price: ${formatIndex(snapshot.vnindex)}`,
		`24h: ${fmt24h(vn24h)}`,
	].join("\n");

	const reportEmbed = new EmbedBuilder()
		.setTitle("📊 Daily Market Report")
		.setDescription(reportLines)
		.setTimestamp(new Date());

	const chartDays = 7;
	const embeds = [reportEmbed];

	for (const asset of ["btc", "gold", "vnindex"]) {
		try {
			const hist = await getHistoryForChart(asset, chartDays);
			const chartResult = buildChartUrl(hist, asset, chartDays);
			if (chartResult?.url) {
				const chartUrl = await ensureChartUrlForDiscord(
					chartResult.url,
					chartResult.chartConfig,
				);
				const labelMap = {
					btc: "Bitcoin",
					gold: "Gold SJC",
					vnindex: "VN-Index",
				};
				embeds.push(
					new EmbedBuilder()
						.setTitle(`📈 ${labelMap[asset]} — ${chartDays} ngày`)
						.setImage(chartUrl)
						.setTimestamp(new Date()),
				);
			}
		} catch (err) {
			console.error(`Chart ${asset} error:`, err.message);
		}
	}

	await channel.send({ embeds });
}
