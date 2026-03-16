/**
 * Chạy local các hàm market (snapshot, format, chart) mà không cần Discord.
 * Cần .env (BOT_TOKEN không dùng; COINGECKO_API_KEY nếu có).
 *
 * Cách chạy: npm run test:local
 * Hoặc: node src/scripts/test-local.js
 */
import "dotenv/config";
import asciichart from "asciichart";
import {
	collectSnapshot,
	saveSnapshot,
	getHistoryForChart,
	buildChartUrl,
	CHART_ASSET_CONFIG,
	getIntradayData,
	buildIntradayChartUrl,
	formatMoney,
	formatVndShort,
	formatIndex,
	formatDcdsNav,
	formatGrowthPercent,
} from "../market/index.js";

/** Resample values và labels về đúng targetLen (để set chiều ngang biểu đồ). */
function resampleToWidth(values, labels, targetLen) {
	const n = values.length;
	if (n === targetLen || targetLen < 1) return { values, labels };
	const outValues = [];
	const outLabels = [];
	if (targetLen < n) {
		for (let i = 0; i < targetLen; i++) {
			const idx = targetLen === 1 ? 0 : Math.round((i * (n - 1)) / (targetLen - 1));
			outValues.push(values[idx]);
			outLabels.push(labels?.[idx] ?? "");
		}
	} else {
		for (let i = 0; i < targetLen; i++) {
			const t = targetLen === 1 ? 0 : i / (targetLen - 1);
			const idx = t * (n - 1);
			const i0 = Math.floor(idx);
			const i1 = Math.min(i0 + 1, n - 1);
			const w = idx - i0;
			outValues.push(values[i0] * (1 - w) + values[i1] * w);
			outLabels.push(labels?.[Math.round(idx)] ?? "");
		}
	}
	return { values: outValues, labels: outLabels };
}

/** Vẽ chart ASCII + dòng labels (ngày hoặc giờ) bên dưới. options: height, width (số cột chiều ngang, mặc định = số điểm). */
function plotWithTimeLabels(values, labels, options = {}) {
	const height = options.height ?? 12;
	let dataLen = values.length;
	let plotValues = values;
	let plotLabels = labels;

	if (options.width != null && options.width !== dataLen) {
		const resampled = resampleToWidth(values, labels ?? [], options.width);
		plotValues = resampled.values;
		plotLabels = resampled.labels;
		dataLen = plotValues.length;
	}

	console.log(asciichart.plot(plotValues, { height }));
	if (!plotLabels?.length || plotLabels.length !== plotValues.length) return;
	const dataStart = 12;
	const totalWidth = dataStart + dataLen;
	const line = " ".repeat(totalWidth).split("");
	const put = (i, str) => {
		for (let c = 0; c < str.length && dataStart + i + c < totalWidth; c++) {
			line[dataStart + i + c] = str[c];
		}
	};
	put(0, String(plotLabels[0]));
	if (dataLen > 5) put(dataLen - 5, String(plotLabels[plotLabels.length - 1]));
	if (dataLen > 10) {
		const mid = Math.floor(dataLen / 2);
		put(mid - 2, String(plotLabels[mid]));
	}
	console.log(line.join(""));
}

