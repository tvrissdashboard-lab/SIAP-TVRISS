import { Pegawai, UserAccount, PengajuanPelatihan, ApprovalHistoryItem, AuditLogItem, SertifikatPelatihan } from '../types';

// Helper to extract birth date YYYY-MM-DD from 18-digit Indonesian NIP
function nipToBirthDate(nip: string): string {
  if (nip && nip.length >= 8 && !isNaN(Number(nip.substring(0, 8)))) {
    const y = nip.substring(0, 4);
    const m = nip.substring(4, 6);
    const d = nip.substring(6, 8);
    const yearNum = parseInt(y, 10);
    const monthNum = parseInt(m, 10);
    const dayNum = parseInt(d, 10);
    if (yearNum >= 1940 && yearNum <= 2010 && monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
      return `${y}-${m}-${d}`;
    }
  }
  return '1990-01-01';
}

function sha256Inline(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const lengthProperty = 'length';
  let i, j, result = '';
  const words: number[] = [];
  const asciiLength = ascii[lengthProperty] * 8;
  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[ascii[lengthProperty] >> 2] |= 0x80 << ((3 - (ascii[lengthProperty] % 4)) * 8);
  words[(((ascii[lengthProperty] + 8) >> 6) << 4) + 15] = asciiLength;
  for (i = 0; i < words[lengthProperty]; i += 16) {
    const w = words.slice(i, i + 16);
    const oldHash = hash.slice(0);
    for (j = 0; j < 64; j++) {
      const w15 = w[j - 15], w2 = w[j - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[j] = (j < 16) ? w[j] : (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      const a = hash[0], e = hash[4];
      const temp1 = hash[7] + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) + k[j] + (w[j] | 0);
      const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(temp1 + temp2) | 0, hash[0], hash[1], hash[2], (hash[3] + temp1) | 0, hash[4], hash[5], hash[6]];
    }
    for (j = 0; j < 8; j++) hash[j] = (hash[j] + oldHash[j]) | 0;
  }
  for (j = 0; j < 8; j++) {
    for (i = 3; i >= 0; i--) {
      const b = (hash[j] >> (i * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

const rawPegawaiData: Array<{
  nip: string;
  nama: string;
  jabatan: string;
  golPangkat: string;
  statusPegawai: 'PNS' | 'PPPK' | 'KONTRAK';
  unitKerja: string;
}> = [
  // --- UNOR UMUM ---
  { nip: '197003061998032006', nama: 'EFLIANTY ANALISA', jabatan: 'Kepala TVRI Stasiun Sumatera Selatan', golPangkat: 'IV c / Pembina Utama Muda', statusPegawai: 'PNS', unitKerja: 'UNOR UMUM' },
  { nip: '197609101999032002', nama: 'TITIN ANDRIANTI', jabatan: 'Kasubbag Tata Usaha', golPangkat: 'III d / Penata Tingkat I', statusPegawai: 'PNS', unitKerja: 'UNOR UMUM' },
  { nip: '197201151994032005', nama: 'MELLITA DIANALIA', jabatan: 'Analis Kepegawaian/Analis SDM Aparatur Ahli Madya', golPangkat: 'IV a / Pembina', statusPegawai: 'PNS', unitKerja: 'UNOR UMUM' },
  { nip: '197102151993031004', nama: 'MUHAMAD EDISON', jabatan: 'Teknisi Siaran Ahli Muda', golPangkat: 'III d / Penata Tingkat I', statusPegawai: 'PNS', unitKerja: 'UNOR UMUM' },
  { nip: '196906062014092002', nama: 'HENY WIDIANTI', jabatan: 'Penata Layanan Operasional', golPangkat: 'III c / Penata', statusPegawai: 'PNS', unitKerja: 'UNOR UMUM' },
  { nip: '199811032022032010', nama: 'DEVI ANUGRAH MULIA', jabatan: 'Pengelola Data dan Informasi', golPangkat: 'II c / Pengatur', statusPegawai: 'PNS', unitKerja: 'UNOR UMUM' },
  { nip: '198305052025211060', nama: 'MEYDIANSYAH', jabatan: 'Penata Layanan Operasional', golPangkat: 'IX', statusPegawai: 'PPPK', unitKerja: 'UNOR UMUM' },
  { nip: '199602152025212031', nama: 'NICEN CAROLINE', jabatan: 'Pengelola Layanan Operasional', golPangkat: 'VII', statusPegawai: 'PPPK', unitKerja: 'UNOR UMUM' },
  { nip: '197305012025211020', nama: 'INDRAWAN SAPUTRA', jabatan: 'Penata Layanan Operasional', golPangkat: 'IX', statusPegawai: 'PPPK', unitKerja: 'UNOR UMUM' },
  { nip: '198607072025211067', nama: 'CIKO MARADONA SIREGAR', jabatan: 'Pengelola Layanan Operasional', golPangkat: 'VII', statusPegawai: 'PPPK', unitKerja: 'UNOR UMUM' },
  { nip: '199611212025211013', nama: 'DENI FATRIAWAN', jabatan: 'Penata Layanan Operasional', golPangkat: 'IX', statusPegawai: 'PPPK', unitKerja: 'UNOR UMUM' },
  { nip: '199011202025211021', nama: 'MUHAMMAD ADE PUTRA', jabatan: 'Penata Layanan Operasional', golPangkat: 'IX', statusPegawai: 'PPPK', unitKerja: 'UNOR UMUM' },
  { nip: '199406282025212024', nama: 'RESTY PARAMITHA', jabatan: 'Penata Layanan Operasional', golPangkat: 'IX', statusPegawai: 'PPPK', unitKerja: 'UNOR UMUM' },
  { nip: '199701072025212018', nama: 'JENUORA SYA\'BANIDZA', jabatan: 'Pengelola Layanan Operasional', golPangkat: 'VII', statusPegawai: 'PPPK', unitKerja: 'UNOR UMUM' },
  { nip: '199909102024211001', nama: 'DANDI SAPUTRA', jabatan: 'Arsiparis Pertama', golPangkat: 'IX', statusPegawai: 'PPPK', unitKerja: 'UNOR UMUM' },
  { nip: '199607232025042002', nama: 'RETNO PRIWULANDARI', jabatan: 'Analis Sumber Daya Manusia Aparatur Ahli Pertama', golPangkat: 'III a / Penata Muda', statusPegawai: 'PNS', unitKerja: 'UNOR UMUM' },
  { nip: '200107152025042004', nama: 'LUTHFIYYAH MUFIDAH', jabatan: 'Pranata Sumber Daya Manusia Aparatur Terampil', golPangkat: 'II c / Pengatur', statusPegawai: 'PNS', unitKerja: 'UNOR UMUM' },
  { nip: '200004182025041003', nama: 'AHMAD NAUFAL FAHREZI', jabatan: 'Penata Kelola Pemerintahan', golPangkat: 'III a / Penata Muda', statusPegawai: 'PNS', unitKerja: 'UNOR UMUM' },
  { nip: '199602222025041001', nama: 'ARIFUDIN', jabatan: 'Penata Kelola Pemerintahan', golPangkat: 'III a / Penata Muda', statusPegawai: 'PNS', unitKerja: 'UNOR UMUM' },
  { nip: '199901072025041004', nama: 'M HARRYASA TAFANI', jabatan: 'Penata Kelola Pemerintahan', golPangkat: 'III a / Penata Muda', statusPegawai: 'PNS', unitKerja: 'UNOR UMUM' },
  { nip: '200103272025042002', nama: 'BELLA HIDIYAN SAFITRI', jabatan: 'Penata Kelola Pemerintahan', golPangkat: 'III a / Penata Muda', statusPegawai: 'PNS', unitKerja: 'UNOR UMUM' },

  // --- UNOR KEUANGAN ---
  { nip: '197008211998032002', nama: 'JUMIATI', jabatan: 'Analis Pengelolaan Keuangan APBN Ahli Muda', golPangkat: 'III d / Penata Tingkat I', statusPegawai: 'PNS', unitKerja: 'UNOR KEUANGAN' },
  { nip: '196909191994122002', nama: 'SARJANA', jabatan: 'Penelaah Teknis Kebijakan', golPangkat: 'III b / Penata Muda Tingkat I', statusPegawai: 'PNS', unitKerja: 'UNOR KEUANGAN' },
  { nip: '196809051997032003', nama: 'LISBARA RIZQI', jabatan: 'Pengelola Pengadaan Barang /Jasa Ahli Muda', golPangkat: 'IV a / Pembina', statusPegawai: 'PNS', unitKerja: 'UNOR KEUANGAN' },
  { nip: '197209292014092001', nama: 'YENNI ANGRAINI', jabatan: 'Penata Layanan Operasional', golPangkat: 'III a / Penata Muda', statusPegawai: 'PNS', unitKerja: 'UNOR KEUANGAN' },
  { nip: '198709032022031002', nama: 'RENGGA ARISTA', jabatan: 'Asisten Teknisi Siaran Terampil', golPangkat: 'II c / Pengatur', statusPegawai: 'PNS', unitKerja: 'UNOR KEUANGAN' },
  { nip: '199504152025212032', nama: 'SANDRA APRILIANA LATUCONSINA', jabatan: 'Penata Layanan Operasional', golPangkat: 'IX', statusPegawai: 'PPPK', unitKerja: 'UNOR KEUANGAN' },
  { nip: '199005192025042001', nama: 'SRITA PUTRI SURYANI', jabatan: 'Analis Anggaran Ahli Pertama', golPangkat: 'III a / Penata Muda', statusPegawai: 'PNS', unitKerja: 'UNOR KEUANGAN' },
  { nip: '199012272025042003', nama: 'RIZKY DINA MAHRIZA', jabatan: 'Analis Pengelolaan Keuangan APBN Ahli Pertama', golPangkat: 'III a / Penata Muda', statusPegawai: 'PNS', unitKerja: 'UNOR KEUANGAN' },
  { nip: '200011302025041002', nama: 'MAHGRIBI ANJAS ROMADHON', jabatan: 'Penata Kelola Pemerintahan', golPangkat: 'III a / Penata Muda', statusPegawai: 'PNS', unitKerja: 'UNOR KEUANGAN' },
  { nip: '199209182025041002', nama: 'ARIF ROSYIDIN', jabatan: 'Arsiparis Terampil', golPangkat: 'II c / Pengatur', statusPegawai: 'PNS', unitKerja: 'UNOR KEUANGAN' },

  // --- UNOR PROGRAM DAN BERITA ---
  { nip: '197103101994032006', nama: 'MARHAMAH IDAWATI', jabatan: 'Pranata Siaran Ahli Madya', golPangkat: 'IV b / Pembina Tingkat I', statusPegawai: 'PNS', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '197207311992032002', nama: 'LIDYA ULY CATHERINE', jabatan: 'Pranata Siaran Ahli Madya', golPangkat: 'IV a / Pembina', statusPegawai: 'PNS', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '196908171994031010', nama: 'ALAM GUNAWAN', jabatan: 'Pranata Siaran Ahli Muda', golPangkat: 'IV a / Pembina', statusPegawai: 'PNS', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '196910071999031001', nama: 'DEDI DANIALDI PUSPANEGARA', jabatan: 'Pranata Siaran Ahli Muda', golPangkat: 'III d / Penata Tingkat I', statusPegawai: 'PNS', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '197010011999031006', nama: 'MUHAMMAD RIDHWAN', jabatan: 'Pranata Siaran Ahli Muda', golPangkat: 'IV a / Pembina', statusPegawai: 'PNS', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '197206181993031002', nama: 'JUNIAWAN', jabatan: 'Pranata Siaran Ahli Muda', golPangkat: 'III d / Penata Tingkat I', statusPegawai: 'PNS', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '197205121993022001', nama: 'YUNIARTI NINGSIH', jabatan: 'Penata Layanan Operasional', golPangkat: 'III b / Penata Muda Tingkat I', statusPegawai: 'PNS', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '199511142020122009', nama: 'CIKYAH', jabatan: 'Pranata Siaran Ahli Pertama', golPangkat: 'III b / Penata Muda Tingkat I', statusPegawai: 'PNS', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '199405222020122005', nama: 'KURNIAWATI', jabatan: 'Pranata Siaran Ahli Pertama', golPangkat: 'III b / Penata Muda Tingkat I', statusPegawai: 'PNS', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '199504282022031004', nama: 'M. HUSIN FADILLAH', jabatan: 'Pranata Siaran Ahli Pertama', golPangkat: 'III b / Penata Muda Tingkat I', statusPegawai: 'PNS', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '196709211992031005', nama: 'EKA BUDI WIGIYANTA', jabatan: 'Pranata Siaran Ahli Madya', golPangkat: 'IV b / Pembina', statusPegawai: 'PNS', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '196910111994031002', nama: 'RAMOS HSK', jabatan: 'Asisten Pranata Siaran Mahir', golPangkat: 'III a / Penata Muda', statusPegawai: 'PNS', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '196812231992032002', nama: 'ARISTASARI', jabatan: 'Asisten Pranata Siaran Penyelia', golPangkat: 'III c / Penata', statusPegawai: 'PNS', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '197109061993032001', nama: 'DWI HARTATI', jabatan: 'Asisten Pranata Siaran Penyelia', golPangkat: 'III d / Penata Tingkat I', statusPegawai: 'PNS', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '197506131994121001', nama: 'WIJAYA KUSUMA PUTRA', jabatan: 'Pranata Siaran Ahli Muda', golPangkat: 'III c / Penata', statusPegawai: 'PNS', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '197303031994032004', nama: 'AZNAWATI', jabatan: 'Asisten Pranata Siaran Mahir', golPangkat: 'III c / Penata', statusPegawai: 'PNS', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '197206161994031002', nama: 'HAERU NASRI', jabatan: 'Operator Layanan Operasional', golPangkat: 'III a / Penata Muda', statusPegawai: 'PNS', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '196908231998032002', nama: 'NURZAITI', jabatan: 'Penata Acara', golPangkat: 'IV a / Pembina', statusPegawai: 'PNS', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '197203292014091002', nama: 'HERRY', jabatan: 'Pengelola Layanan Operasional', golPangkat: 'II c / Pengatur', statusPegawai: 'PNS', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '199110172025211026', nama: 'AUVI PUTRA FARIN', jabatan: 'Penata Layanan Operasional', golPangkat: 'IX', statusPegawai: 'PPPK', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '197909092025211036', nama: 'EFRAN', jabatan: 'Operator Layanan Operasional', golPangkat: 'V', statusPegawai: 'PPPK', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '197508072022211005', nama: 'ERWIN ARDIANSYAH', jabatan: 'Pranata Siaran Ahli Pertama', golPangkat: 'III a', statusPegawai: 'PPPK', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '198302012022211014', nama: 'FRANS REZA', jabatan: 'Pranata Siaran Ahli Pertama', golPangkat: 'III a', statusPegawai: 'PPPK', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '198307262022212031', nama: 'ARI EKA SARI', jabatan: 'Pranata Siaran Ahli Pertama', golPangkat: 'IX', statusPegawai: 'PPPK', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '199112092022211013', nama: 'RIO DESMUL HARYADI', jabatan: 'Pranata Siaran Ahli Pertama', golPangkat: 'IX', statusPegawai: 'PPPK', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '199811172024212002', nama: 'BALQIS HIJRAH NURHIDAYAH JANNAH', jabatan: 'Pranata Siaran Ahli Pertama', golPangkat: 'IX', statusPegawai: 'PPPK', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '199305102024211001', nama: 'RAGIL HERDA FRANSYOKI', jabatan: 'Asisten Pranata Siaran Terampil', golPangkat: 'VII', statusPegawai: 'PPPK', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '198405252025211038', nama: 'RULI ANSORI', jabatan: 'Pengelola Layanan Operasional', golPangkat: 'VII', statusPegawai: 'PPPK', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '199702012025211016', nama: 'M NAUFAL FITRIANSYAH', jabatan: 'Penata Layanan Operasional', golPangkat: 'IX', statusPegawai: 'PPPK', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '199906122025042004', nama: 'AFIVA SARI', jabatan: 'Pranata Siaran Ahli Pertama', golPangkat: 'III a / Penata Muda', statusPegawai: 'PNS', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '199708242025041002', nama: 'HALIF RADANOL ILHAM', jabatan: 'Pranata Siaran Ahli Pertama', golPangkat: 'III a / Penata Muda', statusPegawai: 'PNS', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '199802242022032009', nama: 'CHRISTINA TITI PURWANDHARI', jabatan: 'Pranata Siaran Ahli Pertama', golPangkat: 'III b / Penata Muda Tingkat I', statusPegawai: 'PNS', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '199710012025042004', nama: 'SRI HERTINA', jabatan: 'Pranata Siaran Ahli Pertama', golPangkat: 'III a / Penata Muda', statusPegawai: 'PNS', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '200001302025042006', nama: 'NAJLA PUTRI MARDHIAH', jabatan: 'Pranata Siaran Ahli Pertama', golPangkat: 'III a / Penata Muda', statusPegawai: 'PNS', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '200008082025042002', nama: 'LARA HATI', jabatan: 'Pranata Siaran Ahli Pertama', golPangkat: 'III a / Penata Muda', statusPegawai: 'PNS', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '200001112025042003', nama: 'MILLENIA SAFITRI', jabatan: 'Pranata Siaran Ahli Pertama', golPangkat: 'III a / Penata Muda', statusPegawai: 'PNS', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '199411272025042001', nama: 'NURUL FITRIA', jabatan: 'Pranata Siaran Ahli Pertama', golPangkat: 'III a / Penata Muda', statusPegawai: 'PNS', unitKerja: 'UNOR PROGRAM DAN BERITA' },
  { nip: '200001142025042008', nama: 'MARIA MILENIA CASENOBE', jabatan: 'Pranata Siaran Ahli Pertama', golPangkat: 'III a / Penata Muda', statusPegawai: 'PNS', unitKerja: 'UNOR PROGRAM DAN BERITA' },

  // --- UNOR KONTEN MEDIA BARU ---
  { nip: '196910311999032001', nama: 'YENNI SURYANI', jabatan: 'Pranata Hubungan Masyarakat Ahli Muda', golPangkat: 'III d / Penata Tingkat I', statusPegawai: 'PNS', unitKerja: 'UNOR KONTEN MEDIA BARU' },
  { nip: '198412232022211013', nama: 'FAHRIHOYAS KALAMONAN', jabatan: 'Teknisi Siaran Ahli Pertama', golPangkat: 'IX', statusPegawai: 'PPPK', unitKerja: 'UNOR KONTEN MEDIA BARU' },
  { nip: '199902102025042006', nama: 'HANIFAH KHAIRUNISAH', jabatan: 'Pranata Siaran Ahli Pertama', golPangkat: 'III a / Penata Muda', statusPegawai: 'PNS', unitKerja: 'UNOR KONTEN MEDIA BARU' },
  { nip: '199905042025041002', nama: 'M. DERAL PUTRA RIZKY', jabatan: 'Pranata Siaran Ahli Pertama', golPangkat: 'III a / Penata Muda', statusPegawai: 'PNS', unitKerja: 'UNOR KONTEN MEDIA BARU' },
  { nip: '199809172025041003', nama: 'GUMANDA TUA SIHOTANG', jabatan: 'Asisten Pranata Siaran Terampil', golPangkat: 'II c / Pengatur', statusPegawai: 'PNS', unitKerja: 'UNOR KONTEN MEDIA BARU' },
  { nip: '198707192022211010', nama: 'TIRTA DHARMA WANAGIRI', jabatan: 'Asisten Teknisi Siaran Terampil', golPangkat: 'VII', statusPegawai: 'PPPK', unitKerja: 'UNOR KONTEN MEDIA BARU' },
  { nip: '198307282022211016', nama: 'MUZHAR APANDI', jabatan: 'Pranata Siaran Ahli Pertama', golPangkat: 'IX', statusPegawai: 'PPPK', unitKerja: 'UNOR KONTEN MEDIA BARU' },
  { nip: '200211162025042001', nama: 'INEZ WIANDA YUBI RAHMADHINI', jabatan: 'Pranata Siaran Ahli Pertama', golPangkat: 'III a / Penata Muda', statusPegawai: 'PNS', unitKerja: 'UNOR KONTEN MEDIA BARU' },
  { nip: '200006202025042005', nama: 'ALVRIZA SULISTYONINGTYAS', jabatan: 'Asisten Pranata Siaran Terampil', golPangkat: 'II c / Pengatur', statusPegawai: 'PNS', unitKerja: 'UNOR KONTEN MEDIA BARU' },
  { nip: '198712292022211009', nama: 'HADI SISULO', jabatan: 'Pranata Siaran Ahli Pertama', golPangkat: 'IX', statusPegawai: 'PPPK', unitKerja: 'UNOR KONTEN MEDIA BARU' },

  // --- UNOR TEKNIK ---
  { nip: '197409051994031009', nama: 'MUHLISIN', jabatan: 'Teknisi Siaran Ahli Muda', golPangkat: 'III d / Penata Tingkat I', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '199010292020122006', nama: 'UTARI OKTAVIANTI', jabatan: 'Teknisi Siaran Ahli Pertama', golPangkat: 'III b / Penata Muda Tingkat I', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '199608092020121004', nama: 'ABDUR RAHMAN', jabatan: 'Teknisi Siaran Ahli Pertama', golPangkat: 'III b / Penata Muda Tingkat I', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '196811151993031003', nama: 'AHMAD ZULTOYO', jabatan: 'Asisten Teknisi Siaran Penyelia', golPangkat: 'III c / Penata', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '199306252022031010', nama: 'ADITYA BAHRIANDI', jabatan: 'Asisten Teknisi Siaran Terampil', golPangkat: 'II d / Pengatur Tingkat I', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '199506092020121003', nama: 'AGIL YURENDI', jabatan: 'Asisten Teknisi Siaran Terampil', golPangkat: 'II d / Pengatur Tingkat I', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '199809172022032007', nama: 'WENY SEPTIANA', jabatan: 'Asisten Teknisi Siaran Terampil', golPangkat: 'II d / Pengatur Tingkat I', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '199909032022032003', nama: 'AMIRA SYIFA RITONGA', jabatan: 'Asisten Teknisi Siaran Terampil', golPangkat: 'II c / Pengatur', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '200005272022032001', nama: 'DILA ROSALIA', jabatan: 'Asisten Teknisi Siaran Terampil', golPangkat: 'II d / Pengatur', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '200101012022032001', nama: 'AVILERINA HAFIZHO', jabatan: 'Asisten Teknisi Siaran Terampil', golPangkat: 'II d / Pengatur Tingkat I', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '196906141994031002', nama: 'RIZAL RUSMAN', jabatan: 'Asisten Teknisi Siaran Penyelia', golPangkat: 'III c / Penata', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '197104081993031007', nama: 'INDRA JUNAIDI', jabatan: 'Asisten Teknisi Siaran Penyelia', golPangkat: 'III c / Penata', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '197007171991031004', nama: 'BUSTAMI', jabatan: 'Asisten Teknisi Siaran Penyelia', golPangkat: 'III d / Penata Tingkat I', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '197405121993031002', nama: 'ALPATONI', jabatan: 'Asisten Teknisi Siaran Penyelia', golPangkat: 'III c / Penata', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '196811102014091001', nama: 'MULYANI', jabatan: 'Penata Layanan Operasional', golPangkat: 'II c / Pengatur', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '196812272014091001', nama: 'MAHMUD', jabatan: 'Penata Layanan Operasional', golPangkat: 'II c / Pengatur', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '196904012014091001', nama: 'ALI USMAN', jabatan: 'Penata Layanan Operasional', golPangkat: 'II c / Pengatur', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '196906011998031011', nama: 'SUTIO', jabatan: 'Penata Layanan Operasional', golPangkat: 'III d / Penata Tingkat I', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '196907142014091002', nama: 'KARSIM', jabatan: 'Penata Layanan Operasional', golPangkat: 'II c / Pengatur', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '197005231991031003', nama: 'ZAMZAM', jabatan: 'Penata Layanan Operasional', golPangkat: 'III b / Penata Muda Tingkat I', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '197108101991031002', nama: 'AGUS SALIM', jabatan: 'Operator Layanan Operasional', golPangkat: 'III b / Penata Muda Tingkat I', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '197303232014091002', nama: 'BAMBANG IRAWANSYAH', jabatan: 'Operator Layanan Operasional', golPangkat: 'II c / Pengatur', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '197304242014091002', nama: 'ZAKARIA', jabatan: 'Penata Layanan Operasional', golPangkat: 'III b / Penata Muda Tingkat I', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '197403242014091001', nama: 'ANTONI ZAINAL', jabatan: 'Penata Layanan Operasional', golPangkat: 'II c / Pengatur', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '197404162014091001', nama: 'FERRYZAL', jabatan: 'Operator Layanan Operasional', golPangkat: 'II c / Pengatur', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '197702172014091003', nama: 'SUTOPO', jabatan: 'Operator Layanan Operasional', golPangkat: 'II c / Pengatur', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '197704092014091001', nama: 'ZAINI', jabatan: 'Operator Layanan Operasional', golPangkat: 'II c / Pengatur', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '197709262014092001', nama: 'FITRIA DWI HASTUTI', jabatan: 'Penata Layanan Operasional', golPangkat: 'III c / Penata', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '197807112014091001', nama: 'DAHLAN', jabatan: 'Penata Layanan Operasional', golPangkat: 'II c / Pengatur', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '198312102022211012', nama: 'IBNU HAJAR', jabatan: 'Teknisi Siaran Ahli Pertama', golPangkat: 'IX', statusPegawai: 'PPPK', unitKerja: 'UNOR TEKNIK' },
  { nip: '198404232022211011', nama: 'HIMAWAN', jabatan: 'Teknisi Siaran Ahli Pertama', golPangkat: 'IX', statusPegawai: 'PPPK', unitKerja: 'UNOR TEKNIK' },
  { nip: '198608022022211005', nama: 'AGUS WULAN AFIT', jabatan: 'Teknisi Siaran Ahli Pertama', golPangkat: 'IX', statusPegawai: 'PPPK', unitKerja: 'UNOR TEKNIK' },
  { nip: '199105072023211015', nama: 'MARDIANSYAH HAFIZ NASUTION, S.T.', jabatan: 'Teknisi Siaran Ahli Pertama', golPangkat: 'IX', statusPegawai: 'PPPK', unitKerja: 'UNOR TEKNIK' },
  { nip: '199503092023211011', nama: 'VALLERY MEDISTA RIZKY, S.Kom.', jabatan: 'Teknisi Siaran Ahli Pertama', golPangkat: 'IX', statusPegawai: 'PPPK', unitKerja: 'UNOR TEKNIK' },
  { nip: '199205272024211000', nama: 'M. BUDI DARMAWAN', jabatan: 'Teknisi Siaran Ahli Pertama', golPangkat: 'IX', statusPegawai: 'PPPK', unitKerja: 'UNOR TEKNIK' },
  { nip: '198212042022211006', nama: 'DONALD EBENHEISER NDOLU', jabatan: 'Asisten Teknisi Siaran Terampil', golPangkat: 'VII', statusPegawai: 'PPPK', unitKerja: 'UNOR TEKNIK' },
  { nip: '199408232024211001', nama: 'R.D. MAULANA ISHAK', jabatan: 'Asisten Teknisi Siaran Terampil', golPangkat: 'VII', statusPegawai: 'PPPK', unitKerja: 'UNOR TEKNIK' },
  { nip: '198909292022211012', nama: 'EDIS BRONSON', jabatan: 'Asisten Teknisi Siaran Terampil', golPangkat: 'VII', statusPegawai: 'PPPK', unitKerja: 'UNOR TEKNIK' },
  { nip: '199204052023211013', nama: 'FREDDY, A.Md.', jabatan: 'Asisten Teknisi Siaran Terampil', golPangkat: 'VII', statusPegawai: 'PPPK', unitKerja: 'UNOR TEKNIK' },
  { nip: '199302102022212015', nama: 'IKLIMA SEKAR TANJUNG', jabatan: 'Asisten Teknisi Siaran Terampil', golPangkat: 'VII', statusPegawai: 'PPPK', unitKerja: 'UNOR TEKNIK' },
  { nip: '198401222022211008', nama: 'YANCE ERNANTA', jabatan: 'Asisten Teknisi Siaran Terampil', golPangkat: 'V', statusPegawai: 'PPPK', unitKerja: 'UNOR TEKNIK' },
  { nip: '198806182022211006', nama: 'MUHAMMAD DANIL', jabatan: 'Asisten Teknisi Siaran Pemula', golPangkat: 'V', statusPegawai: 'PPPK', unitKerja: 'UNOR TEKNIK' },
  { nip: '198009232022211006', nama: 'MUSLIM', jabatan: 'Asisten Teknisi Siaran Terampil', golPangkat: 'V', statusPegawai: 'PPPK', unitKerja: 'UNOR TEKNIK' },
  { nip: '199308152025211022', nama: 'SALEH ALKABIR', jabatan: 'Pengelola Layanan Operasional', golPangkat: 'VII', statusPegawai: 'PPPK', unitKerja: 'UNOR TEKNIK' },
  { nip: '200001032025211010', nama: 'RIYAN KURNIAWAN', jabatan: 'Operator Layanan Operasional', golPangkat: 'V', statusPegawai: 'PPPK', unitKerja: 'UNOR TEKNIK' },
  { nip: '200002152025211004', nama: 'MUHAMMAD FEBRIANSYAH', jabatan: 'Operator Layanan Operasional', golPangkat: 'V', statusPegawai: 'PPPK', unitKerja: 'UNOR TEKNIK' },
  { nip: '200210252025211001', nama: 'BELBI CANDRA YUDA', jabatan: 'Operator Layanan Operasional', golPangkat: 'V', statusPegawai: 'PPPK', unitKerja: 'UNOR TEKNIK' },
  { nip: '200302232025211001', nama: 'M. AMIN FAUZAN', jabatan: 'Operator Layanan Operasional', golPangkat: 'V', statusPegawai: 'PPPK', unitKerja: 'UNOR TEKNIK' },
  { nip: '199702172025212013', nama: 'ROSA FEBRIANTI', jabatan: 'Penata Layanan Operasional', golPangkat: 'IX', statusPegawai: 'PPPK', unitKerja: 'UNOR TEKNIK' },
  { nip: '199903132025211009', nama: 'EEF PRATAMA PUTRA', jabatan: 'Pengelola Layanan Operasional', golPangkat: 'VII', statusPegawai: 'PPPK', unitKerja: 'UNOR TEKNIK' },
  { nip: '200203122025042001', nama: 'DEVI SILVIA MAHARANI', jabatan: 'Asisten Teknisi Siaran Terampil', golPangkat: 'II c / Pengatur', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '199910182025042004', nama: 'OKKY ANDRIANI', jabatan: 'Asisten Teknisi Siaran Terampil', golPangkat: 'II c / Pengatur', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '199806262025042003', nama: 'MAUDI AULIA', jabatan: 'Asisten Teknisi Siaran Terampil', golPangkat: 'II c / Pengatur', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '200108102025042002', nama: 'AISYAH KHAIRANI', jabatan: 'Asisten Teknisi Siaran Terampil', golPangkat: 'II c / Pengatur', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '199407072025042005', nama: 'ARMIYANTI DIAN KARTIKA SARI', jabatan: 'Asisten Teknisi Siaran Terampil', golPangkat: 'II c / Pengatur', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '200411212025041001', nama: 'AL ZIKRI', jabatan: 'Asisten Teknisi Siaran Pemula', golPangkat: 'II a / Pengatur Muda', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '200307172025042001', nama: 'ANNISA AZIZIYAH', jabatan: 'Asisten Teknisi Siaran Pemula', golPangkat: 'II a / Pengatur Muda', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '200312192025042001', nama: 'AQILA SHIFA BILBINA HUTAGALUNG', jabatan: 'Asisten Teknisi Siaran Pemula', golPangkat: 'II a / Pengatur Muda', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '200306052025041003', nama: 'MUHAMMAD ALDO SAPUTRA', jabatan: 'Asisten Teknisi Siaran Pemula', golPangkat: 'II a / Pengatur Muda', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '199910062025041003', nama: 'MUHAMMAD BAGOES IRWANDI', jabatan: 'Asisten Teknisi Siaran Pemula', golPangkat: 'II a / Pengatur Muda', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '200504112025041001', nama: 'MUHAMMAD DONI APRINALDI', jabatan: 'Asisten Teknisi Siaran Pemula', golPangkat: 'II a / Pengatur Muda', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '200510232025042001', nama: 'NADIA WAHYU RAMADHANI', jabatan: 'Asisten Teknisi Siaran Pemula', golPangkat: 'II a / Pengatur Muda', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '200205142025041002', nama: 'R.M. FADLI RINALDI', jabatan: 'Asisten Teknisi Siaran Pemula', golPangkat: 'II a / Pengatur Muda', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '199507062025041001', nama: 'RENDI DWI YULIAN', jabatan: 'Asisten Teknisi Siaran Pemula', golPangkat: 'II a / Pengatur Muda', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '199502232025041003', nama: 'RICKI RAMDANI', jabatan: 'Asisten Teknisi Siaran Pemula', golPangkat: 'II a / Pengatur Muda', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '200307012025042002', nama: 'SHAFIYAH FABIATY', jabatan: 'Asisten Teknisi Siaran Pemula', golPangkat: 'II a / Pengatur Muda', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '200105252025042005', nama: 'WIDIA SALSABILA', jabatan: 'Asisten Teknisi Siaran Pemula', golPangkat: 'II a / Pengatur Muda', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '199811282025042003', nama: 'WINDA ANDEA UTAMI', jabatan: 'Asisten Teknisi Siaran Pemula', golPangkat: 'II a / Pengatur Muda', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '200308132025042002', nama: 'SIWI ASRI HANIFAH', jabatan: 'Asisten Teknisi Siaran Pemula', golPangkat: 'II a / Pengatur Muda', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '200503042025041001', nama: 'ARYA MUSTAKIM IMAM', jabatan: 'Asisten Teknisi Siaran Pemula', golPangkat: 'II a / Pengatur Muda', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '199903142025041001', nama: 'DEWANTARA', jabatan: 'Asisten Teknisi Siaran Pemula', golPangkat: 'II a / Pengatur Muda', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '200104082025041001', nama: 'M. FAJRI HIDAYAH', jabatan: 'Asisten Teknisi Siaran Pemula', golPangkat: 'II a / Pengatur Muda', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '199310032025041001', nama: 'DWI SAPTO WIDODO', jabatan: 'Asisten Teknisi Siaran Pemula', golPangkat: 'II a / Pengatur Muda', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '200003132025042004', nama: 'UMMU AIMAN ZAKIYAH KIRTI', jabatan: 'Asisten Teknisi Siaran Pemula', golPangkat: 'II a / Pengatur Muda', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },
  { nip: '199907172025041002', nama: 'AHMAD LAUTA MARDATILLAH', jabatan: 'Asisten Teknisi Siaran Pemula', golPangkat: 'II a / Pengatur Muda', statusPegawai: 'PNS', unitKerja: 'UNOR TEKNIK' },

  // --- UNOR PENGEMBANGAN USAHA ---
  { nip: '196901021996032002', nama: 'RITA NIARTI', jabatan: 'Pranata Siaran Ahli Madya', golPangkat: 'IV a / Pembina', statusPegawai: 'PNS', unitKerja: 'UNOR PENGEMBANGAN USAHA' },
  { nip: '200002282022032001', nama: 'NADA ZAKIAH', jabatan: 'Pengelola Pemasaran', golPangkat: 'II d / Pengatur Tingkat I', statusPegawai: 'PNS', unitKerja: 'UNOR PENGEMBANGAN USAHA' },
  { nip: '197008261994032003', nama: 'SRI NELLY HERAWATI.', jabatan: 'Penelaah Teknis Kebijakan', golPangkat: 'IV a / Pembina', statusPegawai: 'PNS', unitKerja: 'UNOR PENGEMBANGAN USAHA' },
  { nip: '199110302024212002', nama: 'RANI TARULIA', jabatan: 'Pranata Hubungan Masyarakat Pertama', golPangkat: 'IX', statusPegawai: 'PPPK', unitKerja: 'UNOR PENGEMBANGAN USAHA' },
  { nip: '198604052025212045', nama: 'NUR APRIANI', jabatan: 'Penata Layanan Operasional', golPangkat: 'IX', statusPegawai: 'PPPK', unitKerja: 'UNOR PENGEMBANGAN USAHA' },

  // --- TENAGA KONTRAK ---
  { nip: 'KTR001', nama: 'ADI GUNAWAN SAPUTRO', jabatan: 'Reporter', golPangkat: '-', statusPegawai: 'KONTRAK', unitKerja: 'TENAGA KONTRAK' },
  { nip: 'KTR002', nama: 'MUHAMMAD RIFQI', jabatan: 'Operator Teknik', golPangkat: '-', statusPegawai: 'KONTRAK', unitKerja: 'TENAGA KONTRAK' },
];

export const INITIAL_PEGAWAI: Pegawai[] = rawPegawaiData.map((item, idx) => ({
  id: `EMP${String(idx + 1).padStart(5, '0')}`,
  nip: item.nip,
  nama: item.nama,
  tanggalLahir: nipToBirthDate(item.nip),
  jabatan: item.jabatan,
  golPangkat: item.golPangkat,
  statusPegawai: item.statusPegawai,
  unitKerja: item.unitKerja,
  email: `${item.nama.toLowerCase().replace(/[^a-z0-g]/g, '.')}@tvri.go.id`,
  aktif: true,
  createdAt: '2025-01-10T08:00:00Z',
}));

export const INITIAL_USERS: UserAccount[] = [
  // Kepala Stasiun (EFLIANTY ANALISA - NIP: 197003061998032006 -> 06031970)
  // Role: PEGAWAI (Hak Akses Monitoring Tambahan diperoleh via Jabatan: Kepala TVRI Stasiun Sumatera Selatan)
  {
    id: 'USR00001',
    employeeId: 'EMP00001',
    username: '197003061998032006',
    passwordHash: sha256Inline('06031970'),
    role: 'PEGAWAI',
    isFirstLogin: false,
    isActive: true,
    lastLogin: '2026-07-24T08:00:00Z',
    createdAt: '2025-01-10T08:00:00Z',
  },
  // Admin / Verifikator (Akun Operasional Sistem - Standalone System Account)
  {
    id: 'USR00002',
    employeeId: '',
    username: 'admin',
    passwordHash: sha256Inline('sdmtvrisumsel'),
    role: 'ADMIN_SDM',
    isFirstLogin: false,
    isActive: true,
    lastLogin: '2026-07-24T08:30:00Z',
    createdAt: '2025-01-10T08:30:00Z',
  },
  // Pegawai (MUHLISIN - NIP: 197409051994031009 -> 05091974)
  {
    id: 'USR00003',
    employeeId: 'EMP00072',
    username: '197409051994031009',
    passwordHash: sha256Inline('05091974'),
    role: 'PEGAWAI',
    isFirstLogin: false,
    isActive: true,
    lastLogin: '2026-07-23T14:10:00Z',
    createdAt: '2025-01-12T09:00:00Z',
  },
  // Pegawai (YENNI SURYANI - NIP: 196910311999032001 -> 31101969)
  {
    id: 'USR00004',
    employeeId: 'EMP00062',
    username: '196910311999032001',
    passwordHash: sha256Inline('31101969'),
    role: 'PEGAWAI',
    isFirstLogin: false,
    isActive: true,
    lastLogin: '2026-07-22T09:45:00Z',
    createdAt: '2025-01-15T10:15:00Z',
  }
];

export const INITIAL_SUBMISSIONS: PengajuanPelatihan[] = [
  {
    id: 'SUB00001',
    nomor: 'SUB-20260720-0001',
    employeeId: 'EMP00072',
    employeeNama: 'MUHLISIN',
    employeeNip: '197409051994031009',
    employeeUnitKerja: 'UNOR TEKNIK',
    employeeJabatan: 'Teknisi Siaran Ahli Muda',
    employeeGolPangkat: 'III d / Penata Tingkat I',
    employeeStatusPegawai: 'PNS',
    judulPelatihan: 'Pelatihan Pemeliharaan Pemancar Digital DVB-T2 & IP Broadcasting',
    jenisPelatihan: 'Teknis Penyiaran & Otomasi',
    penyelenggara: 'Pusdiklat LPP TVRI Pusat Jakarta',
    tanggalMulai: '2026-08-10',
    tanggalSelesai: '2026-08-15',
    lokasi: 'Pusdiklat TVRI Kebayoran Baru, Jakarta Selatan',
    keterangan: 'Peningkatan kompetensi pemeliharaan sistem transmisi digital terestrial untuk area Sumsel.',
    status: 'APPROVED',
    lampiranNama: 'Surat_Undangan_Pusdiklat_Teknik.pdf',
    createdAt: '2026-07-20T09:15:00Z',
    updatedAt: '2026-07-21T11:00:00Z',
  },
  {
    id: 'SUB00002',
    nomor: 'SUB-20260722-0002',
    employeeId: 'EMP00062',
    employeeNama: 'YENNI SURYANI',
    employeeNip: '196910311999032001',
    employeeUnitKerja: 'UNOR KONTEN MEDIA BARU',
    employeeJabatan: 'Pranata Hubungan Masyarakat Ahli Muda',
    employeeGolPangkat: 'III d / Penata Tingkat I',
    employeeStatusPegawai: 'PNS',
    judulPelatihan: 'Workshop Masterclass Digital Content Production & Social Media Strategy',
    jenisPelatihan: 'Jurnalistik & Konten Media',
    penyelenggara: 'Dewan Pers & LPP TVRI Nasional',
    tanggalMulai: '2026-08-20',
    tanggalSelesai: '2026-08-22',
    lokasi: 'Hotel Novotel Palembang',
    keterangan: 'Peningkatan keahlian produksi konten platform digital TVRI Sumsel.',
    status: 'WAITING_APPROVAL',
    lampiranNama: 'Rencana_Pembelajaran_DigitalMedia.pdf',
    createdAt: '2026-07-22T10:30:00Z',
    updatedAt: '2026-07-23T08:20:00Z',
  },
  {
    id: 'SUB00003',
    nomor: 'SUB-20260724-0003',
    employeeId: 'EMP00032',
    employeeNama: 'MARHAMAH IDAWATI',
    employeeNip: '197103101994032006',
    employeeUnitKerja: 'UNOR PROGRAM DAN BERITA',
    employeeJabatan: 'Pranata Siaran Ahli Madya',
    employeeGolPangkat: 'IV b / Pembina Tingkat I',
    employeeStatusPegawai: 'PNS',
    judulPelatihan: 'Pelatihan Multi-Camera Virtual Studio & Unreal Engine Graphics Broadcasting',
    jenisPelatihan: 'Teknis Penyiaran & Produksi',
    penyelenggara: 'BPPTIK Kominfo Cikarang',
    tanggalMulai: '2026-09-01',
    tanggalSelesai: '2026-09-08',
    lokasi: 'BPPTIK Kominfo, Cikarang',
    keterangan: 'Mempersiapkan penyiaran virtual studio modern untuk program unggulan TVRI Sumatera Selatan.',
    status: 'DRAFT',
    lampiranNama: 'Kerangka_Acuan_Kerja_VirtualStudio.pdf',
    createdAt: '2026-07-24T02:00:00Z',
    updatedAt: '2026-07-24T02:00:00Z',
  }
];

export const INITIAL_APPROVAL_HISTORY: ApprovalHistoryItem[] = [
  {
    id: 'APH00001',
    submissionId: 'SUB00001',
    actorId: 'USR00002',
    actorNama: 'Admin',
    actorRole: 'ADMIN_SDM',
    action: 'VERIFIED',
    note: 'Berkas dan kelengkapan administrasi telah diverifikasi lengkap dan memenuhi syarat.',
    createdAt: '2026-07-20T14:20:00Z',
  },
  {
    id: 'APH00002',
    submissionId: 'SUB00001',
    actorId: 'USR00001',
    actorNama: 'EFLIANTY ANALISA',
    actorRole: 'KEPALA_STASIUN',
    action: 'APPROVED',
    note: 'Disetujui. Agar pegawai yang bersangkutan membuat laporan hasil pelatihan setelah selesai tugas.',
    createdAt: '2026-07-21T11:00:00Z',
  },
  {
    id: 'APH00003',
    submissionId: 'SUB00002',
    actorId: 'USR00002',
    actorNama: 'Admin',
    actorRole: 'ADMIN_SDM',
    action: 'VERIFIED',
    note: 'Pengajuan relevan dengan penugasan konten TVRI Sumsel. Diteruskan ke Kepala Stasiun.',
    createdAt: '2026-07-23T08:20:00Z',
  }
];

export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'LOG00001',
    datetime: '2026-07-24 08:30:12',
    userId: 'USR00002',
    userName: 'Admin',
    action: 'LOGIN',
    module: 'AUTH',
    description: 'Pengguna berhasil masuk ke dalam sistem SIAP SUMSEL.',
    status: 'SUCCESS',
  },
  {
    id: 'LOG00002',
    datetime: '2026-07-24 02:00:15',
    userId: 'USR00003',
    userName: 'MARHAMAH IDAWATI',
    action: 'CREATE_SUBMISSION',
    module: 'PENGAJUAN',
    description: 'Membuat draf pengajuan pelatihan SUB-20260724-0003.',
    status: 'SUCCESS',
  },
  {
    id: 'LOG00003',
    datetime: '2026-07-23 08:20:05',
    userId: 'USR00002',
    userName: 'Admin',
    action: 'VERIFY_SUBMISSION',
    module: 'APPROVAL',
    description: 'Memverifikasi berkas pengajuan SUB-20260722-0002 (YENNI SURYANI).',
    status: 'SUCCESS',
  },
  {
    id: 'LOG00004',
    datetime: '2026-07-21 11:00:44',
    userId: 'USR00001',
    userName: 'EFLIANTY ANALISA',
    action: 'APPROVE_SUBMISSION',
    module: 'APPROVAL',
    description: 'Menyetujui pengajuan pelatihan SUB-20260720-0001 (MUHLISIN).',
    status: 'SUCCESS',
  }
];

export const UNIT_KERJA_LIST = [
  'UNOR UMUM',
  'UNOR KEUANGAN',
  'UNOR PROGRAM DAN BERITA',
  'UNOR KONTEN MEDIA BARU',
  'UNOR TEKNIK',
  'UNOR PENGEMBANGAN USAHA',
  'TENAGA KONTRAK'
];

export const INITIAL_CERTIFICATES: SertifikatPelatihan[] = [
  {
    id: 'SERT00001',
    employeeId: 'EMP00072',
    employeeNama: 'MUHLISIN',
    employeeNip: '197409051994031009',
    employeeUnitKerja: 'UNOR TEKNIK',
    employeeJabatan: 'Teknisi Siaran Ahli Muda',
    submissionId: 'SUB00001',
    judulPelatihan: 'Pelatihan Pemeliharaan Pemancar Digital DVB-T2 & IP Broadcasting',
    jenisPelatihan: 'Teknis Penyiaran & Otomasi',
    penyelenggara: 'Pusdiklat LPP TVRI Pusat Jakarta',
    tanggalPelatihan: '10 Agu 2026 - 15 Agu 2026',
    statusPelatihan: 'SELESAI',
    nomorSertifikat: 'SERT/2026/TVRI/0842',
    tanggalSertifikat: '2026-08-16',
    fileUrl: 'sertifikat_dvbt2_muhlisin.pdf',
    fileNama: 'Sertifikat_DVB-T2_MUHLISIN.pdf',
    fileType: 'pdf',
    fileSizeMb: 1.8,
    status: 'DISETUJUI',
    uploadedAt: '2026-08-17T10:00:00Z',
    verifiedAt: '2026-08-18T14:30:00Z',
    verifiedBy: 'Admin'
  },
  {
    id: 'SERT00002',
    employeeId: 'EMP00072',
    employeeNama: 'MUHLISIN',
    employeeNip: '197409051994031009',
    employeeUnitKerja: 'UNOR TEKNIK',
    employeeJabatan: 'Teknisi Siaran Ahli Muda',
    judulPelatihan: 'Bimtek Keselamatan Kerja (K3) & Penanggulangan Risiko Master Control',
    jenisPelatihan: 'K3 & Manajemen Infrastruktur',
    penyelenggara: 'Kementerian Kominfo RI',
    tanggalPelatihan: '12 Mei 2026 - 14 Mei 2026',
    statusPelatihan: 'SELESAI',
    nomorSertifikat: 'K3/KOMINFO/2026/0411',
    tanggalSertifikat: '2026-05-15',
    fileUrl: 'sertifikat_k3_muhlisin.pdf',
    fileNama: 'Sertifikat_K3_MUHLISIN.pdf',
    fileType: 'pdf',
    fileSizeMb: 2.1,
    status: 'SEDANG_DIVERIFIKASI',
    uploadedAt: '2026-07-24T09:10:00Z'
  },
  {
    id: 'SERT00003',
    employeeId: 'EMP00072',
    employeeNama: 'MUHLISIN',
    employeeNip: '197409051994031009',
    employeeUnitKerja: 'UNOR TEKNIK',
    employeeJabatan: 'Teknisi Siaran Ahli Muda',
    judulPelatihan: 'Workshop Smart Automation System untuk Terrestrial Transmitter',
    jenisPelatihan: 'Otomasi Penyiaran',
    penyelenggara: 'Televisi Republik Indonesia (TVRI)',
    tanggalPelatihan: '01 Jun 2026 - 03 Jun 2026',
    statusPelatihan: 'SELESAI',
    status: 'BELUM_DIUNGGAH'
  },
  {
    id: 'SERT00004',
    employeeId: 'EMP00062',
    employeeNama: 'YENNI SURYANI',
    employeeNip: '196910311999032001',
    employeeUnitKerja: 'UNOR KONTEN MEDIA BARU',
    employeeJabatan: 'Pranata Hubungan Masyarakat Ahli Muda',
    judulPelatihan: 'Masterclass Digital Content Production & Social Media Strategy',
    jenisPelatihan: 'Jurnalistik & Konten Media',
    penyelenggara: 'Dewan Pers & LPP TVRI Nasional',
    tanggalPelatihan: '15 Mar 2026 - 17 Mar 2026',
    statusPelatihan: 'SELESAI',
    nomorSertifikat: 'DP/TVRI/2026/891',
    tanggalSertifikat: '2026-03-18',
    fileUrl: 'sertifikat_digitalcontent_yenni.pdf',
    fileNama: 'Sertifikat_Digital_YENNI.pdf',
    fileType: 'pdf',
    fileSizeMb: 3.2,
    status: 'PERLU_REVISI',
    catatanRevisi: 'Hasil scan kurang jelas pada bagian stempel dan tanggal sertifikat. Mohon re-upload dengan kualitas scanner lebih jernih.',
    uploadedAt: '2026-03-20T11:20:00Z'
  },
  {
    id: 'SERT00005',
    employeeId: 'EMP00032',
    employeeNama: 'MARHAMAH IDAWATI',
    employeeNip: '197103101994032006',
    employeeUnitKerja: 'UNOR PROGRAM DAN BERITA',
    employeeJabatan: 'Pranata Siaran Ahli Madya',
    judulPelatihan: 'Sertifikasi Kompetensi Pranata Siaran Madya Penyiaran Televisi',
    jenisPelatihan: 'Sertifikasi Profesi',
    penyelenggara: 'LSP Penyiaran Indonesia',
    tanggalPelatihan: '10 Nov 2025 - 14 Nov 2025',
    statusPelatihan: 'SELESAI',
    nomorSertifikat: 'LSP-TV/2025/11092',
    tanggalSertifikat: '2025-11-15',
    fileUrl: 'sertifikat_lsp_marhamah.pdf',
    fileNama: 'Sertifikat_LSP_Marhamah.pdf',
    fileType: 'pdf',
    fileSizeMb: 1.5,
    status: 'DISETUJUI',
    uploadedAt: '2025-11-20T08:00:00Z',
    verifiedAt: '2025-11-21T09:00:00Z',
    verifiedBy: 'Admin'
  },
  {
    id: 'SERT00006',
    employeeId: 'EMP00001',
    employeeNama: 'EFLIANTY ANALISA',
    employeeNip: '197003061998032006',
    employeeUnitKerja: 'UNOR UMUM',
    employeeJabatan: 'Kepala TVRI Stasiun Sumatera Selatan',
    judulPelatihan: 'Pelatihan Kepemimpinan & Manajemen Strategis LPP TVRI',
    jenisPelatihan: 'Manajerial & Leadership',
    penyelenggara: 'LPP TVRI Pusat Jakarta',
    tanggalPelatihan: '05 Jan 2026 - 09 Jan 2026',
    statusPelatihan: 'SELESAI',
    nomorSertifikat: 'LEAD/TVRI/2026/001',
    tanggalSertifikat: '2026-01-10',
    fileUrl: 'sertifikat_leadership_eflianty.pdf',
    fileNama: 'Sertifikat_Leadership_Eflianty.pdf',
    fileType: 'pdf',
    fileSizeMb: 2.4,
    status: 'DISETUJUI',
    uploadedAt: '2026-01-12T09:00:00Z',
    verifiedAt: '2026-01-12T14:00:00Z',
    verifiedBy: 'Admin'
  }
];

