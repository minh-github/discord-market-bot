import { todayVN, yesterdayVN } from "./utils.js";
import { readHistory } from "./storage.js";
import {
	fetchBitcoinUsd,
	fetchBitcoinUsdForDate,
	fetchGoldSjcSellPrice,
	fetchGoldSjcSellPriceForDate,
	fetchVnIndex,
	fetchVnIndexForDate,
	fetchDcdsLatest,
	fetchDcdsNavByDateRange,
} from "./fetchers/index.js";

export async function collectSnapshot() {
	const [btc, gold, vnindex, dcds] = await Promise.allSettled([
		fetchBitcoinUsd(),
		fetchGoldSjcSellPrice(),
		fetchVnIndex(),
		fetchDcdsLatest(),
	]);

	const dcdsVal = dcds.status === "fulfilled" ? dcds.value : null;
	return {
		date: todayVN(),
		btc_usd: btc.status === "fulfilled" ? btc.value : null,
		gold_sjc_sell_vnd: gold.status === "fulfilled" ? gold.value.sell : null,
		gold_sjc_buy_vnd: gold.status === "fulfilled" ? gold.value.buy : null,
		vnindex: vnindex.status === "fulfilled" ? vnindex.value : null,
		dcds_nav: dcdsVal?.navPrice ?? null,
		dcds_diff_pct: dcdsVal?.diffPercentage ?? null,
		errors: {
			btc:
				btc.status === "rejected"
					? String(btc.reason?.message || btc.reason)
					: null,
			gold:
				gold.status === "rejected"
					? String(gold.reason?.message || gold.reason)
					: null,
			vnindex:
				vnindex.status === "rejected"
					? String(vnindex.reason?.message || vnindex.reason)
					: null,
			dcds:
				dcds.status === "rejected"
					? String(dcds.reason?.message || dcds.reason)
					: null,
		},
	};
}

/**
 * Lấy snapshot cho một ngày (YYYY-MM-DD).
 * - BTC: từ CoinGecko history.
 * - VN-Index: từ VNDirect dchart.
 * - Vàng SJC: ưu tiên history; nếu thiếu thì gọi VNAppMob (nếu cấu hình).
 * - DCDS: từ Dragon Capital API.
 */
export async function getSnapshotForDate(dateStr) {
	const normalized = dateStr.replace(/\//g, "-").trim();
	const [btc, vnindex, history, dcdsRows, gold] = await Promise.all([
		fetchBitcoinUsdForDate(normalized),
		fetchVnIndexForDate(normalized),
		readHistory(),
		fetchDcdsNavByDateRange(normalized, normalized),
		fetchGoldSjcSellPriceForDate(normalized),
	]);
	const saved = history.find((x) => x.date === normalized);
	const dcdsRow = dcdsRows?.find((r) => r.date === normalized);
	return {
		date: normalized,
		btc_usd: btc ?? saved?.btc_usd ?? null,
		gold_sjc_sell_vnd: gold?.sell ?? saved?.gold_sjc_sell_vnd ?? null,
		gold_sjc_buy_vnd: gold?.buy ?? saved?.gold_sjc_buy_vnd ?? null,
		vnindex: vnindex ?? saved?.vnindex ?? null,
		dcds_nav: dcdsRow?.navPrice ?? saved?.dcds_nav ?? null,
		dcds_diff_pct: dcdsRow?.diffPercentage ?? saved?.dcds_diff_pct ?? null,
	};
}

/** Lấy snapshot ngày hôm trước (để tính 24h change). Ưu tiên từ history. */
export async function getPreviousDaySnapshot() {
	const history = await readHistory();
	const prevDate = yesterdayVN();
	const saved = history.find((x) => x.date === prevDate);
	if (saved) return saved;
	return getSnapshotForDate(prevDate);
}

/**
 * Tính % thay đổi 24h: (current - previous) / previous * 100.
 * Trả về null nếu không tính được.
 */
export function get24hChangePercent(current, previous) {
	if (current == null || previous == null || previous === 0) return null;
	if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
	return ((current - previous) / previous) * 100;
}

/**
 * Lấy High và Low trong 7 ngày gần nhất từ history.
 * assetKey: 'btc_usd' | 'gold_sjc_sell_vnd' | 'vnindex'
 */
export function getWeeklyHighLow(history, assetKey) {
	const last7 = (history || [])
		.filter((x) => x[assetKey] != null)
		.slice(-7)
		.map((x) => x[assetKey]);
	if (last7.length === 0) return { high: null, low: null };
	return {
		high: Math.max(...last7),
		low: Math.min(...last7),
	};
}
