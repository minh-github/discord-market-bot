/**
 * Chạy các hàm market và mở kết quả trong trình duyệt.
 * Chạy: npm run test:ui   hoặc  node src/scripts/test-local-ui.js
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
	collectSnapshot,
	saveSnapshot,
	getSnapshotForDate,
	getPreviousDaySnapshot,
	get24hChangePercent,
	getWeeklyHighLow,
	getHistory,
	getHistoryForChart,
	buildChartUrl,
	getIntradayData,
	buildIntradayChartUrl,
	formatMoney,
	formatVndShort,
	formatIndex,
	formatDcdsNav,
	formatGrowthPercent,
} from "../market/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, "../../test-output.html");

function section(title, body) {
	return `<section class="block"><h2>${title}</h2><div class="content">${body}</div></section>`;
}

function row(label, value) {
	return `<tr><td class="label">${label}</td><td>${value}</td></tr>`;
}

async function main() {
	const parts = [];

	// 1. Format
	parts.push(
		section(
			"Format (không cần API)",
			`<table>
				${row("formatMoney(1234.5)", formatMoney(1234.5))}
				${row("formatVndShort(85e6)", formatVndShort(85e6))}
				${row("formatIndex(1250.5)", formatIndex(1250.5))}
				${row("formatGrowthPercent(2.5)", formatGrowthPercent(2.5))}
				${row("get24hChangePercent(110, 100)", String(get24hChangePercent(110, 100)))}
				${row("getWeeklyHighLow([...], 'btc_usd')", JSON.stringify(getWeeklyHighLow([{ date: "01", btc_usd: 40 }, { date: "02", btc_usd: 45 }], "btc_usd")))}
			</table>`,
		),
	);

	// 2. Snapshot hiện tại
	try {
		const snapshot = await collectSnapshot();
		await saveSnapshot(snapshot);
		parts.push(
			section(
				"Snapshot hiện tại (API)",
				`<table>
					${row("date", snapshot.date)}
					${row("btc_usd", formatMoney(snapshot.btc_usd))}
					${row("gold_sjc_sell_vnd", formatVndShort(snapshot.gold_sjc_sell_vnd))}
					${row("vnindex", formatIndex(snapshot.vnindex))}
					${row("dcds_nav", formatDcdsNav(snapshot.dcds_nav))}
					${Object.values(snapshot.errors).some(Boolean) ? row("errors", "<pre>" + JSON.stringify(snapshot.errors, null, 2) + "</pre>") : ""}
				</table><p class="muted">(đã saveSnapshot)</p>`,
			),
		);
	} catch (err) {
		parts.push(section("Snapshot hiện tại", `<p class="err">${err.message}</p>`));
	}

	// 3. Snapshot theo ngày
	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);
	const dateStr = yesterday.toISOString().slice(0, 10);
	try {
		const snap = await getSnapshotForDate(dateStr);
		parts.push(
			section(
				`Snapshot ngày ${dateStr}`,
				`<table>
					${row("btc_usd", formatMoney(snap.btc_usd))}
					${row("gold_sjc_sell_vnd", formatVndShort(snap.gold_sjc_sell_vnd))}
					${row("vnindex", formatIndex(snap.vnindex))}
					${row("dcds_nav", formatDcdsNav(snap.dcds_nav))}
				</table>`,
			),
		);
	} catch (err) {
		parts.push(section("Snapshot theo ngày", `<p class="err">${err.message}</p>`));
	}

	// 4. Previous + 24h
	try {
		const prev = await getPreviousDaySnapshot();
		const snap = await collectSnapshot();
		const btc24h = get24hChangePercent(snap.btc_usd, prev?.btc_usd);
		parts.push(
			section(
				"Previous day + 24h",
				`<table>
					${row("prev date", prev?.date ?? "N/A")}
					${row("btc 24h %", btc24h != null ? btc24h.toFixed(2) + "%" : "N/A")}
				</table>`,
			),
		);
	} catch (err) {
		parts.push(section("Previous + 24h", `<p class="err">${err.message}</p>`));
	}

	// 5. Chart daily
	try {
		const history = await getHistoryForChart("btc", 7);
		const result = buildChartUrl(history, "btc", 7);
		parts.push(
			section(
				"Chart daily (BTC, 7 ngày)",
				result
					? `<p>growthPercent: ${result.growthPercent ?? "N/A"}</p><p><img src="${result.url}" alt="chart" class="chart-img" /></p>`
					: "<p>Không đủ dữ liệu</p>",
			),
		);
	} catch (err) {
		parts.push(section("Chart daily", `<p class="err">${err.message}</p>`));
	}

	// 6. Intraday
	try {
		const intraday = await getIntradayData("vnindex", 60);
		if (intraday) {
			const chartResult = buildIntradayChartUrl(intraday, "vnindex", 60);
			parts.push(
				section(
					"Chart intraday (VN-Index, 1h)",
					chartResult
						? `<p>growthPercent: ${intraday.growthPercent ?? "N/A"}</p><p><img src="${chartResult.url}" alt="intraday" class="chart-img" /></p>`
						: "<p>Không đủ dữ liệu</p>",
				),
			);
		} else {
			parts.push(section("Chart intraday", "<p>getIntradayData trả về null</p>"));
		}
	} catch (err) {
		parts.push(section("Chart intraday", `<p class="err">${err.message}</p>`));
	}

	const html = `<!DOCTYPE html>
<html lang="vi">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>Market Bot – Test kết quả</title>
	<style>
		* { box-sizing: border-box; }
		body { font-family: system-ui, sans-serif; max-width: 900px; margin: 0 auto; padding: 1.5rem; background: #1a1a2e; color: #eaeaea; }
		h1 { font-size: 1.4rem; margin-bottom: 1rem; color: #7dd3fc; }
		.block { background: #16213e; border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1rem; }
		.block h2 { font-size: 1rem; margin: 0 0 0.75rem; color: #a5b4fc; }
		table { width: 100%; border-collapse: collapse; }
		td { padding: 0.35rem 0.5rem; vertical-align: top; }
		td.label { color: #94a3b8; width: 40%; }
		pre { margin: 0; font-size: 0.85em; overflow-x: auto; }
		.muted { color: #64748b; font-size: 0.9rem; margin: 0.5rem 0 0; }
		.err { color: #f87171; }
		.chart-img { max-width: 100%; height: auto; border-radius: 6px; margin-top: 0.5rem; }
	</style>
</head>
<body>
	<h1>📊 Market Bot – Kết quả test local</h1>
	${parts.join("\n")}
</body>
</html>`;

	writeFileSync(OUT_FILE, html, "utf8");

	// Mở trình duyệt mặc định
	const pathToOpen = OUT_FILE.replace(/\\/g, "/");
	try {
		if (process.platform === "win32") {
			execSync(`start "" "${OUT_FILE}"`, { stdio: "ignore" });
		} else if (process.platform === "darwin") {
			execSync(`open "${OUT_FILE}"`, { stdio: "ignore" });
		} else {
			execSync(`xdg-open "${OUT_FILE}"`, { stdio: "ignore" });
		}
		console.log("Đã mở:", OUT_FILE);
	} catch {
		console.log("Mở trình duyệt thủ công file:", OUT_FILE);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
