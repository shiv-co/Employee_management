const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6;

const classifyDay = (record, date) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (record?.checkInTime) {
    const checkIn = new Date(record.checkInTime);
    const isLate = checkIn.getHours() > 10 || (checkIn.getHours() === 10 && checkIn.getMinutes() > 0);
    if (isLate) {
      return {
        label: 'Late',
        tone: 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200'
      };
    }

    return {
      label: 'Present',
      tone: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
    };
  }

  if (date < startOfToday && !isWeekend(date)) {
    return {
      label: 'Absent',
      tone: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200'
    };
  }

  return {
    label: '-',
    tone: 'bg-slate-100 text-slate-500'
  };
};

export default function AttendanceCalendar({ records, monthDate, onPrevMonth, onNextMonth }) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startOffset = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const recordMap = new Map(records.map((r) => [r.date, r]));

  const cells = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(new Date(year, month, day));
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevMonth}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
        >
          Prev
        </button>
        <h3 className="text-sm font-semibold text-slate-800 sm:text-base">
          {monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </h3>
        <button
          type="button"
          onClick={onNextMonth}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
        >
          Next
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-500 sm:gap-2 sm:text-xs">
        {dayLabels.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs sm:gap-2 sm:text-sm">
        {cells.map((date, index) => {
          if (!date) return <div key={`blank-${index}`} className="h-14 rounded-md bg-transparent sm:h-16" />;

          const dateKey = toDateKey(date);
          const record = recordMap.get(dateKey);
          const dayMeta = classifyDay(record, date);

          return (
            <div key={dateKey} className={`flex h-14 flex-col items-center justify-center rounded-md sm:h-16 ${dayMeta.tone}`}>
              <span className="font-semibold">{date.getDate()}</span>
              <span className="text-[10px]">{dayMeta.label}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-emerald-100 ring-1 ring-emerald-200" /> Present
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-rose-100 ring-1 ring-rose-200" /> Absent
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-yellow-100 ring-1 ring-yellow-200" /> Late
        </span>
      </div>
    </div>
  );
}
