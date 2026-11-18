import {
  RosterOrgHeader,
  SuratBiasaData,
  SuratFontFamily,
} from '../types/polriRoster';
import { MONTH_NAMES_ID } from '../utils/continuousRoster';
import {
  normalizeSignerNamePerkap,
  normalizeSignerRankNrpPerkap,
} from '../utils/perkap2023Rules';
import {
  REPO_SURAT_BIASA_TEMPLATES,
  RepoLetterTemplate,
} from './tamplateSuratBiasaPresets';

export interface SuratBiasaTemplateItem {
  id: string;
  title: string;
  category: string;
  sourceLabel: string;
  previewNomor: string;
  previewHal: string;
  directiveCount: number;
  buildData: (
    header: RosterOrgHeader,
    todayDateKey: string,
    opts?: {
      useCurrentSatkerKopSigner?: boolean;
      fontFamily?: SuratFontFamily;
    }
  ) => SuratBiasaData;
}

function parseDateKeyParts(dateKey: string): {
  year: number;
  monthIndex: number;
  day: number;
} {
  const m = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    return {
      year: Number(m[1]),
      monthIndex: Number(m[2]) - 1,
      day: Number(m[3]),
    };
  }
  const now = new Date();
  return {
    year: now.getFullYear(),
    monthIndex: now.getMonth(),
    day: now.getDate(),
  };
}

export function formatRepoNomorSurat(
  identitas: RepoLetterTemplate['identitas']
): string {
  return [
    identitas.klasifikasiKode,
    identitas.nomorUrut,
    identitas.bulanRomawi,
    identitas.kodeKlasifikasi,
    identitas.tahun,
    identitas.satkerPenerbit,
  ]
    .filter((p) => p.trim() !== '')
    .join('/');
}

export function convertRepoLetterToSuratBiasa(
  tpl: RepoLetterTemplate,
  opts?: {
    header?: RosterOrgHeader;
    useCurrentSatkerKopSigner?: boolean;
    fontFamily?: SuratFontFamily;
  }
): SuratBiasaData {
  const satuanLines = tpl.kop.satuanInduk
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let kopLine1 = tpl.kop.instansi.trim();
  let kopLine2 = satuanLines[0] ?? '';
  let kopLine3 = satuanLines[1] ?? '';
  let kopAddress = tpl.kop.alamat.trim();
  let page2HeaderLabel =
    tpl.identitas.headerLanjutanJudul?.trim() || 'SURAT KAPOLDA JATENG';

  const atasNamaLower = tpl.penandaTangan.atasNama.trim().toLowerCase();
  let signerDelegation: SuratBiasaData['signerDelegation'] =
    atasNamaLower.includes('a.n') ? 'AN' : 'NONE';
  let signerSuperiorTitle = tpl.penandaTangan.jabatanUtama.trim();
  let signerTitle =
    tpl.penandaTangan.jabatanPenandaTangan.trim() ||
    tpl.penandaTangan.jabatanUtama.trim();
  let signerName = tpl.penandaTangan.nama.trim();
  let signerRankNrp = `${tpl.penandaTangan.pangkat} ${tpl.penandaTangan.nrp}`
    .replace(/\s+/g, ' ')
    .trim();

  if (opts?.useCurrentSatkerKopSigner && opts.header) {
    const h = opts.header;
    kopLine1 = h.line1;
    kopLine2 = h.line2;
    kopLine3 = h.line3;
    kopAddress = 'Jalan Lamper Tengah XIV, Semarang 50248';
    page2HeaderLabel = 'SURAT KAPOLSEK SMG SELATAN';
    signerDelegation = 'NONE';
    signerSuperiorTitle = 'KAPOLRESTABES SEMARANG';
    signerTitle = `${h.signerTitle} POLRESTABES SEMARANG`;
    signerName = normalizeSignerNamePerkap(h.signerName);
    signerRankNrp = normalizeSignerRankNrpPerkap(
      `${h.signerRank} ${h.signerNrp}`
    );
  }

  const rujukanBlock =
    tpl.rujukan.length > 0
      ? [
          '1. Rujukan:',
          ...tpl.rujukan.map(
            (r, idx) => `${String.fromCharCode(97 + idx)}. ${r.teks}`
          ),
        ].join('\n')
      : '1. Rujukan: -';

  const latarBlock = `2. ${tpl.latarBelakang.trim()}`;
  const pembukaBlock = `3. ${tpl.pembukaDirektif.trim()}`;

  const directiveBlocks = tpl.direktifList.map((dir, dIdx) => {
    const letter = String.fromCharCode(97 + dIdx);
    if (dir.jenis === 'poin' && dir.poin.length > 0) {
      return [
        `${letter}. ${dir.pejabat.trim()}`,
        ...dir.poin.map((sub, sIdx) => `${sIdx + 1}) ${sub.teks.trim()}`),
      ].join('\n');
    }
    return `${letter}. ${dir.pejabat.trim()}`;
  });

  const penutupBlock = `4. ${tpl.penutup.trim()}`;

  return {
    kopLine1,
    kopLine2,
    kopLine3,
    kopAddress,
    nomor: formatRepoNomorSurat(tpl.identitas),
    klasifikasi: tpl.identitas.klasifikasiLabel || 'Biasa',
    lampiran: tpl.identitas.lampiran || '-',
    perihal: tpl.identitas.hal,
    dateRightText: `${tpl.identitas.tempat},  ${tpl.identitas.tanggal}`,
    kepadaYth: tpl.tujuan.kepada,
    diKota: tpl.tujuan.tempatTujuan || 'Tempat',
    upText: '',
    page2HeaderLabel,
    page2DateUpper: tpl.identitas.tanggal.trim().toUpperCase(),
    paragraphsPage1: [
      rujukanBlock,
      latarBlock,
      pembukaBlock,
      ...directiveBlocks,
    ],
    paragraphsPage2: [penutupBlock],
    includePersonnelTable: false,
    personnelTableTitle: 'DAFTAR NAMA PERSONEL',
    personnelRows: [],
    signerDelegation,
    signerSuperiorTitle,
    signerMiddleTitle: '',
    signerTitle,
    signerName,
    signerRankNrp,
    tembusan: tpl.tembusan.map((t) => t.teks),
    fontFamily: opts?.fontFamily ?? 'Arial',
  };
}

