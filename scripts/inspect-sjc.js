import axios from "axios";
import * as cheerio from "cheerio";

const { data } = await axios.get("https://sjc.com.vn/gia-vang-online", {
	timeout: 15000,
	headers: { "User-Agent": "Mozilla/5.0" },
});
const $ = cheerio.load(data);

console.log("=== Tables ===");
$("table").each((i, table) => {
	console.log("\n--- Table", i, "---");
	$(table)
		.find("tr")
		.each((j, tr) => {
			const cells = $(tr)
				.find("td, th")
				.map((_, c) => $(c).text().replace(/\s+/g, " ").trim())
				.get();
			if (cells.some((s) => s.length > 0)) console.log(cells.join(" | "));
		});
});

console.log("\n=== Full body text (first 2500 chars) ===");
const text = $("body").text().replace(/\s+/g, " ").trim();
console.log(text.slice(0, 2500));

// Find numbers like 7x,xxx,xxx (VND price)
const numberMatches = text.match(/[\d.,]{10,}/g);
console.log("\n=== Long number-like strings ===", numberMatches?.slice(0, 30));

// Raw HTML of table and nearby
const tableHtml = $("table").first().html();
console.log("\n=== First table HTML (length) ===", tableHtml?.length, tableHtml?.slice(0, 1500));