async function main() {
	console.log("=== Test local market functions ===\n");

	// 1. Format (không cần API)
	// console.log("--- Format ---");
	// console.log("formatMoney(1234.5):", formatMoney(1234.5));
	// console.log("formatVndShort(85e6):", formatVndShort(85e6));
	// console.log("formatIndex(1250.5):", formatIndex(1250.5));
	// console.log("formatGrowthPercent(2.5):", formatGrowthPercent(2.5));
	// console.log("formatGrowthPercent(-1.2):", formatGrowthPercent(-1.2));
	// console.log("get24hChangePercent(110, 100):", get24hChangePercent(110, 100));
	// const fakeHistory = [
	// 	{ date: "2024-01-01", btc_usd: 40000 },
	// 	{ date: "2024-01-02", btc_usd: 42000 },
	// 	{ date: "2024-01-03", btc_usd: 41000 },
	// ];
	// console.log("getWeeklyHighLow(history, 'btc_usd'):", getWeeklyHighLow(fakeHistory, "btc_usd"));
	// console.log("");

	// 2. Snapshot hiện tại (gọi API thật)
	// console.log("--- Snapshot hiện tại (API) ---");
	// try {
	// 	const snapshot = await collectSnapshot();
	// 	console.log("date:", snapshot.date);
	// 	console.log("btc_usd:", snapshot.btc_usd);
	// 	console.log("gold_sjc_sell_vnd:", snapshot.gold_sjc_sell_vnd);
	// 	console.log("vnindex:", snapshot.vnindex);
	// 	console.log("dcds_nav:", snapshot.dcds_nav);
	// 	if (Object.values(snapshot.errors).some(Boolean)) {
	// 		console.log("errors:", snapshot.errors);
	// 	}
	// 	await saveSnapshot(snapshot);
	// 	console.log("(đã saveSnapshot)");
	// } catch (err) {
	// 	console.error("collectSnapshot error:", err.message);
	// }
	// console.log("");

	// 3. Snapshot theo ngày (API + history)
	// console.log("--- Snapshot theo ngày (vd: 1 ngày trước) ---");
	// const yesterday = new Date();
	// yesterday.setDate(yesterday.getDate() - 1);
	// const dateStr = yesterday.toISOString().slice(0, 10);
	// try {
	// 	const snap = await getSnapshotForDate(dateStr);
	// 	console.log("date:", snap.date);
	// 	console.log("btc_usd:", snap.btc_usd);
	// 	console.log("gold_sjc_sell_vnd:", snap.gold_sjc_sell_vnd);
	// 	console.log("vnindex:", snap.vnindex);
	// 	console.log("dcds_nav:", snap.dcds_nav);
	// } catch (err) {
	// 	console.error("getSnapshotForDate error:", err.message);
	// }
	// console.log("");

	// 4. Previous day + 24h (dùng cho report)
	// console.log("--- Previous day + 24h ---");
	// try {
	// 	const prev = await getPreviousDaySnapshot();
	// 	console.log("prev date:", prev?.date);
	// 	const snap = await collectSnapshot();
	// 	const btc24h = get24hChangePercent(snap.btc_usd, prev?.btc_usd);
	// 	console.log("btc 24h %:", btc24h != null ? btc24h.toFixed(2) + "%" : "N/A");
	// } catch (err) {
	// 	console.error("getPreviousDaySnapshot / 24h error:", err.message);
	// }
	// console.log("");

	// 5. Chart daily 7 ngày – từng loại: btc, gold, vnindex, dcds
	const ASSETS_DAILY = ["btc", "gold", "vnindex", "dcds"];
	const CHART_DAYS = 7;
	const CHART_WIDTH = 60;

	try {
		const snap = await collectSnapshot();
		await saveSnapshot(snap);
	} catch (err) {
		console.error("collectSnapshot/saveSnapshot:", err.message);
	}

	for (const asset of ASSETS_DAILY) {
		const config = CHART_ASSET_CONFIG[asset];
		if (!config) continue;
		const key = config.key;
		console.log(`--- Chart daily: ${config.label} (${CHART_DAYS} ngày) ---`);
		try {
			const history = await getHistoryForChart(asset, CHART_DAYS);
			const rows = history
				.filter((x) => x[key] != null)
				.sort((a, b) => a.date.localeCompare(b.date))
				.slice(-CHART_DAYS);

			console.log("số ngày có dữ liệu:", rows.length, "/", CHART_DAYS, rows.length >= 2 ? "" : "(cần ≥ 2 để vẽ)");
			if (rows.length >= 2) {
				const values = rows.map((r) => r[key]);
				const labels = rows.map((r) => {
					const [, m, d] = r.date.split("-");
					return `${d}/${m}`;
				});
				const result = buildChartUrl(history, asset, CHART_DAYS);
				console.log("growthPercent:", result?.growthPercent ?? "N/A");
				plotWithTimeLabels(values, labels, { height: 12, width: CHART_WIDTH });
				console.log("chart url:", result?.url ? "OK" : "null");
			} else {
				console.log("Không đủ dữ liệu (cần ít nhất 2 điểm).");
			}
		} catch (err) {
			console.error(`chart ${asset} error:`, err.message);
		}
		console.log("");
	}

	// 6. Intraday + vẽ biểu đồ ASCII trong console
	// console.log("--- Chart intraday (btc, 60 phút) ---");
	// try {
	// 	const intraday = await getIntradayData("btc", 60);
	// 	if (intraday?.values?.length) {
	// 		console.log("growthPercent:", intraday.growthPercent);
	// 		// asciichart.plot(array) – vẽ line chart trong terminal
	// 		console.log(asciichart.plot(intraday.values, { height: 12 }));
	// 		const chartResult = buildIntradayChartUrl(intraday, "btc", 60);
	// 		console.log("intraday chart url:", chartResult ? "OK" : "null");
	// 	} else {
	// 		console.log("getIntradayData returned null hoặc không đủ dữ liệu");
	// 	}
	// } catch (err) {
	// 	console.error("intraday error:", err.message);
	// }

	console.log("\n=== Xong ===");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
