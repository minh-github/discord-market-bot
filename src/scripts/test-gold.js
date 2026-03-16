/**
 * Test riêng giá vàng SJC (vang.today API: type=SJ9999, days=N).
 * Chạy: npm run test:gold   hoặc  node src/scripts/test-gold.js
 */
import "dotenv/config";
import {
	fetchGoldSjcSellPrice,
	fetchGoldSjcSellPriceForDate,
	fetchGoldHistoryByDays,
} from "../market/fetchers/gold.js";
import { formatVndShort } from "../market/format.js";

async function main() {
	console.log("=== Test giá vàng SJC (vang.today) ===\n");

	// 1. Giá hiện tại
	console.log("--- Giá hiện tại ---");
	try {
		const current = await fetchGoldSjcSellPrice();
		console.log("Mua vào:", formatVndShort(current.buy));
		console.log("Bán ra:", formatVndShort(current.sell));
	} catch (err) {
		console.error("Lỗi:", err.message);
	}
	console.log("");

	// 2. Giá theo ngày (hôm qua, 3 ngày trước, 10 ngày trước)
	console.log("--- Giá theo ngày ---");
	for (const daysAgo of [1, 3, 10]) {
		const d = new Date();
		d.setDate(d.getDate() - daysAgo);
		const dateStr = d.toISOString().slice(0, 10);
		try {
			const data = await fetchGoldSjcSellPriceForDate(dateStr);
			if (data) {
				console.log(`${daysAgo} ngày trước (${dateStr}): mua ${formatVndShort(data.buy)}, bán ${formatVndShort(data.sell)}`);
			} else {
				console.log(`${daysAgo} ngày trước (${dateStr}): không có dữ liệu`);
			}
		} catch (err) {
			console.log(`${daysAgo} ngày trước (${dateStr}): lỗi - ${err.message}`);
		}
	}
	console.log("");

	// 3. Lịch sử 10 ngày (một request, dùng cho chart)
	console.log("--- Lịch sử 10 ngày (fetchGoldHistoryByDays) ---");
	try {
		const history = await fetchGoldHistoryByDays(10);
		console.log("Số ngày trả về:", history.length);
		history.forEach((h) => {
			console.log(`  ${h.date}: bán ${formatVndShort(h.gold_sjc_sell_vnd)}`);
		});
	} catch (err) {
		console.error("Lỗi:", err.message);
	}

	console.log("\n=== Xong ===");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
