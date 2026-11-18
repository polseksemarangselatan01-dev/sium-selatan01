import { Fragment, useMemo, useState } from 'react';
import { Filter, RotateCcw, Search, X } from 'lucide-react';
import { SHIFT_LEGEND } from '../data/polriOktober2026';
import {
  PawasAnchor,
  Personnel,
  ShiftCode,
  ShiftOverrides,
  UnitKey,
} from '../types/polriRoster';
import {
  DAY_NAMES_SHORT_ID,
  formatDateKey,
  getAllowedCodesForPerson,
  getDaysInMonth,
  getEffectivePersonnelForMonth,
  getEffectiveShift,
  getOrderedUnitMeta,
  getShiftDescription,
  getShiftStyle,
  isPersonPausedOnDate,
  MONTH_NAMES_ID,
} from '../utils/continuousRoster';

type MatrixShiftFilter =
  | 'ALL'
  | '24H'
  | 'SIANG'
  | 'MALAM'
  | 'GABUNGAN_SIANG'
  | 'GABUNGAN_MALAM';

interface MonthlyMatrixViewProps {
  year: number;
  monthIndex: number;
  todayDateKey: string;
  personnel: Personnel[];
  unitOrder?: UnitKey[];
  pawasAnchor: PawasAnchor;
  overrides: ShiftOverrides;
  onSetOverride: (
    personnelId: string,
    dateKey: string,
    code: ShiftCode | null
  ) => void;
  onClearMonthOverrides: () => void;
  onInspectDay: (day: number) => void;
}

interface ActiveCellEdit {
  person: Personnel;
  day: number;
  dateKey: string;
  currentCode: ShiftCode;
  isOverridden: boolean;
}

function getRowHighlightClasses(person: Personnel): {
  stickyCell: string;
  nameCell: string;
  infoCell: string;
} {
  if (person.highlightColor === 'red') {
    return {
      stickyCell: 'bg-red-100 text-red-900',
      nameCell: 'bg-red-300 text-red-950 font-bold',
      infoCell: 'bg-red-100/80 text-red-950',
    };
  }
  if (person.highlightColor === 'yellow') {
    return {
      stickyCell: 'bg-yellow-100 text-yellow-950',
      nameCell: 'bg-yellow-300 text-yellow-950 font-bold',
      infoCell: 'bg-yellow-100/80 text-yellow-950',
    };
  }
  return {
    stickyCell: 'bg-white text-slate-500',
    nameCell: 'bg-white text-slate-900 font-medium',
    infoCell: 'text-slate-700',
  };
}

function matchesShiftFilter(
  code: ShiftCode,
  filter: MatrixShiftFilter
): boolean {
  switch (filter) {
    case '24H':
      return code === 'X' || code === 'P';
    case 'SIANG':
      return code === 'S';
    case 'MALAM':
      return code === 'M';
    case 'GABUNGAN_SIANG':
      return code === 'X' || code === 'P' || code === 'S';
    case 'GABUNGAN_MALAM':
      return code === 'X' || code === 'P' || code === 'M';
    default:
      return true;
  }
}

