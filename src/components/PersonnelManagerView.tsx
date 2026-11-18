import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import {
  CycleType,
  HighlightColor,
  PawasAnchor,
  Personnel,
  UnitKey,
} from '../types/polriRoster';
import {
  getOrderedUnitMeta,
  shiftPersonPhase,
} from '../utils/continuousRoster';

interface PersonnelManagerViewProps {
  personnel: Personnel[];
  unitOrder: UnitKey[];
  pawasAnchor: PawasAnchor;
  onUpdatePawasAnchor: (patch: Partial<PawasAnchor>) => void;
  onAddPersonnel: (person: Omit<Personnel, 'id'>) => void;
  onUpdatePersonnel: (id: string, patch: Partial<Personnel>) => void;
  onDeletePersonnel: (id: string) => void;
  onMovePersonnel: (id: string, direction: 'up' | 'down') => void;
  onMoveUnit: (unitKey: UnitKey, direction: 'up' | 'down') => void;
  onResetUnitOrder: () => void;
}

const CYCLE_LABELS: Record<CycleType, string> = {
  NONE: 'Jam Dinas / Non-Shift',
  INTERVAL_X: 'Piket 24J Bergiliran (X)',
  CYCLE_SML: 'Shift 3 Regu (S -> M -> L)',
  CYCLE_INTEL: 'Shift 4 Hari Intel (C1-C2-P-L)',
  CYCLE_RESKRIM: 'Shift 3 Tim Reskrim (C-P-L)',
};