export function createDefaultPolsekSuratBiasa(
  header: RosterOrgHeader,
  todayDateKey: string,
  fontFamily: SuratFontFamily = 'Arial'
): SuratBiasaData {
  const { year, monthIndex } = parseDateKeyParts(todayDateKey);
  const monthUpper = MONTH_NAMES_ID[monthIndex] ?? 'NOVEMBER';
  const monthTitle =
    monthUpper.charAt(0).toUpperCase() + monthUpper.slice(1).toLowerCase();

  return {
    kopLine1: header.line1,
    kopLine2: header.line2,
    kopLine3: header.line3,
    kopAddress: 'Jalan Lamper Tengah XIV, Semarang 50248',
    nomor: `B/     /XI/REN.4.1.3./${year}`,
    klasifikasi: 'Biasa',
    lampiran: 'satu lembar',
    perihal: 'usulan pembagian alokasi DIPA Unit Samapta dan Unit Lantas.',
    dateRightText: `Semarang,    ${monthTitle} ${year}`,
    kepadaYth: 'KEPALA KEPOLISIAN RESOR KOTA BESAR SEMARANG',
    diKota: 'Semarang',
    upText: 'u.p. Kabagren.',
    page2HeaderLabel: 'SURAT KAPOLSEK SMG SELATAN',
    page2DateUpper: `${monthUpper} ${year}`,
    paragraphsPage1: [
      '1. Rujukan :\na. Undang-undang (UU) Nomor 5 Tahun 2026 tentang Perubahan Ketiga atas Undang-Undang Nomor 2 Tahun 2002 tentang Kepolisian Negara Republik Indonesia.;\nb. Daftar Isian Pelaksanaan Anggaran (DIPA) Polrestabes Semarang Tahun Anggaran 2027;\n1) Program 3130.BHB tentang Pembinaan Pelayanan Fungsi Samapta;\n2) Kegiatan 3130.BHB.004 tentang Layanan Pengaturan, Penjagaan, Pengawalan, dan Patroli;\nc. Kebutuhan dukungan operasional pelaksanaan kegiatan TURWALI rutin pada Unit Samapta dan Unit Lantas Polsek Semarang Selatan.',
      '2. Sehubungan dengan pelaksanaan kegiatan TURWALI Rutin Polsek Urban yang dialokasikan dalam DIPA Tahun Anggaran 2027, bersama ini kami mengajukan usulan pembagian alokasi anggaran antara Unit Samapta dan Unit Lantas Polsek Semarang Selatan, guna mendukung kelancaran pelaksanaan tugas pengaturan, penjagaan, pengawalan, dan patroli serta pelayanan kepada masyarakat;',
      '3. Adapun usulan pembagian alokasi anggaran dimaksud berdasarkan jumlah personel dan volume kegiatan adalah sebagai berikut:\na. Unit Samapta Jumlah personel: 8 (delapan) orang, Volume kegiatan: 270 kegiatan/orang;\nb. Unit Lantas Jumlah personel: 2 (dua) orang, Volume kegiatan: 270 kegiatan/orang;',
      '4. Adapun usulan pembagian tersebut didasarkan pada kebutuhan riil pelaksanaan tugas masing-masing unit, dengan mempertimbangkan jumlah personel, intensitas kegiatan, serta tanggung jawab pelaksanaan tugas di lapangan. Pembagian anggaran diharapkan dapat dilaksanakan secara proporsional, transparan, tertib administrasi, dan sesuai ketentuan pengelolaan keuangan negara;',
    ],
    paragraphsPage2: [
      '5. Sehubungan dengan hal tersebut, mohon kiranya Bapak berkenan memberikan persetujuan dan petunjuk lebih lanjut terhadap usulan pembagian alokasi DIPA dimaksud, sehingga dukungan anggaran dapat dimanfaatkan secara optimal untuk menunjang pelaksanaan tugas Unit Samapta dan Unit Lantas Polsek Semarang Selatan;',
      '6. Demikian surat usulan ini kami sampaikan. Atas perhatian dan kebijaksanaan Bapak, diucapkan terima kasih;',
      '7. Demikian untuk menjadi maklum.',
    ],
    includePersonnelTable: false,
    personnelTableTitle: 'DAFTAR NAMA PERSONEL',
    personnelRows: [],
    signerDelegation: 'NONE',
    signerSuperiorTitle: 'KAPOLRESTABES SEMARANG',
    signerMiddleTitle: 'WAKAPOLRESTABES SEMARANG',
    signerTitle: `${header.signerTitle} POLRESTABES SEMARANG`,
    signerName: normalizeSignerNamePerkap(header.signerName),
    signerRankNrp: normalizeSignerRankNrpPerkap(
      `${header.signerRank} ${header.signerNrp}`
    ),
    tembusan: [
      'Kapolrestabes Semarang',
      'Waka Polrestabes Semarang',
      'Kasi Propam Polrestabes Semarang',
      'Kasi Keuangan Polrestabes Semarang',
    ],
    fontFamily,
  };
}

