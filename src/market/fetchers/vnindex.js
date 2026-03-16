import axios from "axios";
import { findFirstNumericValue } from "../utils.js";

export const VNINDEX_CHART_BASE =
	"https://dchart-api.vndirect.com.vn/dchart/history?symbol=VNINDEX";
const VNINDEX_DEFAULT_API = `${VNINDEX_CHART_BASE}&resolution=D`;

export async function fetchVnIndex() {
	const customUrl = process.env.VNINDEX_API_URL;
	if (customUrl) {
		const headers = {};
		if (
			process.env.VNINDEX_API_HEADER_NAME &&
			process.env.VNINDEX_API_HEADER_VALUE
		) {
			headers[process.env.VNINDEX_API_HEADER_NAME] =
				process.env.VNINDEX_API_HEADER_VALUE;
		}
		const { data } = await axios.get(customUrl, {
			headers,
			timeout: 20000,
		});
		return findFirstNumericValue(data);
	}
	const to = Math.floor(Date.now() / 1000);
	const from = to - 14 * 24 * 3600;
	const url = `${VNINDEX_DEFAULT_API}&from=${from}&to=${to}`;
	const { data } = await axios.get(url, { timeout: 20000 });
	if (data?.s !== "ok" || !Array.isArray(data.c) || data.c.length === 0) {
		return null;
	}
	return data.c[data.c.length - 1];
}

/** dateStr: YYYY-MM-DD. */
export async function fetchVnIndexForDate(dateStr) {
	const [y, m, d] = dateStr.split("-").map(Number);
	if (!y || !m || !d) return null;
	const dayStart = new Date(Date.UTC(y, m - 1, d, -7, 0, 0, 0));
	const dayEnd = new Date(Date.UTC(y, m - 1, d, 16, 59, 59, 999));
	const from = Math.floor(dayStart.getTime() / 1000);
	const to = Math.floor(dayEnd.getTime() / 1000);
	const url = `${VNINDEX_DEFAULT_API}&from=${from}&to=${to}`;
	try {
		const { data } = await axios.get(url, { timeout: 20000 });
		if (data?.s !== "ok" || !Array.isArray(data.c) || data.c.length === 0) {
			return null;
		}
		return data.c[data.c.length - 1];
	} catch {
		return null;
	}
}
