import https from "node:https";
import axios from "axios";

const DRAGON_APEX_BASE =
	"https://www.dragoncapital.com.vn/individual/vi/webruntime/api/apex/execute";
const DRAGON_CLASS = "@udd/01pJ2000000CgSu";
const DRAGON_SITE_ID = "0DMJ2000000oLukOAE";

function getDragonAxios() {
	const agent = new https.Agent({ rejectUnauthorized: false });
	return axios.create({
		timeout: 20000,
		headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
		httpsAgent: agent,
	});
}

export async function fetchDcdsNavByDateRange(dateFrom, dateTo) {
	const startIso = `${dateFrom}T00:00:00.000Z`;
	const endIso = `${dateTo}T00:00:00.000Z`;
	const chartFrom = `${dateFrom}T17:00:00.000Z`;
	const chartTo = `${dateTo}T16:59:59.999Z`;
	const params = {
		benchmarkFundReportCode: "VNINDEX Index",
		chartDateFrom: chartFrom,
		chartDateTo: chartTo,
		endDateIsoString: endIso,
		fundCode: "VF1",
		fundReportCode: "DCDS",
		includingBenchmark: true,
		siteId: DRAGON_SITE_ID,
		startDateIsoString: startIso,
	};
	const qs =
		`cacheable=true&classname=${encodeURIComponent(DRAGON_CLASS)}` +
		`&isContinuation=false&method=getHistoricalPricesDataByDateRangeV2&namespace=&params=${encodeURIComponent(JSON.stringify(params))}` +
		`&language=vi&asGuest=true&htmlEncode=false`;
	const url = `${DRAGON_APEX_BASE}?${qs}`;
	try {
		const { data } = await getDragonAxios().get(url);
		const list = data?.returnValue?.fundData;
		if (!Array.isArray(list)) return null;
		return list
			.filter((row) => row.navPrice != null)
			.map((row) => ({
				date: row.navDate,
				navPrice: Number(row.navPrice),
				diffPercentage: row.diffPercentage != null ? Number(row.diffPercentage) : null,
			}));
	} catch {
		return null;
	}
}

export async function fetchDcdsLatest() {
	const to = new Date();
	const from = new Date(to);
	from.setDate(from.getDate() - 35);
	const dateFrom = from.toISOString().slice(0, 10);
	const dateTo = to.toISOString().slice(0, 10);
	const rows = await fetchDcdsNavByDateRange(dateFrom, dateTo);
	if (!rows || rows.length === 0) return null;
	return rows[rows.length - 1];
}
