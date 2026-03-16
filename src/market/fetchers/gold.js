import axios from "axios";
import { parseLooseNumber } from "../utils.js";

// vang.today API: https://www.vang.today/api/prices?type=SJ9999&days=N
// Response: { success, days, type, history: [ { date: "YYYY-MM-DD", prices: { SJ9999: { name, buy, sell, ... } } }, ... ] }
// Không cần API key.

const VANG_TODAY_URL = "https://www.vang.today/api/prices";
const GOLD_TYPE = "SJ9999"; // SJC Ring / vàng SJC 9999

function pickFromItem(item) {
	const p = item?.prices?.[GOLD_TYPE];
	if (!p) return null;
	const buy = parseLooseNumber(p.buy);
	const sell = parseLooseNumber(p.sell);
	if (sell == null && buy == null) return null;
	return { buy: buy ?? null, sell: sell ?? null };
}

/** Gọi API với days ngày, trả về mảng history (đã parse). */
async function fetchVangTodayHistory(days = 30) {
	const { data } = await axios.get(VANG_TODAY_URL, {
		params: { type: GOLD_TYPE, days },
		timeout: 20000,
		headers: { Accept: "application/json" },
	});
	
	if (!data?.success || !Array.isArray(data.history)) return [];
	return data.history;
}

/** Giá vàng SJC hiện tại (ngày mới nhất trong API). */
export async function fetchGoldSjcSellPrice() {
	const history = await fetchVangTodayHistory(1);
	const first = history[0];
	const picked = pickFromItem(first);
	if (picked) return picked;
	throw new Error("API vang.today không trả về giá SJC");
}

/** Giá vàng SJC một ngày (YYYY-MM-DD). */
export async function fetchGoldSjcSellPriceForDate(dateStr) {
	const history = await fetchVangTodayHistory(90);
	const item = history.find((h) => h.date === dateStr);
	return item ? pickFromItem(item) : null;
}

/** Lấy lịch sử vàng N ngày (để backfill chart). Trả về [{ date, gold_sjc_sell_vnd, gold_sjc_buy_vnd }, ...]. */
export async function fetchGoldHistoryByDays(days) {
	const history = await fetchVangTodayHistory(days);
	return history
		.map((h) => {
			const p = pickFromItem(h);
			if (!p) return null;
			return {
				date: h.date,
				gold_sjc_sell_vnd: p.sell,
				gold_sjc_buy_vnd: p.buy,
			};
		})
		.filter(Boolean)
		.sort((a, b) => a.date.localeCompare(b.date));
}
