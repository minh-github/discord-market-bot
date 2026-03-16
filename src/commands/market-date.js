import { EmbedBuilder } from "discord.js";
import {
	getSnapshotForDate,
	formatMoney,
	formatVnd,
	formatIndex,
	formatDcdsNav,
	formatGrowthPercent,
} from "../market/index.js";

export async function handleMarketDate(interaction) {
	const input = interaction.options.getString("date", true).trim();
	const daysAgo = Number(input);
	let dateStr;
	if (Number.isFinite(daysAgo) && daysAgo >= 0 && daysAgo <= 3650) {
		const d = new Date();
		d.setDate(d.getDate() - daysAgo);
		dateStr = d.toISOString().slice(0, 10);
	} else {
		const match = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (!match) {
			await interaction.editReply({
				content:
					"❌ Nhập ngày theo dạng **YYYY-MM-DD** (vd: 2024-03-01) hoặc **số ngày trước** (vd: 1, 7).",
			});
			return;
		}
		dateStr = input;
	}

	const snapshot = await getSnapshotForDate(dateStr);
	const hasAny =
		snapshot.btc_usd != null ||
		snapshot.gold_sjc_sell_vnd != null ||
		snapshot.vnindex != null ||
		snapshot.dcds_nav != null;
	if (!hasAny) {
		await interaction.editReply({
			content: `Không có dữ liệu cho ngày **${dateStr}**. Thử ngày gần đây hơn hoặc kiểm tra lại định dạng (YYYY-MM-DD).`,
		});
		return;
	}

	const embed = new EmbedBuilder()
		.setTitle(`📊 Market - ${snapshot.date}`)
		.setDescription(
			"Giá theo ngày (BTC/VN-Index từ API; vàng SJC từ dữ liệu đã lưu)",
		)
		.addFields(
			{
				name: "Bitcoin",
				value: formatMoney(snapshot.btc_usd, "USD"),
				inline: true,
			},
			{
				name: "Vàng SJC (mua vào)",
				value: formatVnd(snapshot.gold_sjc_buy_vnd),
				inline: true,
			},
			{
				name: "Vàng SJC (bán ra)",
				value: formatVnd(snapshot.gold_sjc_sell_vnd),
				inline: true,
			},
			{
				name: "VN-Index",
				value: formatIndex(snapshot.vnindex),
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

	await interaction.editReply({ embeds: [embed] });
}
