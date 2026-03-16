import axios from "axios";

export async function fetchBitcoinUsd() {
	const headers = {};
	if (process.env.COINGECKO_API_KEY) {
		headers["x-cg-pro-api-key"] = process.env.COINGECKO_API_KEY;
	}
	const { data } = await axios.get(
		"https://api.coingecko.com/api/v3/simple/price",
		{
			params: { ids: "bitcoin", vs_currencies: "usd" },
			headers,
			timeout: 20000,
		},
	);
	const price = data?.bitcoin?.usd;
	if (!price) throw new Error("Không đọc được giá BTC từ CoinGecko");
	return price;
}

/** dateStr: YYYY-MM-DD. CoinGecko dùng dd-mm-yyyy. Free tier có thể 401 với history. */
export async function fetchBitcoinUsdForDate(dateStr) {
	const [y, m, d] = dateStr.split("-");
	if (!y || !m || !d) return null;
	const dateParam = `${d}-${m}-${y}`;
	const headers = {};
	if (process.env.COINGECKO_API_KEY) {
		headers["x-cg-pro-api-key"] = process.env.COINGECKO_API_KEY;
	}
	try {
		const { data } = await axios.get(
			"https://api.coingecko.com/api/v3/coins/bitcoin/history",
			{
				params: { date: dateParam },
				headers,
				timeout: 20000,
			},
		);
		const price = data?.market_data?.current_price?.usd;
		return price != null ? Number(price) : null;
	} catch {
		return null;
	}
}
