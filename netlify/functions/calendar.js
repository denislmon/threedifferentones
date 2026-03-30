exports.handler = async function(event, context) {
  const ICAL_URL = "https://p124-caldav.icloud.com/published/2/NTY3MjU0MTY4NTY3MjU0MY7K0I5AUJiN5smJl2wjP0dLwUJeLT-5UZJCJqJZztbVGtdL44RvPRT4pgeyAs1LZhAsFD98BXoM78z66ZEP2MI";

  try {
    const response = await fetch(ICAL_URL);
    if (!response.ok) throw new Error("Failed to fetch calendar");
    const icsText = await response.text();

    const events = parseICS(icsText);
    const tdoEvents = events.filter(e => e.summary && e.summary.toUpperCase().includes("TDO"));
    tdoEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600"
      },
      body: JSON.stringify(tdoEvents)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};

function parseICS(icsText) {
  const events = [];
  const lines = icsText.replace(/\r\n /g, '').replace(/\r\n\t/g, '').split(/\r\n|\n|\r/);
  let current = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
    } else if (line === 'END:VEVENT' && current) {
      if (current.start) events.push(current);
      current = null;
    } else if (current) {
      if (line.startsWith('SUMMARY:')) {
        current.summary = line.replace('SUMMARY:', '').replace(/\\,/g, ',').trim();
      } else if (line.startsWith('DTSTART')) {
        current.start = parseDate(line.split(':')[1]);
      } else if (line.startsWith('DTEND')) {
        current.end = parseDate(line.split(':')[1]);
      } else if (line.startsWith('LOCATION:')) {
        current.location = line.replace('LOCATION:', '').replace(/\\n/g, ', ').replace(/\\,/g, ',').trim();
      } else if (line.startsWith('URL')) {
        const urlMatch = line.match(/URI:(.+)/);
        if (urlMatch) current.url = urlMatch[1].trim();
      }
    }
  }
  return events;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  dateStr = dateStr.trim();
  // Format: 20260425T210000 or 20260425
  const y = dateStr.slice(0, 4);
  const m = dateStr.slice(4, 6);
  const d = dateStr.slice(6, 8);
  if (dateStr.length > 8) {
    const h = dateStr.slice(9, 11);
    const min = dateStr.slice(11, 13);
    return `${y}-${m}-${d}T${h}:${min}:00`;
  }
  return `${y}-${m}-${d}`;
}
