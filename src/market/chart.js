import axios from "axios";
import { readHistory } from "./storage.js";
import { getSnapshotForDate } from "./snapshot.js";
import {
	fetchDcdsNavByDateRange,
	fetchGoldHistoryByDays,
	VNINDEX_CHART_BASE,
} from "./fetchers/index.js";
import { formatGrowthPercent } from "./format.js";

/**
 * Format giá BTC: phân tách hàng nghìn + 2 số lẻ (vi-VN).
 * Ví dụ 70544.4253 -> "70.544,43"
 */
export function formatPeakLabelBtc(v) {
	if (v == null || Number.isNaN(Number(v))) return "";
	const n = Number(v);
	return new Intl.NumberFormat("vi-VN", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(n);
}

export function formatPeakLabelGold(v) {
	if (v == null || Number.isNaN(Number(v))) return "";
	const n = Number(v);
	if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
	if (n >= 1e3) return (n / 1e3).toFixed(0) + "k";
	return n.toFixed(0);
}

export function formatPeakLabelVnindex(v) {
	if (v == null || Number.isNaN(Number(v))) return "";
	const n = Number(v);
	if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
	return n.toFixed(2);
}

export function formatPeakLabelDcds(v) {
	if (v == null || Number.isNaN(Number(v))) return "";
	const n = Number(v);
	if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
	if (n >= 1e3) return (n / 1e3).toFixed(0) + "k";
	return n.toFixed(0);
}

export const CHART_ASSET_CONFIG = {
	btc: {
		key: "btc_usd",
		label: "BTC / USD",
		borderColor: "rgb(247, 147, 26)",
		backgroundColor: "rgba(247, 147, 26, 0.1)",
		formatPeakLabel: formatPeakLabelBtc,
	},
	gold: {
		key: "gold_sjc_sell_vnd",
		label: "Vàng SJC (bán ra)",
		borderColor: "rgb(245, 158, 11)",
		backgroundColor: "rgba(245, 158, 11, 0.12)",
		formatPeakLabel: formatPeakLabelGold,
	},
	vnindex: {
		key: "vnindex",
		label: "VN-Index",
		borderColor: "rgb(59, 130, 246)",
		backgroundColor: "rgba(59, 130, 246, 0.1)",
		formatPeakLabel: formatPeakLabelVnindex,
	},
	dcds: {
		key: "dcds_nav",
		label: "DCDS (NAV)",
		borderColor: "rgb(16, 185, 129)",
		backgroundColor: "rgba(16, 185, 129, 0.1)",
		formatPeakLabel: formatPeakLabelDcds,
	},
};

function formatChartLabel(dateStr) {
	const [y, m, d] = dateStr.split("-");
	return d && m ? `${d}/${m}` : dateStr.slice(5);
}

function formatTimeLabelVN(ts) {
	return new Date(ts * 1000).toLocaleTimeString("vi-VN", {
		timeZone: "Asia/Ho_Chi_Minh",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
}

/** Discord giới hạn URL ảnh embed tối đa 2048 ký tự. */
const DISCORD_EMBED_URL_MAX = 2048;

/**
 * Tạo short URL từ QuickChart khi URL dài (tránh vượt giới hạn Discord).
 * Trả về URL ngắn hoặc null nếu lỗi.
 */
export async function getShortChartUrl(chartConfig, width = 1000, height = 450) {
	try {
		const { data } = await axios.post(
			"https://quickchart.io/chart/create",
			{ chart: chartConfig, width, height },
			{ timeout: 15000, headers: { "Content-Type": "application/json" } },
		);
		if (data?.url) return data.url;
		return null;
	} catch (err) {
		console.error("getShortChartUrl:", err.message);
		return null;
	}
}

/**
 * Trả về URL biểu đồ dùng được trong Discord embed (≤ 2048 ký tự).
 * Nếu url dài hơn giới hạn thì gọi QuickChart short URL API.
 */
export async function ensureChartUrlForDiscord(url, chartConfig) {
	if (!url) return url;
	if (url.length <= DISCORD_EMBED_URL_MAX) return url;
	if (!chartConfig) return url;
	const shortUrl = await getShortChartUrl(chartConfig);
	return shortUrl ?? url;
}

/**
 * Lấy dữ liệu intraday (trong ngày) cho chart.
 * intervalMinutes: 15 hoặc 60.
 * Trả về { labels, values, growthPercent } hoặc null.
 */
export async function getIntradayData(asset, intervalMinutes) {
	const res = intervalMinutes === 15 ? 15 : 60;
	const to = Math.floor(Date.now() / 1000);
	const from = to - 24 * 3600;

	if (asset === "vnindex") {
		const url = `${VNINDEX_CHART_BASE}&resolution=${res}&from=${from}&to=${to}`;
		try {
			const { data } = await axios.get(url, { timeout: 15000 });
			if (data?.s !== "ok" || !Array.isArray(data.c) || data.c.length < 2) {
				return null;
			}
			const labels = data.t.map((ts) => formatTimeLabelVN(ts));
			const values = data.c;
			const growthPct =
				values[0] && values[values.length - 1]
					? ((values[values.length - 1] - values[0]) / values[0]) * 100
					: null;
			return { labels, values, growthPercent: growthPct };
		} catch {
			return null;
		}
	}

	if (asset === "btc") {
		const headers = {};
		if (process.env.COINGECKO_API_KEY) {
			headers["x-cg-pro-api-key"] = process.env.COINGECKO_API_KEY;
		}
		try {
			const { data } = await axios.get(
				"https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range",
				{
					params: { vs_currency: "usd", from, to },
					headers,
					timeout: 20000,
				},
			);
			const prices = data?.prices || [];
			if (prices.length < 2) return null;
			const bucketMs = intervalMinutes * 60 * 1000;
			const buckets = new Map();
			for (const [ts, p] of prices) {
				const key = Math.floor(ts / bucketMs) * bucketMs;
				if (!buckets.has(key)) buckets.set(key, []);
				buckets.get(key).push(p);
			}
			const sorted = [...buckets.entries()].sort((a, b) => a[0] - b[0]);
			const labels = sorted.map(([ts]) => formatTimeLabelVN(ts / 1000));
			const values = sorted.map(
				([, ps]) => ps.reduce((a, b) => a + b, 0) / ps.length,
			);
			const growthPct =
				values[0] && values[values.length - 1]
					? ((values[values.length - 1] - values[0]) / values[0]) * 100
					: null;
			return { labels, values, growthPercent: growthPct };
		} catch {
			return null;
		}
	}

	return null;
}

/** Tạo URL biểu đồ intraday. */
export function buildIntradayChartUrl(intradayData, asset, intervalMinutes) {
	if (!intradayData || intradayData.values.length < 2) return null;
	const config = CHART_ASSET_CONFIG[asset];
	if (!config) return null;

	const { labels, values, growthPercent } = intradayData;
	const intervalLabel = intervalMinutes === 15 ? "15 phút" : "1 giờ";
	const growthText =
		growthPercent != null ? ` • ${formatGrowthPercent(growthPercent)}` : "";

	const isLargeNumber =
		config.key === "gold_sjc_sell_vnd" || config.key === "dcds_nav";
	const formatY = isLargeNumber
		? "function(v){return v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?(v/1e3).toFixed(0)+'k':v}"
		: "function(v){return typeof v==='number'?(v>=1e3?(v/1e3).toFixed(1)+'k':v):v}";
	const formatPeakLabel = config.formatPeakLabel ?? ((v) => String(v ?? ""));
	const dataLabelStrings = values.map(formatPeakLabel);

	const chartConfig = {
		type: "line",
		data: {
			labels,
			datasets: [
				{
					label: config.label,
					data: values,
					fill: true,
					backgroundColor: config.backgroundColor,
					borderColor: config.borderColor,
					borderWidth: 2.5,
					tension: 0.3,
					pointRadius: values.length <= 24 ? 3 : 2,
					pointHoverRadius: 5,
					datalabels: {
						content: dataLabelStrings,
						align: "top",
						anchor: "end",
					},
				},
			],
		},
		options: {
			responsive: true,
			plugins: {
				legend: { display: true, position: "top" },
				title: {
					display: true,
					text: `${config.label} — trong ngày (khung ${intervalLabel})${growthText}`,
					font: { size: 16 },
				},
				datalabels: {
					display: true,
					align: "top",
					anchor: "end",
					content: dataLabelStrings,
					color: "#374151",
					font: { size: 11, weight: "bold" },
					padding: 4,
					borderRadius: 4,
					backgroundColor: "rgba(255,255,255,0.9)",
				},
			},
			scales: {
				x: {
					grid: { display: false },
					ticks: { maxRotation: 45, minRotation: 0, maxTicksLimit: 12 },
				},
				y: {
					beginAtZero: false,
					grid: { color: "rgba(0,0,0,0.06)" },
					ticks: { callback: formatY, maxTicksLimit: 8 },
				},
			},
			layout: { padding: { top: 12, right: 16, bottom: 8, left: 8 } },
		},
	};

	const url = `https://quickchart.io/chart?width=1000&height=450&c=${encodeURIComponent(
		JSON.stringify(chartConfig),
	)}`;
	return { url, growthPercent, chartConfig };
}

const MAX_BACKFILL_DAYS = 14;

/**
 * Lấy dữ liệu để vẽ chart: ưu tiên history, thiếu thì backfill từ API.
 */
export async function getHistoryForChart(asset, days) {
	const config = CHART_ASSET_CONFIG[asset];
	if (!config) throw new Error("Asset không hợp lệ");
	const key = config.key;

	const saved = await readHistory();
	const savedRows = saved
		.filter((x) => x[key] != null)
		.sort((a, b) => a.date.localeCompare(b.date));
	if (savedRows.length >= days) {
		return savedRows.slice(-days);
	}

	if (asset === "dcds") {
		const to = new Date();
		const from = new Date(to);
		from.setDate(from.getDate() - Math.min(days, MAX_BACKFILL_DAYS));
		const dateFrom = from.toISOString().slice(0, 10);
		const dateTo = to.toISOString().slice(0, 10);
		const rows = await fetchDcdsNavByDateRange(dateFrom, dateTo);
		if (rows?.length) {
			const byDate = new Map(savedRows.map((x) => [x.date, x]));
			for (const r of rows) {
				if (!byDate.has(r.date)) {
					byDate.set(r.date, {
						date: r.date,
						dcds_nav: r.navPrice,
						dcds_diff_pct: r.diffPercentage,
					});
				}
			}
			const merged = [...byDate.values()].sort((a, b) =>
				a.date.localeCompare(b.date),
			);
			return merged.filter((x) => x.dcds_nav != null).slice(-days);
		}
		return savedRows.slice(-days);
	}

	if (asset === "gold") {
		const rows = await fetchGoldHistoryByDays(Math.min(days, 90));
		if (rows?.length) {
			const byDate = new Map(savedRows.map((x) => [x.date, x]));
			for (const r of rows) {
				if (!byDate.has(r.date)) byDate.set(r.date, r);
			}
			const merged = [...byDate.values()].sort((a, b) =>
				a.date.localeCompare(b.date),
			);
			return merged
				.filter((x) => x.gold_sjc_sell_vnd != null)
				.slice(-days);
		}
		return savedRows.slice(-days);
	}

	const backfillDays = Math.min(days, MAX_BACKFILL_DAYS);
	const result = [...savedRows];
	const now = new Date();
	const seen = new Set(savedRows.map((x) => x.date));

	for (let i = backfillDays - 1; i >= 0; i--) {
		const d = new Date(now);
		d.setDate(d.getDate() - i);
		const dateStr = d.toISOString().slice(0, 10);
		if (seen.has(dateStr)) continue;
		seen.add(dateStr);
		const inSaved = saved.find((x) => x.date === dateStr);
		if (inSaved && inSaved[key] != null) {
			result.push(inSaved);
		} else {
			const snapshot = await getSnapshotForDate(dateStr);
			if (snapshot[key] != null) result.push(snapshot);
		}
	}
	return result.sort((a, b) => a.date.localeCompare(b.date));
}

/** Tính % tăng trưởng từ điểm đầu → điểm cuối. */
export function getChartGrowthPercent(history, asset) {
	const config = CHART_ASSET_CONFIG[asset];
	if (!config) return null;
	const values = history
		.filter((x) => x[config.key] != null)
		.sort((a, b) => a.date.localeCompare(b.date))
		.map((x) => x[config.key]);
	if (values.length < 2) return null;
	const first = values[0];
	const last = values[values.length - 1];
	if (first === 0 || !Number.isFinite(first) || !Number.isFinite(last))
		return null;
	return ((last - first) / first) * 100;
}

export function buildChartUrl(history, asset = "btc", days = 7) {
	const config = CHART_ASSET_CONFIG[asset];
	if (!config) throw new Error("Asset không hợp lệ");

	const rows = history
		.filter((x) => x[config.key] != null)
		.slice(-days)
		.sort((a, b) => a.date.localeCompare(b.date));

	if (rows.length < 2) return null;

	const labels = rows.map((x) => formatChartLabel(x.date));
	const values = rows.map((x) => x[config.key]);
	const growthPct = getChartGrowthPercent(rows, asset);
	const growthText =
		growthPct != null ? ` • ${formatGrowthPercent(growthPct)}` : "";

	const isLargeNum =
		config.key === "gold_sjc_sell_vnd" || config.key === "dcds_nav";
	const formatY = isLargeNum
		? "function(v){return v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?(v/1e3).toFixed(0)+'k':v}"
		: "function(v){return typeof v==='number'?(v>=1e3?(v/1e3).toFixed(1)+'k':v):v}";
	const formatPeakLabel = config.formatPeakLabel ?? ((v) => String(v ?? ""));
	const dataLabelStrings = values.map(formatPeakLabel);

	const chartConfig = {
		type: "line",
		data: {
			labels,
			datasets: [
				{
					label: config.label,
					data: values,
					fill: true,
					backgroundColor: config.backgroundColor,
					borderColor: config.borderColor,
					borderWidth: 2.5,
					tension: 0.3,
					pointRadius: rows.length <= 14 ? 3 : 2,
					pointHoverRadius: 5,
					datalabels: {
						content: dataLabelStrings,
						align: "top",
						anchor: "end",
					},
				},
			],
		},
		options: {
			responsive: true,
			plugins: {
				legend: { display: true, position: "top" },
				title: {
					display: true,
					text: `${config.label} — ${rows.length} ngày${growthText}`,
					font: { size: 16 },
				},
				datalabels: {
					display: true,
					align: "top",
					anchor: "end",
					content: dataLabelStrings,
					color: "#374151",
					font: { size: 11, weight: "bold" },
					padding: 4,
					borderRadius: 4,
					backgroundColor: "rgba(255,255,255,0.9)",
				},
			},
			scales: {
				x: {
					grid: { display: false },
					ticks: { maxRotation: 45, minRotation: 0, maxTicksLimit: 10 },
				},
				y: {
					beginAtZero: false,
					grid: { color: "rgba(0,0,0,0.06)" },
					ticks: { callback: formatY, maxTicksLimit: 8 },
				},
			},
			layout: {
				padding: { top: 12, right: 16, bottom: 8, left: 8 },
			},
		},
	};

	const url = `https://quickchart.io/chart?width=1000&height=450&c=${encodeURIComponent(
		JSON.stringify(chartConfig),
	)}`;
	return { url, growthPercent: growthPct, chartConfig };
}