export const SURAT_BIASA_TEMPLATES: SuratBiasaTemplateItem[] = [
  {
    id: 'tpl-dipa-polsek',
    title: 'Usulan Pembagian Alokasi DIPA Unit Samapta & Unit Lantas (Default Polsek)',
    category: 'Perencanaan / Polsek',
    sourceLabel: 'Template Bawaan Polsek',
    previewNomor: 'B/     /XI/REN.4.1.3./2026',
    previewHal: 'usulan pembagian alokasi DIPA Unit Samapta dan Unit Lantas.',
    directiveCount: 7,
    buildData: (header, todayDateKey, opts) =>
      createDefaultPolsekSuratBiasa(header, todayDateKey, opts?.fontFamily),
  },
  ...REPO_SURAT_BIASA_TEMPLATES.map((tpl) => ({
    id: tpl.id,
    title: tpl.title,
    category: tpl.category,
    sourceLabel: 'Pustaka Template Surat Biasa',
    previewNomor: formatRepoNomorSurat(tpl.identitas),
    previewHal: tpl.identitas.hal,
    directiveCount: tpl.direktifList.length,
    buildData: (
      header: RosterOrgHeader,
      _todayDateKey: string,
      opts?: {
        useCurrentSatkerKopSigner?: boolean;
        fontFamily?: SuratFontFamily;
      }
    ) =>
      convertRepoLetterToSuratBiasa(tpl, {
        header,
        useCurrentSatkerKopSigner: opts?.useCurrentSatkerKopSigner,
        fontFamily: opts?.fontFamily,
      }),
  })),
];

export function parseImportedSuratBiasaJson(
  rawText: string,
  fontFamily: SuratFontFamily = 'Arial'
): SuratBiasaData | null {
  try {
    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;

    // Format 1: SuratBiasaData langsung
    if (
      typeof parsed.nomor === 'string' &&
      Array.isArray(parsed.paragraphsPage1) &&
      typeof parsed.kopAddress === 'string'
    ) {
      const sb = parsed as unknown as SuratBiasaData;
      return {
        ...sb,
        fontFamily: sb.fontFamily ?? fontFamily,
        personnelRows: Array.isArray(sb.personnelRows) ? sb.personnelRows : [],
        paragraphsPage2: Array.isArray(sb.paragraphsPage2)
          ? sb.paragraphsPage2
          : [],
        tembusan: Array.isArray(sb.tembusan) ? sb.tembusan : [],
      };
    }

    // Format 2: LetterDocument dari aplikasi Template Surat Biasa (B/14381)
    if (
      parsed.kop &&
      parsed.identitas &&
      parsed.tujuan &&
      Array.isArray(parsed.direktifList)
    ) {
      return convertRepoLetterToSuratBiasa(
        parsed as unknown as RepoLetterTemplate,
        { fontFamily }
      );
    }

    return null;
  } catch {
    return null;
  }
}
