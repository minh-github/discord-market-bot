export function formatMoney(value, currency = "USD") {
	if (value == null) return "N/A";
	return (
		new Intl.NumberFormat("en-US", {
			maximumFractionDigits: 2,
		}).format(value) + ` ${currency}`
	);
}

export function formatVnd(value) {
	if (value == null) return "N/A";
	return new Intl.NumberFormat("vi-VN").format(value) + " VND/lượng";
}

/** Format giá vàng dạng "84.2 million VND" khi >= 1 triệu. */
export function formatVndShort(value) {
	if (value == null) return "N/A";
	if (value >= 1e6) {
		const millions = value / 1e6;
		return (
			millions.toFixed(1).replace(/\.0$/, "") + " million VND"
		);
	}
	return new Intl.NumberFormat("vi-VN").format(value) + " VND";
}

export function formatIndex(value) {
	if (value == null) return "N/A";
	return new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
}

/** Format NAV DCDS (số lớn, 2 chữ số thập phân). */
export function formatDcdsNav(value) {
	if (value == null) return "N/A";
	return (
		new Intl.NumberFormat("vi-VN", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(value) + " NAV"
	);
}

/** Format % tăng trưởng để hiển thị (vd: "+2.35%" hoặc "-1.20%"). */
export function formatGrowthPercent(pct) {
	if (pct == null || !Number.isFinite(pct)) return "N/A";
	const sign = pct >= 0 ? "+" : "";
	return `${sign}${pct.toFixed(2)}%`;
}
