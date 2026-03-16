import { EmbedBuilder } from "discord.js";
import {
	collectSnapshot,
	saveSnapshot,
	getHistory,
	getPreviousDaySnapshot,
	get24hChangePercent,
	getWeeklyHighLow,
	formatMoney,
	formatVndShort,
	formatIndex,
	formatDcdsNav,
	formatGrowthPercent,
} from "../market/index.js";

const EMBED_COLOR_GREEN = 0x57f287;
const EMBED_COLOR_RED = 0xed4245;
const EMBED_COLOR_NEUTRAL = 0x5865f2;

function line24h(pct) {
	if (pct == null) return "";
	const sign = pct >= 0 ? "+" : "";
	const emoji = pct >= 0 ? "🟢" : "🔴";
	return ` ${emoji} ${sign}${pct.toFixed(2)}%`;
}

export async function handleMarketNow(interaction) {
	console.log("[market-now] handler chạy");
	let snapshot;
	let prevSnapshot;
	let history;
	try {
		snapshot = await collectSnapshot();
		await saveSnapshot(snapshot);
		[prevSnapshot, history] = await Promise.all([
			getPreviousDaySnapshot(),
			getHistory(),
		]);
		console.log("[market-now] snapshot", snapshot?.date);
		console.log("[market-now] prevSnapshot", prevSnapshot?.date);
		console.log("[market-now] history length", history?.length);
	} catch (err) {
		console.error("[market-now] lỗi trước khi build embed:", err);
		throw err;
	}

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
	const btc7d = getWeeklyHighLow(history, "btc_usd");
	const gold7d = getWeeklyHighLow(history, "gold_sjc_sell_vnd");
	const vn7d = getWeeklyHighLow(history, "vnindex");

	const embed = new EmbedBuilder()
		.setTitle(`📊 Market Now — ${snapshot.date}`)
		.setDescription("Giá hiện tại, thay đổi 24h và High/Low 7 ngày")
		.addFields(
			{
				name: "Bitcoin",
				value:
					`**Price:** ${formatMoney(snapshot.btc_usd, "USD")}${line24h(btc24h)}\n` +
					(btc7d.high != null && btc7d.low != null
						? `7D High: ${formatMoney(btc7d.high, "USD")}\n7D Low: ${formatMoney(btc7d.low, "USD")}`
						: ""),
				inline: true,
			},
			{
				name: "Gold SJC (bán ra)",
				value:
					`**Price:** ${formatVndShort(snapshot.gold_sjc_sell_vnd)}${line24h(gold24h)}\n` +
					(gold7d.high != null && gold7d.low != null
						? `7D High: ${formatVndShort(gold7d.high)}\n7D Low: ${formatVndShort(gold7d.low)}`
						: ""),
				inline: true,
			},
			{
				name: "VN-Index",
				value:
					`**Price:** ${formatIndex(snapshot.vnindex)}${line24h(vn24h)}\n` +
					(vn7d.high != null && vn7d.low != null
						? `7D High: ${formatIndex(vn7d.high)}\n7D Low: ${formatIndex(vn7d.low)}`
						: ""),
				inline: true,
			},
			{
				name: "DCDS (NAV)",
				value:
					snapshot.dcds_nav != null && snapshot.dcds_diff_pct != null
						? `${formatDcdsNav(snapshot.dcds_nav)} (${formatGrowthPercent(snapshot.dcds_diff_pct)})`
						: formatDcdsNav(snapshot.dcds_nav),
				inline: true,
			},
		)
		.setTimestamp(new Date());

	const any24h = [btc24h, gold24h, vn24h].filter((p) => p != null);
	if (any24h.length > 0) {
		const hasPositive = any24h.some((p) => p > 0);
		const hasNegative = any24h.some((p) => p < 0);
		if (hasPositive && !hasNegative) embed.setColor(EMBED_COLOR_GREEN);
		else if (hasNegative && !hasPositive) embed.setColor(EMBED_COLOR_RED);
		else embed.setColor(EMBED_COLOR_NEUTRAL);
	}

	await interaction.editReply({ embeds: [embed] });
}
