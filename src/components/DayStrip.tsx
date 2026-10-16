const TOTAL = 30;
const DAY_MS = 86_400_000;

export default function DayStrip({ start, now }: { start: string | null; now: string }) {
  let day = 0;
  if (start) {
    const d = Math.floor((Date.parse(now) - Date.parse(start)) / DAY_MS) + 1;
    day = Math.max(0, Math.min(TOTAL + 1, d));
  }

  let label = "Dates will be announced soon";
  if (start) {
    if (day === 0) label = `Starts ${new Date(start).toISOString().slice(0, 10)} (UTC)`;
    else if (day > TOTAL) label = "The 30-day campaign has ended";
    else label = `Day ${day} of ${TOTAL}`;
  }

  return (
    <div>
      <div className="days" aria-hidden="true">
        {Array.from({ length: TOTAL }, (_, i) => {
          const n = i + 1;
          const cls = n < day ? "past" : n === day ? "today" : "future";
          return <div key={n} className={`day ${cls}`} />;
        })}
      </div>
      <div className="days-note">
        <strong>{label}</strong>
        <span>Quest submissions close on day 28</span>
      </div>
    </div>
  );
}