export function PersonnelManagerView({
  personnel,
  unitOrder,
  pawasAnchor,
  onUpdatePawasAnchor,
  onAddPersonnel,
  onUpdatePersonnel,
  onDeletePersonnel,
  onMovePersonnel,
  onMoveUnit,
  onResetUnitOrder,
}: PersonnelManagerViewProps) {
  const [unitFilter, setUnitFilter] = useState<'ALL' | UnitKey>('ALL');
  const [search, setSearch] = useState('');
  const [showUnitOrderPanel, setShowUnitOrderPanel] = useState(false);

  const [newName, setNewName] = useState('');
  const [newPangkat, setNewPangkat] = useState('AIPDA');
  const [newNrp, setNewNrp] = useState('');
  const [newJabatan, setNewJabatan] = useState('');
  const [newUnit, setNewUnit] = useState<UnitKey>('SAMAPTA');
  const [newKet, setNewKet] = useState('');

  const orderedUnits = useMemo(
    () => getOrderedUnitMeta(unitOrder),
    [unitOrder]
  );

  const activePawasOptions = useMemo(
    () =>
      personnel.filter(
        (p) =>
          p.unit === 'PAWAS' &&
          p.cycleType === 'INTERVAL_X' &&
          !p.dutyPaused
      ),
    [personnel]
  );

  // Urutkan tampilan personel sesuai urutan unit yang aktif, menjaga urutan relatif per unit
  const orderedPersonnel = useMemo(() => {
    const unitRank = new Map(orderedUnits.map((u, idx) => [u.key, idx]));
    return [...personnel].sort((a, b) => {
      const ra = unitRank.get(a.unit) ?? 999;
      const rb = unitRank.get(b.unit) ?? 999;
      return ra - rb;
    });
  }, [personnel, orderedUnits]);

  // Peta posisi dalam masing-masing unit (untuk menonaktifkan tombol naik di baris pertama / turun di baris terakhir)
  const unitPositionMap = useMemo(() => {
    const grouped = new Map<UnitKey, string[]>();
    for (const p of personnel) {
      const list = grouped.get(p.unit) ?? [];
      list.push(p.id);
      grouped.set(p.unit, list);
    }
    const map = new Map<string, { index: number; total: number }>();
    for (const ids of grouped.values()) {
      ids.forEach((id, index) => {
        map.set(id, { index, total: ids.length });
      });
    }
    return map;
  }, [personnel]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orderedPersonnel.filter((p) => {
      if (unitFilter !== 'ALL' && p.unit !== unitFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.nrp.toLowerCase().includes(q) ||
        p.jabatan.toLowerCase().includes(q) ||
        p.pangkat.toLowerCase().includes(q) ||
        p.ket.toLowerCase().includes(q)
      );
    });
  }, [orderedPersonnel, unitFilter, search]);

  const inferDefaultCycle = (
    unit: UnitKey
  ): { cycleType: CycleType; cycleLength: number } => {
    if (unit === 'PAWAS') return { cycleType: 'INTERVAL_X', cycleLength: 6 };
    if (unit === 'BHABIN') return { cycleType: 'INTERVAL_X', cycleLength: 10 };
    if (unit === 'SAMAPTA' || unit === 'LANTAS' || unit === 'SPK') {
      return { cycleType: 'CYCLE_SML', cycleLength: 3 };
    }
    if (unit === 'INTEL') return { cycleType: 'CYCLE_INTEL', cycleLength: 4 };
    if (unit === 'RESKRIM')
      return { cycleType: 'CYCLE_RESKRIM', cycleLength: 3 };
    return { cycleType: 'NONE', cycleLength: 0 };
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const sameUnitCount = personnel.filter((p) => p.unit === newUnit).length;
    const { cycleType, cycleLength } = inferDefaultCycle(newUnit);
    onAddPersonnel({
      unit: newUnit,
      unitNo: sameUnitCount + 1,
      name: newName.trim().toUpperCase(),
      pangkat: newPangkat.trim().toUpperCase() || 'BRIPKA',
      nrp: newNrp.trim(),
      jabatan: newJabatan.trim().toUpperCase() || 'BANIT',
      ket: newKet.trim().toUpperCase(),
      cycleType,
      cycleLength,
      phaseOnOct31: 0,
      highlightColor: 'none',
      dutyPaused: false,
    });
    setNewName('');
    setNewNrp('');
    setNewJabatan('');
    setNewKet('');
  };

  return (
    <div className="space-y-6">
      {/* PAWAS Rotation Anchor Control */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Titik Mulai Rotasi PAWAS Berkelanjutan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Personel PAWAS yang berstatus &ldquo;Sementara Tidak Piket&rdquo;
            otomatis dilewati, dan rotasi berlanjut sesuai urutan daftar PAWAS
            dari tanggal &amp; petugas di bawah ini.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-500">
              Mulai Tanggal
            </label>
            <input
              type="date"
              value={pawasAnchor.dateKey}
              onChange={(e) =>
                onUpdatePawasAnchor({ dateKey: e.target.value })
              }
              className="px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-500">
              Petugas PAWAS Hari Pertama
            </label>
            <select
              value={pawasAnchor.personnelId}
              onChange={(e) =>
                onUpdatePawasAnchor({ personnelId: e.target.value })
              }
              aria-label="Petugas PAWAS awal"
              className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white min-w-[220px]"
            >
              {activePawasOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.pangkat} {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Add New Personnel */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Tambah Personel Baru
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Personel baru otomatis masuk ke unit yang dipilih dan bisa
            dinaikkan/diturunkan urutannya kapan saja.
          </p>
        </div>

        <form
          onSubmit={handleAdd}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3"
        >
          <select
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value as UnitKey)}
            aria-label="Unit personel"
            className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          >
            {orderedUnits.map((u) => (
              <option key={u.key} value={u.key}>
                {u.label}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nama Lengkap..."
            required
            className="lg:col-span-2 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />

          <input
            type="text"
            value={newPangkat}
            onChange={(e) => setNewPangkat(e.target.value)}
            placeholder="Pangkat (AIPDA)"
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />

          <input
            type="text"
            value={newNrp}
            onChange={(e) => setNewNrp(e.target.value)}
            placeholder="NRP / NIP"
            className="px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />

          <div className="flex gap-2">
            <input
              type="text"
              value={newJabatan}
              onChange={(e) => setNewJabatan(e.target.value)}
              placeholder="Jabatan"
              className="flex-1 min-w-0 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          </div>
        </form>
      </div>

      {/* Collapsible Unit Order Panel */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowUnitOrderPanel((v) => !v)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
        >
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Urutan Satuan / Unit di Matriks &amp; Cetak
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Naikkan atau turunkan posisi unit (misalnya memindah PAWAS,
              SAMAPTA, BHABIN, dll) untuk mengubah urutan tampil tabel dan
              ekspor.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 shrink-0 ml-4">
            <span>{showUnitOrderPanel ? 'Tutup' : 'Atur Urutan Unit'}</span>
            {showUnitOrderPanel ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </span>
        </button>

        {showUnitOrderPanel && (
          <div className="border-t border-slate-200 px-5 py-4 space-y-3 bg-slate-50/50">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">
                Gunakan tombol panah atas/bawah untuk menaikkan atau menurunkan
                unit.
              </span>
              <button
                type="button"
                onClick={onResetUnitOrder}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Urutan Default</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {orderedUnits.map((u, idx) => {
                const count = personnel.filter((p) => p.unit === u.key).length;
                return (
                  <div
                    key={u.key}
                    className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono tabular-nums text-[11px] text-slate-400 w-5">
                        {idx + 1}.
                      </span>
                      <span className="font-semibold text-slate-800 truncate">
                        {u.label}
                      </span>
                      <span className="font-mono tabular-nums text-[11px] text-slate-500">
                        ({count})
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => onMoveUnit(u.key, 'up')}
                        className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none"
                        title={`Naikkan unit ${u.label}`}
                        aria-label={`Naikkan unit ${u.label}`}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === orderedUnits.length - 1}
                        onClick={() => onMoveUnit(u.key, 'down')}
                        className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none"
                        title={`Turunkan unit ${u.label}`}
                        aria-label={`Turunkan unit ${u.label}`}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Personnel Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <h3 className="font-semibold text-slate-900">
              Daftar Kuat Personel &amp; Status Stabilo
            </h3>
            <span className="text-slate-400">·</span>
            <span className="font-mono tabular-nums text-xs text-slate-500">
              {filtered.length} dari {personnel.length} orang
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={unitFilter}
              onChange={(e) =>
                setUnitFilter(e.target.value as 'ALL' | UnitKey)
              }
              aria-label="Filter unit"
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
            >
              <option value="ALL">Semua Unit</option>
              {orderedUnits.map((u) => (
                <option key={u.key} value={u.key}>
                  {u.label}
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari personel..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg w-48 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <th className="py-2.5 pl-4 pr-2 text-center whitespace-nowrap">
                  Urutan
                </th>
                <th className="py-2.5 px-2">Unit</th>
                <th className="py-2.5 px-2 text-center">No</th>
                <th className="py-2.5 px-2">Nama</th>
                <th className="py-2.5 px-2">Pangkat</th>
                <th className="py-2.5 px-2">NRP</th>
                <th className="py-2.5 px-2">Jabatan</th>
                <th className="py-2.5 px-2">Keterangan</th>
                <th className="py-2.5 px-2">Stabilo</th>
                <th className="py-2.5 px-2">Status Piket</th>
                <th className="py-2.5 px-2">Mulai Tgl</th>
                <th className="py-2.5 px-2">Pola &amp; Geser Siklus</th>
                <th className="py-2.5 pl-2 pr-4 text-right">Hapus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => {
                const posInfo = unitPositionMap.get(p.id) ?? {
                  index: 0,
                  total: 1,
                };
                const canMoveUp = posInfo.index > 0;
                const canMoveDown = posInfo.index < posInfo.total - 1;

                return (
                  <tr
                    key={p.id}
                    className={
                      p.highlightColor === 'red'
                        ? 'bg-red-50/80'
                        : p.highlightColor === 'yellow'
                        ? 'bg-yellow-50/80'
                        : 'hover:bg-slate-50/80'
                    }
                  >
                    <td className="py-2 pl-4 pr-2 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          disabled={!canMoveUp}
                          onClick={() => onMovePersonnel(p.id, 'up')}
                          title={`Naikkan posisi ${p.name}`}
                          aria-label={`Naikkan posisi ${p.name}`}
                          className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={!canMoveDown}
                          onClick={() => onMovePersonnel(p.id, 'down')}
                          title={`Turunkan posisi ${p.name}`}
                          aria-label={`Turunkan posisi ${p.name}`}
                          className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="py-2 px-2 whitespace-nowrap">
                      <select
                        value={p.unit}
                        onChange={(e) => {
                          const nextUnit = e.target.value as UnitKey;
                          const inferred = inferDefaultCycle(nextUnit);
                          onUpdatePersonnel(p.id, {
                            unit: nextUnit,
                            cycleType: inferred.cycleType,
                            cycleLength: inferred.cycleLength,
                          });
                        }}
                        aria-label={`Unit ${p.name}`}
                        className="px-2 py-1 text-xs font-medium border border-slate-200 rounded bg-white text-slate-800"
                      >
                        {orderedUnits.map((u) => (
                          <option key={u.key} value={u.key}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2 whitespace-nowrap">
                      <div className="inline-flex items-center border border-slate-200 rounded bg-white overflow-hidden">
                        <button
                          type="button"
                          disabled={p.unitNo <= 1}
                          onClick={() =>
                            onUpdatePersonnel(p.id, {
                              unitNo: Math.max(1, p.unitNo - 1),
                            })
                          }
                          aria-label={`Turunkan nomor urut ${p.name}`}
                          className="px-1.5 py-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none border-r border-slate-200"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={p.unitNo}
                          onChange={(e) =>
                            onUpdatePersonnel(p.id, {
                              unitNo: Math.max(1, Number(e.target.value) || 1),
                            })
                          }
                          aria-label={`Nomor urut ${p.name}`}
                          className="w-9 text-center font-mono tabular-nums py-0.5 bg-white text-slate-700 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            onUpdatePersonnel(p.id, {
                              unitNo: p.unitNo + 1,
                            })
                          }
                          aria-label={`Naikkan nomor urut ${p.name}`}
                          className="px-1.5 py-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 border-l border-slate-200"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) =>
                          onUpdatePersonnel(p.id, { name: e.target.value })
                        }
                        aria-label={`Nama ${p.name}`}
                        className={`w-48 rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-600/20 ${
                          p.highlightColor === 'red'
                            ? 'bg-red-300 text-red-950 font-bold'
                            : p.highlightColor === 'yellow'
                            ? 'bg-yellow-300 text-yellow-950 font-bold'
                            : 'bg-transparent font-medium text-slate-900 focus:bg-white'
                        }`}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={p.pangkat}
                        onChange={(e) =>
                          onUpdatePersonnel(p.id, { pangkat: e.target.value })
                        }
                        aria-label={`Pangkat ${p.name}`}
                        className="w-20 bg-transparent text-slate-700 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600/20 rounded px-1.5 py-0.5"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={p.nrp}
                        onChange={(e) =>
                          onUpdatePersonnel(p.id, { nrp: e.target.value })
                        }
                        aria-label={`NRP ${p.name}`}
                        className="w-28 bg-transparent font-mono tabular-nums text-slate-600 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600/20 rounded px-1.5 py-0.5"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={p.jabatan}
                        onChange={(e) =>
                          onUpdatePersonnel(p.id, { jabatan: e.target.value })
                        }
                        aria-label={`Jabatan ${p.name}`}
                        className="w-40 bg-transparent text-slate-700 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600/20 rounded px-1.5 py-0.5"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={p.ket}
                        onChange={(e) =>
                          onUpdatePersonnel(p.id, { ket: e.target.value })
                        }
                        placeholder="—"
                        aria-label={`Keterangan ${p.name}`}
                        className="w-36 bg-transparent text-slate-700 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600/20 rounded px-1.5 py-0.5"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={p.highlightColor ?? 'none'}
                        onChange={(e) =>
                          onUpdatePersonnel(p.id, {
                            highlightColor: e.target.value as HighlightColor,
                          })
                        }
                        aria-label={`Stabilo ${p.name}`}
                        className="px-2 py-1 text-xs border border-slate-200 rounded bg-white"
                      >
                        <option value="none">Normal</option>
                        <option value="red">Stabilo Merah</option>
                        <option value="yellow">Stabilo Kuning</option>
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <button
                        type="button"
                        onClick={() => {
                          const nextPaused = !p.dutyPaused;
                          onUpdatePersonnel(p.id, {
                            dutyPaused: nextPaused,
                            pausedFromDate: nextPaused
                              ? p.pausedFromDate || '2026-11-14'
                              : undefined,
                            highlightColor: nextPaused
                              ? 'red'
                              : p.highlightColor === 'red'
                              ? 'none'
                              : p.highlightColor,
                            ket: nextPaused
                              ? p.ket || 'SEMENTARA TIDAK PIKET'
                              : p.ket === 'SEMENTARA TIDAK PIKET'
                              ? ''
                              : p.ket,
                          });
                        }}
                        className={`px-2.5 py-1 text-xs font-medium rounded border whitespace-nowrap ${
                          p.dutyPaused
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {p.dutyPaused ? 'Tidak Piket' : 'Aktif Piket'}
                      </button>
                    </td>
                    <td className="py-2 px-2">
                      {p.dutyPaused ? (
                        <input
                          type="date"
                          value={p.pausedFromDate ?? '2026-11-14'}
                          onChange={(e) =>
                            onUpdatePersonnel(p.id, {
                              pausedFromDate: e.target.value,
                            })
                          }
                          aria-label={`Tanggal mulai tidak piket ${p.name}`}
                          className="px-1.5 py-0.5 text-xs font-mono border border-slate-200 rounded bg-white"
                        />
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-2 px-2 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <select
                          value={p.cycleType}
                          onChange={(e) => {
                            const nextCycle = e.target.value as CycleType;
                            const len =
                              nextCycle === 'CYCLE_INTEL'
                                ? 4
                                : nextCycle === 'CYCLE_SML' ||
                                  nextCycle === 'CYCLE_RESKRIM'
                                ? 3
                                : nextCycle === 'INTERVAL_X'
                                ? p.unit === 'BHABIN'
                                  ? 10
                                  : 6
                                : 0;
                            onUpdatePersonnel(p.id, {
                              cycleType: nextCycle,
                              cycleLength: len,
                            });
                          }}
                          aria-label={`Pola rotasi ${p.name}`}
                          className="px-2 py-1 text-xs border border-slate-200 rounded bg-white text-slate-700"
                        >
                          {(Object.keys(CYCLE_LABELS) as CycleType[]).map(
                            (ct) => (
                              <option key={ct} value={ct}>
                                {CYCLE_LABELS[ct]}
                              </option>
                            )
                          )}
                        </select>

                        {p.cycleType === 'INTERVAL_X' && (
                          <div
                            className="inline-flex items-center border border-slate-200 rounded bg-white overflow-hidden"
                            title="Interval hari giliran piket 24J"
                          >
                            <button
                              type="button"
                              disabled={p.cycleLength <= 2}
                              onClick={() =>
                                onUpdatePersonnel(p.id, {
                                  cycleLength: Math.max(2, p.cycleLength - 1),
                                })
                              }
                              className="px-1.5 py-0.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                              aria-label={`Turunkan interval hari ${p.name}`}
                            >
                              -
                            </button>
                            <span className="px-1.5 py-0.5 font-mono tabular-nums text-[11px] text-slate-700">
                              {p.cycleLength}h
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdatePersonnel(p.id, {
                                  cycleLength: p.cycleLength + 1,
                                })
                              }
                              className="px-1.5 py-0.5 text-slate-500 hover:bg-slate-100"
                              aria-label={`Naikkan interval hari ${p.name}`}
                            >
                              +
                            </button>
                          </div>
                        )}

                        {p.cycleType !== 'NONE' && (
                          <div
                            className="inline-flex items-center border border-slate-200 rounded bg-white overflow-hidden"
                            title="Geser jadwal siklus piket mundur (-1 hari) atau maju (+1 hari)"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                onUpdatePersonnel(p.id, {
                                  phaseOnOct31: shiftPersonPhase(p, -1),
                                })
                              }
                              className="px-1 py-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 border-r border-slate-200"
                              aria-label={`Mundurkan jadwal 1 hari ${p.name}`}
                              title="Mundurkan jadwal 1 hari"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdatePersonnel(p.id, {
                                  phaseOnOct31: shiftPersonPhase(p, 1),
                                })
                              }
                              className="px-1 py-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              aria-label={`Majukan jadwal 1 hari ${p.name}`}
                              title="Majukan jadwal 1 hari"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-2 pl-2 pr-4 text-right">
                      <button
                        type="button"
                        onClick={() => onDeletePersonnel(p.id)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        aria-label={`Hapus ${p.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
