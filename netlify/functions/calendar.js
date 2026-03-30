const https = require("https");

const ICAL_URL =
  "https://p124-caldav.icloud.com/published/2/NTY3MjU0MTY4NTY3MjU0MY7K0I5AUJiN5smJl2wjP0dLwUJeLT-5UZJCJqJZztbVGtdL44RvPRT4pgeyAs1LZhAsFD98BXoM78z66ZEP2MI";

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  dateStr = dateStr.trim();
  const y = dateStr.slice(0, 4);
  const m = dateStr.slice(4, 6);
  const d = dateStr.slice(6, 8);
  if (dateStr.length > 8 && dateStr[8] === "T") {
    const h = dateStr.slice(9, 11);
    const min = dateStr.slice(11, 13);
    return `${y}-${m}-${d}T${h}:${min}:00`;
  }
  return `${y}-${m}-${d}`;
}

function parseICS(icsText) {
  const events = [];
  const unfolded = icsText.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const lines = unfolded.split(/\r\n|\n|\r/);
  let current = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
    } else if (line === "END:VEVENT" && current) {
      if (current.start) events.push(current);
      current = null;
    } else if (current) {
      if (line.startsWith("SUMMARY:")) {
        current.summary = line.slice(8).replace(/\\,/g, ",").trim();
      } else if (line.match(/^DTSTART/)) {
        const val = line.split(":").slice(1).join(":");
        current.start = parseDate(val);
      } else if (line.match(/^DTEND/)) {
        const val = line.split(":").slice(1).join(":");
        current.end = parseDate(val);
      } else if (line.startsWith("LOCATION:")) {
        current.location = line.slice(9).replace(/\\n/g, ", ").replace(/\\,/g, ",").trim();
      }
    }
  }
  return events;
}

exports.handler = async function (event, context) {
  try {
    const icsText = await fetchURL(ICAL_URL);
    const events = parseICS(icsText);
    const tdoEvents = events.filter(
      (e) => e.summary && e.summary.toUpperCase().includes("TDO")
    );
    tdoEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
      body: JSON.stringify(tdoEvents),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
