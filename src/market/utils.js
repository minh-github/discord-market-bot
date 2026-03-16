/** Ngày hôm nay (YYYY-MM-DD) theo giờ VN. */
export function todayVN() {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Ho_Chi_Minh",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date());
}

/** Ngày hôm qua (YYYY-MM-DD) theo giờ VN. */
export function yesterdayVN() {
	const d = new Date();
	d.setDate(d.getDate() - 1);
	return d.toISOString().slice(0, 10);
}

export function parseLooseNumber(input) {
	if (input == null) return null;
	const cleaned = String(input).replace(/[^\d.-]/g, "");
	if (!cleaned) return null;
	const value = Number(cleaned);
	return Number.isFinite(value) ? value : null;
}

export function findFirstNumericValue(obj) {
	if (obj == null) return null;
	if (typeof obj === "number" && Number.isFinite(obj)) return obj;
	if (typeof obj === "string") {
		const n = parseLooseNumber(obj);
		if (n != null) return n;
	}
	if (Array.isArray(obj)) {
		for (const item of obj) {
			const found = findFirstNumericValue(item);
			if (found != null) return found;
		}
		return null;
	}
	if (typeof obj === "object") {
		const priorityKeys = ["value", "price", "last", "close", "vnindex", "index"];
		for (const key of priorityKeys) {
			if (key in obj) {
				const found = findFirstNumericValue(obj[key]);
				if (found != null) return found;
			}
		}
		for (const key of Object.keys(obj)) {
			const found = findFirstNumericValue(obj[key]);
			if (found != null) return found;
		}
	}
	return null;
}
