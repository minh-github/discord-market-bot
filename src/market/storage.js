import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.resolve("data");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");
export const HISTORY_RETAIN_DAYS = 90;

export async function ensureStorage() {
	await fs.mkdir(DATA_DIR, { recursive: true });
	try {
		await fs.access(HISTORY_FILE);
	} catch {
		await fs.writeFile(HISTORY_FILE, "[]", "utf8");
	}
}

export async function readHistory() {
	await ensureStorage();
	const raw = await fs.readFile(HISTORY_FILE, "utf8");
	return JSON.parse(raw);
}

export async function writeHistory(data) {
	await ensureStorage();
	await fs.writeFile(HISTORY_FILE, JSON.stringify(data, null, 2), "utf8");
}

export async function saveSnapshot(snapshot) {
	const history = await readHistory();
	const idx = history.findIndex((x) => x.date === snapshot.date);
	if (idx >= 0) {
		history[idx] = snapshot;
	} else {
		history.push(snapshot);
	}
	history.sort((a, b) => a.date.localeCompare(b.date));
	const cutoff = history.length - HISTORY_RETAIN_DAYS;
	const trimmed = cutoff > 0 ? history.slice(cutoff) : history;
	await writeHistory(trimmed);
	return trimmed;
}

export async function getHistory() {
	return readHistory();
}