export function MonthlyMatrixView({
  year,
  monthIndex,
  todayDateKey,
  personnel,
  unitOrder,
  pawasAnchor,
  overrides,
  onSetOverride,
  onClearMonthOverrides,
  onInspectDay,
}: MonthlyMatrixViewProps) {
  const [unitFilter, setUnitFilter] = useState<'ALL' | UnitKey>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeEdit, setActiveEdit] = useState<ActiveCellEdit | null>(null);

  const daysInMonth = useMemo(
    () => getDaysInMonth(year, monthIndex),
    [year, monthIndex]
  );

  // Default tanggal filter ke hari ini jika berada di bulan berjalan, atau tgl 1
  const defaultFilterDay = useMemo(() => {
    const [ty, tm, td] = todayDateKey.split('-').map(Number);
    if (ty === year && tm - 1 === monthIndex && td >= 1 && td <= daysInMonth) {
      return td;
    }
    return 1;
  }, [todayDateKey, year, monthIndex, daysInMonth]);

  const [filterDay, setFilterDay] = useState<number>(defaultFilterDay);
  const [shiftFilter, setShiftFilter] = useState<MatrixShiftFilter>('ALL');

  const safeFilterDay = Math.min(Math.max(1, filterDay), daysInMonth);

  const monthPersonnel = useMemo(
    () => getEffectivePersonnelForMonth(personnel, year, monthIndex),
    [personnel, year, monthIndex]
  );

  const daysArray = useMemo(
    () =>
      Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dt = new Date(year, monthIndex, day);
        const dow = dt.getDay();
        return {
          day,
          dayName: DAY_NAMES_SHORT_ID[dow],
          isWeekend: dow === 0 || dow === 6,
          dateKey: formatDateKey(year, monthIndex, day),
        };
      }),
    [daysInMonth, year, monthIndex]
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const orderedUnits = useMemo(
    () => getOrderedUnitMeta(unitOrder),
    [unitOrder]
  );

  const groupedSections = useMemo(() => {
    return orderedUnits.filter(
      (u) => unitFilter === 'ALL' || u.key === unitFilter
    )
      .map((u) => {
        const rows = monthPersonnel.filter((p) => {
          if (p.unit !== u.key) return false;
          if (shiftFilter !== 'ALL') {
            const { code } = getEffectiveShift(
              p,
              year,
              monthIndex,
              safeFilterDay,
              overrides,
              monthPersonnel,
              pawasAnchor
            );
            if (!matchesShiftFilter(code, shiftFilter)) return false;
          }
          if (!normalizedQuery) return true;
          return (
            p.name.toLowerCase().includes(normalizedQuery) ||
            p.nrp.toLowerCase().includes(normalizedQuery) ||
            p.jabatan.toLowerCase().includes(normalizedQuery) ||
            p.pangkat.toLowerCase().includes(normalizedQuery) ||
            p.ket.toLowerCase().includes(normalizedQuery)
          );
        });
        return { unit: u, rows };
      })
      .filter((sec) => sec.rows.length > 0);
  }, [
    orderedUnits,
    monthPersonnel,
    unitFilter,
    shiftFilter,
    safeFilterDay,
    year,
    monthIndex,
    overrides,
    pawasAnchor,
    normalizedQuery,
  ]);

  const filteredPersonnelCount = useMemo(
    () => groupedSections.reduce((acc, s) => acc + s.rows.length, 0),
    [groupedSections]
  );

  const monthOverrideCount = useMemo(() => {
    const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}-`;
    return Object.keys(overrides).filter((k) => k.includes(`__${prefix}`))
      .length;
  }, [overrides, year, monthIndex]);

  const pausedPersonnel = useMemo(
    () => monthPersonnel.filter((p) => p.dutyPaused),
    [monthPersonnel]
  );

  const dailySummary = useMemo(() => {
    return daysArray.map((d) => {
      let x = 0;
      let s = 0;
      let m = 0;
      let p = 0;
      for (const person of monthPersonnel) {
        const { code } = getEffectiveShift(
          person,
          year,
          monthIndex,
          d.day,
          overrides,
          monthPersonnel,
          pawasAnchor
        );
        if (code === 'X') x++;
        else if (code === 'S') s++;
        else if (code === 'M') m++;
        else if (code === 'P') p++;
      }
      const total24H = x + p;
      return {
        day: d.day,
        total24H,
        siang: s,
        malam: m,
        gabunganSiang: total24H + s,
        gabunganMalam: total24H + m,
        x,
        p,
      };
    });
  }, [daysArray, monthPersonnel, year, monthIndex, overrides, pawasAnchor]);

  // Statistik hari yang dipilih di filter (`safeFilterDay`)
  const selectedDaySummary =
    dailySummary.find((d) => d.day === safeFilterDay) ?? dailySummary[0];

  return (
    <div className="space-y-5">
      {/* Summary Strip for Selected Filter Date */}
      <div className="bg-white border border-slate-200 rounded-xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="px-5 py-3.5">
          <p className="text-xs font-medium text-slate-500">
            Piket 24 Jam · Tgl {safeFilterDay}
          </p>
          <p className="mt-1 text-2xl font-semibold font-mono tabular-nums text-slate-900">
            {selectedDaySummary?.total24H ?? 0}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
            X: {selectedDaySummary?.x ?? 0} · P: {selectedDaySummary?.p ?? 0}{' '}
            pers
          </p>
        </div>
        <div className="px-5 py-3.5">
          <p className="text-xs font-medium text-slate-500">
            Siang 12J (08.00–20.00) · Tgl {safeFilterDay}
          </p>
          <p className="mt-1 text-2xl font-semibold font-mono tabular-nums text-slate-900">
            {selectedDaySummary?.siang ?? 0}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Kode S · Gabungan 24J+Siang:{' '}
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {selectedDaySummary?.gabunganSiang ?? 0}
            </span>
          </p>
        </div>
        <div className="px-5 py-3.5">
          <p className="text-xs font-medium text-slate-500">
            Malam 12J (20.00–08.00) · Tgl {safeFilterDay}
          </p>
          <p className="mt-1 text-2xl font-semibold font-mono tabular-nums text-slate-900">
            {selectedDaySummary?.malam ?? 0}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Kode M · Gabungan 24J+Malam:{' '}
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {selectedDaySummary?.gabunganMalam ?? 0}
            </span>
          </p>
        </div>
        <div className="px-5 py-3.5">
          <p className="text-xs font-medium text-slate-500">
            Sementara Tidak Piket
          </p>
          <p className="mt-1 text-2xl font-semibold font-mono tabular-nums text-red-700">
            {pausedPersonnel.length}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 truncate">
            {pausedPersonnel.length > 0
              ? pausedPersonnel.map((p) => p.name).join(', ')
              : 'Semua personel piket aktif'}
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, NRP, jabatan..."
                className="w-56 pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  aria-label="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="inline-flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={unitFilter}
                onChange={(e) =>
                  setUnitFilter(e.target.value as 'ALL' | UnitKey)
                }
                aria-label="Filter satuan unit"
                className="text-xs font-medium bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                <option value="ALL">Semua Unit ({monthPersonnel.length})</option>
                {orderedUnits.map((u) => {
                  const count = monthPersonnel.filter(
                    (p) => p.unit === u.key
                  ).length;
                  if (count === 0) return null;
                  return (
                    <option key={u.key} value={u.key}>
                      {u.label} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {monthOverrideCount > 0 && (
              <button
                type="button"
                onClick={onClearMonthOverrides}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Perubahan Bulan Ini ({monthOverrideCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Daily Shift & Combined Count Filter Bar */}
        <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
              Filter Piket Tanggal:
            </span>
            <select
              value={safeFilterDay}
              onChange={(e) => setFilterDay(Number(e.target.value))}
              aria-label="Tanggal filter piket"
              className="px-2.5 py-1.5 text-xs font-mono font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
            >
              {daysArray.map((d) => (
                <option key={d.day} value={d.day}>
                  Tgl {d.day} ({d.dayName})
                </option>
              ))}
            </select>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
              {(
                [
                  { id: 'ALL', label: 'Semua', count: monthPersonnel.length },
                  {
                    id: '24H',
                    label: '24 Jam',
                    count: selectedDaySummary?.total24H ?? 0,
                  },
                  {
                    id: 'SIANG',
                    label: 'Siang (08.00–20.00)',
                    count: selectedDaySummary?.siang ?? 0,
                  },
                  {
                    id: 'MALAM',
                    label: 'Malam (20.00–08.00)',
                    count: selectedDaySummary?.malam ?? 0,
                  },
                  {
                    id: 'GABUNGAN_SIANG',
                    label: 'Gabungan 24J + Siang',
                    count: selectedDaySummary?.gabunganSiang ?? 0,
                  },
                  {
                    id: 'GABUNGAN_MALAM',
                    label: 'Gabungan 24J + Malam',
                    count: selectedDaySummary?.gabunganMalam ?? 0,
                  },
                ] as { id: MatrixShiftFilter; label: string; count: number }[]
              ).map((opt) => {
                const active = shiftFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setShiftFilter(opt.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                      active
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span
                      className={`font-mono tabular-nums ${
                        active ? 'text-blue-700 font-semibold' : 'text-slate-400'
                      }`}
                    >
                      {opt.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
            Menampilkan {filteredPersonnelCount} personel
          </div>
        </div>
      </div>

      {/* Inline Cell Override Editor */}
      {activeEdit && (
        <div className="bg-white border border-blue-600 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-sm font-semibold text-slate-900">
              Ubah Shift: {activeEdit.person.pangkat} {activeEdit.person.name}
            </div>
            <div className="text-xs text-slate-500">
              Tanggal {activeEdit.day} {MONTH_NAMES_ID[monthIndex]} {year} ·{' '}
              Kode saat ini:{' '}
              <span className="font-mono font-semibold text-slate-800">
                {activeEdit.currentCode || '-'}
              </span>{' '}
              ({getShiftDescription(activeEdit.currentCode)})
              {activeEdit.isOverridden
                ? ' · Diedit manual'
                : ' · Rotasi otomatis'}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {getAllowedCodesForPerson(activeEdit.person).map((code) => (
              <button
                key={code || 'EMPTY'}
                type="button"
                onClick={() => {
                  onSetOverride(
                    activeEdit.person.id,
                    activeEdit.dateKey,
                    code
                  );
                  setActiveEdit(null);
                }}
                className={`px-2.5 py-1.5 text-xs rounded-md border transition-colors whitespace-nowrap ${
                  activeEdit.currentCode === code
                    ? 'border-blue-600 ring-2 ring-blue-600/20 font-bold'
                    : 'border-slate-200 hover:border-slate-400'
                } ${getShiftStyle(code)}`}
              >
                {code || 'Kosong'}
              </button>
            ))}

            {activeEdit.isOverridden && (
              <button
                type="button"
                onClick={() => {
                  onSetOverride(
                    activeEdit.person.id,
                    activeEdit.dateKey,
                    null
                  );
                  setActiveEdit(null);
                }}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md whitespace-nowrap"
              >
                Ikuti Otomatis
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveEdit(null)}
              className="p-1.5 text-slate-400 hover:text-slate-700"
              aria-label="Tutup editor sel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Spreadsheet Matrix */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-max min-w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white border-b border-slate-700">
                <th className="sticky left-0 z-20 bg-slate-900 px-1 sm:px-2.5 py-2.5 text-center font-semibold border-r border-slate-700 w-7 min-w-[28px] sm:w-10 sm:min-w-[40px]">
                  NO
                </th>
                <th className="sticky left-7 sm:left-10 z-20 bg-slate-900 px-2 sm:px-3 py-2.5 text-left font-semibold border-r border-slate-700 w-[116px] min-w-[116px] max-w-[116px] sm:w-auto sm:min-w-[210px] sm:max-w-none">
                  NAMA
                </th>
                <th className="px-2.5 py-2.5 text-left font-semibold border-r border-slate-700 whitespace-nowrap">
                  PANGKAT
                </th>
                <th className="px-2.5 py-2.5 text-left font-semibold border-r border-slate-700 whitespace-nowrap">
                  NRP
                </th>
                <th className="px-2.5 py-2.5 text-left font-semibold border-r border-slate-700 whitespace-nowrap">
                  JABATAN
                </th>
                <th className="px-2.5 py-2.5 text-left font-semibold border-r border-slate-700 whitespace-nowrap">
                  KET
                </th>
                {daysArray.map((d) => {
                  const highlightToday = d.dateKey === todayDateKey;
                  const highlightFilter =
                    shiftFilter !== 'ALL' && d.day === safeFilterDay;
                  return (
                    <th
                      key={d.day}
                      className={`p-0 border-r border-slate-700 last:border-r-0 w-9 min-w-[36px] text-center ${
                        highlightFilter
                          ? 'bg-emerald-600 text-white'
                          : highlightToday
                          ? 'bg-blue-600 text-white'
                          : d.isWeekend
                          ? 'bg-slate-800 text-slate-200'
                          : 'bg-slate-900 text-white'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onInspectDay(d.day)}
                        title={`Lihat detail piket tanggal ${d.day} ${MONTH_NAMES_ID[monthIndex]} ${year}`}
                        className="w-full py-1.5 px-1 hover:bg-blue-700/60 transition-colors flex flex-col items-center leading-tight"
                      >
                        <span className="font-mono tabular-nums font-semibold">
                          {d.day}
                        </span>
                        <span className="text-[10px] opacity-75 font-normal">
                          {d.dayName}
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {groupedSections.length === 0 ? (
                <tr>
                  <td
                    colSpan={6 + daysArray.length}
                    className="py-10 text-center text-sm text-slate-500"
                  >
                    Tidak ada personel yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                groupedSections.map((section) => (
                  <Fragment key={section.unit.key}>
                    {section.unit.headerLabel && (
                      <tr className="bg-slate-100 border-y border-slate-200">
                        <td
                          colSpan={2}
                          className="sticky left-0 z-10 bg-slate-100 px-2 sm:px-3 py-1.5 font-bold text-slate-800 tracking-wide border-r border-slate-200 max-w-[144px] sm:max-w-none"
                        >
                          <div className="truncate">{section.unit.headerLabel}</div>
                        </td>
                        <td
                          colSpan={4 + daysArray.length}
                          className="bg-slate-100 px-3 py-1.5 text-[11px] text-slate-500"
                        >
                          {section.rows.length} personel
                        </td>
                      </tr>
                    )}

                    {section.rows.map((person) => {
                      const rowHl = getRowHighlightClasses(person);
                      return (
                        <tr
                          key={person.id}
                          className={`border-b border-slate-100 transition-colors ${
                            person.highlightColor === 'red'
                              ? 'bg-red-50/70'
                              : person.highlightColor === 'yellow'
                              ? 'bg-yellow-50/70'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td
                            className={`sticky left-0 z-10 px-1 sm:px-2.5 py-1.5 text-center font-mono tabular-nums border-r border-slate-200 w-7 min-w-[28px] sm:w-10 sm:min-w-[40px] ${rowHl.stickyCell}`}
                          >
                            {person.unitNo}
                          </td>
                          <td
                            title={person.name}
                            className={`sticky left-7 sm:left-10 z-10 px-2 sm:px-3 py-1.5 border-r border-slate-200 w-[116px] min-w-[116px] max-w-[116px] sm:w-auto sm:max-w-none sm:whitespace-nowrap ${rowHl.nameCell}`}
                          >
                            <div className="truncate max-w-[100px] sm:max-w-none">
                              {person.name}
                            </div>
                          </td>
                          <td
                            className={`px-2.5 py-1.5 border-r border-slate-100 whitespace-nowrap ${rowHl.infoCell}`}
                          >
                            {person.pangkat}
                          </td>
                          <td
                            className={`px-2.5 py-1.5 font-mono tabular-nums border-r border-slate-100 whitespace-nowrap ${rowHl.infoCell}`}
                          >
                            {person.nrp}
                          </td>
                          <td
                            className={`px-2.5 py-1.5 border-r border-slate-100 whitespace-nowrap ${rowHl.infoCell}`}
                          >
                            {person.jabatan}
                          </td>
                          <td
                            className={`px-2.5 py-1.5 border-r border-slate-200 whitespace-nowrap font-medium ${
                              person.highlightColor === 'red'
                                ? 'bg-red-100 text-red-900'
                                : person.highlightColor === 'yellow'
                                ? 'bg-yellow-100 text-yellow-900'
                                : 'text-slate-600'
                            }`}
                          >
                            {person.ket || '—'}
                          </td>

                          {daysArray.map((d) => {
                            const { code, isOverridden } = getEffectiveShift(
                              person,
                              year,
                              monthIndex,
                              d.day,
                              overrides,
                              monthPersonnel,
                              pawasAnchor
                            );
                            const isPausedToday = isPersonPausedOnDate(
                              person,
                              d.dateKey
                            );
                            const isSelected =
                              activeEdit?.person.id === person.id &&
                              activeEdit?.day === d.day;
                            const isTodayCol = d.dateKey === todayDateKey;
                            const isFilteredCol =
                              shiftFilter !== 'ALL' && d.day === safeFilterDay;

                            return (
                              <td
                                key={d.day}
                                className={`p-0 border-r border-slate-100 last:border-r-0 text-center ${
                                  isFilteredCol
                                    ? 'ring-1 ring-inset ring-emerald-400'
                                    : isTodayCol
                                    ? 'ring-1 ring-inset ring-blue-300'
                                    : d.isWeekend && !code
                                    ? 'bg-slate-50/70'
                                    : ''
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActiveEdit({
                                      person,
                                      day: d.day,
                                      dateKey: d.dateKey,
                                      currentCode: code,
                                      isOverridden,
                                    })
                                  }
                                  title={`${person.name} · Tgl ${d.day}: ${
                                    isPausedToday && !code
                                      ? 'Sementara tidak piket'
                                      : getShiftDescription(code)
                                  }`}
                                  className={`w-full h-7 flex items-center justify-center font-mono tabular-nums text-[11px] transition-colors relative ${
                                    isPausedToday && !code
                                      ? 'bg-red-100/70 text-red-400'
                                      : getShiftStyle(code)
                                  } ${
                                    isSelected
                                      ? 'ring-2 ring-inset ring-blue-600'
                                      : 'hover:opacity-85'
                                  }`}
                                >
                                  <span>
                                    {code || (isPausedToday ? '-' : '')}
                                  </span>
                                  {isOverridden && (
                                    <span
                                      className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-amber-500"
                                      aria-label="Diedit manual"
                                    />
                                  )}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </Fragment>
                ))
              )}
            </tbody>

            {/* Daily Coverage & Combined Verification Rows */}
            <tfoot className="font-mono tabular-nums text-[11px]">
              <tr className="bg-slate-50 border-t-2 border-slate-200 text-slate-700">
                <td
                  colSpan={2}
                  className="sticky left-0 z-10 bg-slate-50 px-2 sm:px-3 py-1.5 font-sans font-semibold text-slate-800 border-r border-slate-200 max-w-[144px] sm:max-w-none"
                >
                  <div className="truncate">Piket 24 Jam (X + P)</div>
                </td>
                <td colSpan={4} className="px-3 py-1.5 border-r border-slate-200" />
                {dailySummary.map((sum) => (
                  <td
                    key={sum.day}
                    className="px-1 py-1.5 text-center border-r border-slate-200 last:border-r-0 font-semibold"
                  >
                    {sum.total24H}
                  </td>
                ))}
              </tr>
              <tr className="bg-amber-50/60 border-t border-slate-200 text-amber-950">
                <td
                  colSpan={2}
                  className="sticky left-0 z-10 bg-amber-50 px-2 sm:px-3 py-1.5 font-sans font-semibold border-r border-slate-200 max-w-[144px] sm:max-w-none"
                >
                  <div className="truncate">Siang 12J (08.00–20.00)</div>
                </td>
                <td colSpan={4} className="px-3 py-1.5 border-r border-slate-200" />
                {dailySummary.map((sum) => (
                  <td
                    key={sum.day}
                    className="px-1 py-1.5 text-center border-r border-slate-200 last:border-r-0 font-semibold"
                  >
                    {sum.siang}
                  </td>
                ))}
              </tr>
              <tr className="bg-slate-100 border-t border-slate-200 text-slate-900">
                <td
                  colSpan={2}
                  className="sticky left-0 z-10 bg-slate-100 px-2 sm:px-3 py-1.5 font-sans font-semibold border-r border-slate-200 max-w-[144px] sm:max-w-none"
                >
                  <div className="truncate">Malam 12J (20.00–08.00)</div>
                </td>
                <td colSpan={4} className="px-3 py-1.5 border-r border-slate-200" />
                {dailySummary.map((sum) => (
                  <td
                    key={sum.day}
                    className="px-1 py-1.5 text-center border-r border-slate-200 last:border-r-0 font-semibold"
                  >
                    {sum.malam}
                  </td>
                ))}
              </tr>
              <tr className="bg-blue-50/70 border-t border-slate-200 text-blue-950">
                <td
                  colSpan={2}
                  className="sticky left-0 z-10 bg-blue-50 px-2 sm:px-3 py-1.5 font-sans font-bold border-r border-slate-200 max-w-[144px] sm:max-w-none"
                >
                  <div className="truncate">Gabungan 24 Jam + Siang</div>
                </td>
                <td colSpan={4} className="px-3 py-1.5 border-r border-slate-200" />
                {dailySummary.map((sum) => (
                  <td
                    key={sum.day}
                    className="px-1 py-1.5 text-center border-r border-slate-200 last:border-r-0 font-bold"
                  >
                    {sum.gabunganSiang}
                  </td>
                ))}
              </tr>
              <tr className="bg-slate-900 text-white border-t border-slate-700">
                <td
                  colSpan={2}
                  className="sticky left-0 z-10 bg-slate-900 px-2 sm:px-3 py-1.5 font-sans font-bold border-r border-slate-700 max-w-[144px] sm:max-w-none"
                >
                  <div className="truncate">Gabungan 24 Jam + Malam</div>
                </td>
                <td colSpan={4} className="px-3 py-1.5 border-r border-slate-700" />
                {dailySummary.map((sum) => (
                  <td
                    key={sum.day}
                    className="px-1 py-1.5 text-center border-r border-slate-700 last:border-r-0 font-bold"
                  >
                    {sum.gabunganMalam}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* KETERANGAN Legend */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Keterangan Kode Piket &amp; Tanda Stabilo
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {SHIFT_LEGEND.map((item) => (
            <div key={item.code} className="flex items-center gap-2.5">
              <span
                className={`inline-flex items-center justify-center min-w-[44px] px-2 py-1 rounded font-mono text-[11px] border border-slate-200 ${
                  item.code === 'X' ||
                  item.code === 'L' ||
                  item.code === 'S' ||
                  item.code === 'M' ||
                  item.code === 'P' ||
                  item.code === 'C' ||
                  item.code === 'C1' ||
                  item.code === 'C2'
                    ? getShiftStyle(item.code as ShiftCode)
                    : 'bg-slate-100 text-slate-700 font-medium'
                }`}
              >
                {item.code}
              </span>
              <span className="text-slate-700 leading-snug">{item.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center min-w-[44px] px-2 py-1 rounded font-bold text-[11px] bg-red-300 text-red-950 border border-red-400">
              MERAH
            </span>
            <span className="text-slate-700 leading-snug">
              SEMENTARA TIDAK PIKET
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
