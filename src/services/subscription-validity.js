/**
 * Utilitas perhitungan masa aktif dan status langganan warung
 * Mendukung timezone warung dan aturan billing Larissama.
 */

/**
 * Mendapatkan tanggal hari ini dalam format YYYY-MM-DD sesuai timezone target.
 *
 * @param {string} [timezone='Asia/Jakarta']
 * @returns {string} Tanggal dalam format YYYY-MM-DD
 */
export function getTodayInTimezone(timezone = 'Asia/Jakarta') {
  const targetTz = timezone || 'Asia/Jakarta'
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: targetTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return formatter.format(new Date())
  } catch {
    const fallbackFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return fallbackFormatter.format(new Date())
  }
}

/**
 * Menghitung selisih hari tersisa antara hari ini (sesuai timezone) dan tanggal berakhir.
 *
 * @param {string|null|undefined} endDateString Tanggal berakhir format YYYY-MM-DD
 * @param {string} [timezone='Asia/Jakarta']
 * @returns {number|null} Jumlah hari tersisa (dapat bernilai negatif jika lewat), atau null jika tidak ada tanggal.
 */
export function calculateRemainingDays(endDateString, timezone = 'Asia/Jakarta') {
  if (!endDateString || typeof endDateString !== 'string') {
    return null
  }

  const todayStr = getTodayInTimezone(timezone)
  const [tYear, tMonth, tDay] = todayStr.split('-').map(Number)
  const [eYear, eMonth, eDay] = endDateString.split('-').map(Number)

  if (!tYear || !tMonth || !tDay || !eYear || !eMonth || !eDay) {
    return null
  }

  const todayUtc = Date.UTC(tYear, tMonth - 1, tDay)
  const endUtc = Date.UTC(eYear, eMonth - 1, eDay)

  return Math.round((endUtc - todayUtc) / (1000 * 60 * 60 * 24))
}

/**
 * Menentukan ringkasan masa aktif langganan warung.
 * Status yang didukung:
 * - 'aktif' (> 7 hari)
 * - 'segera_berakhir' (<= 7 hari)
 * - 'kedaluwarsa' (< 0 hari atau status kedaluwarsa)
 * - 'menunggu_persetujuan'
 * - 'dinonaktifkan'
 * - 'tanpa_masa_aktif'
 *
 * @param {object|null|undefined} warung
 * @returns {{
 *   startDate: string|null,
 *   endDate: string|null,
 *   remainingDays: number|null,
 *   status: string,
 *   label: string,
 *   badgeColor: string,
 *   remainingSummary: string,
 *   summaryText: string,
 *   textClass: string,
 *   isExpired: boolean,
 *   isExpiringSoon: boolean,
 *   isActive: boolean
 * }}
 */
export function getSubscriptionValidity(warung) {
  if (!warung || typeof warung !== 'object') {
    return {
      startDate: null,
      endDate: null,
      remainingDays: null,
      status: 'tanpa_masa_aktif',
      label: 'Belum Ada Data',
      badgeColor: 'grey-7',
      remainingSummary: '—',
      summaryText: '—',
      textClass: 'text-grey-7',
      isExpired: false,
      isExpiringSoon: false,
      isActive: false,
    }
  }

  const startDate = warung.tanggal_mulai || null
  const endDate = warung.tanggal_berakhir || null
  const timezone = warung.timezone || 'Asia/Jakarta'
  const statusLangganan = warung.status_langganan || null
  const isApproved = warung.pendaftaran_disetujui !== false
  const isActiveRecord = warung.aktif !== false

  const remainingDays = calculateRemainingDays(endDate, timezone)

  // 1. Menunggu persetujuan
  if (statusLangganan === 'menunggu_persetujuan' || (!isApproved && !endDate)) {
    return {
      startDate,
      endDate,
      remainingDays: null,
      status: 'menunggu_persetujuan',
      label: 'Menunggu Persetujuan',
      badgeColor: 'orange-8',
      remainingSummary: 'Menunggu persetujuan superadmin',
      summaryText: 'Menunggu persetujuan',
      textClass: 'text-orange-9',
      isExpired: false,
      isExpiringSoon: false,
      isActive: false,
    }
  }

  // 2. Dinonaktifkan
  if (!isActiveRecord || statusLangganan === 'dinonaktifkan') {
    return {
      startDate,
      endDate,
      remainingDays,
      status: 'dinonaktifkan',
      label: 'Dinonaktifkan',
      badgeColor: 'grey-7',
      remainingSummary:
        remainingDays !== null ? `${Math.max(0, remainingDays)} hari (Nonaktif)` : 'Nonaktif',
      summaryText: 'Nonaktif',
      textClass: 'text-grey-7',
      isExpired: false,
      isExpiringSoon: false,
      isActive: false,
    }
  }

  // 3. Tanpa tanggal berakhir
  if (!endDate || remainingDays === null) {
    return {
      startDate,
      endDate,
      remainingDays: null,
      status: 'tanpa_masa_aktif',
      label: 'Belum Diatur',
      badgeColor: 'grey-7',
      remainingSummary: '—',
      summaryText: '—',
      textClass: 'text-grey-7',
      isExpired: false,
      isExpiringSoon: false,
      isActive: false,
    }
  }

  // 4. Kedaluwarsa (< 0 hari atau status kedaluwarsa)
  if (remainingDays < 0 || statusLangganan === 'kedaluwarsa') {
    return {
      startDate,
      endDate,
      remainingDays: 0,
      status: 'kedaluwarsa',
      label: 'Kedaluwarsa',
      badgeColor: 'negative',
      remainingSummary: 'Kedaluwarsa (0 hari tersisa)',
      summaryText: 'Kedaluwarsa',
      textClass: 'text-negative',
      isExpired: true,
      isExpiringSoon: false,
      isActive: false,
    }
  }

  // 5. Segera Berakhir (0 sampai 7 hari)
  if (remainingDays <= 7) {
    const summary = remainingDays === 0 ? 'Hari ini berakhir' : `${remainingDays} hari tersisa`
    return {
      startDate,
      endDate,
      remainingDays,
      status: 'segera_berakhir',
      label: 'Segera Berakhir',
      badgeColor: 'warning',
      remainingSummary: summary,
      summaryText: `${remainingDays} hari`,
      textClass: 'text-orange-9',
      isExpired: false,
      isExpiringSoon: true,
      isActive: true,
    }
  }

  // 6. Aktif (> 7 hari)
  return {
    startDate,
    endDate,
    remainingDays,
    status: 'aktif',
    label: 'Aktif',
    badgeColor: 'positive',
    remainingSummary: `${remainingDays} hari tersisa`,
    summaryText: `${remainingDays} hari`,
    textClass: 'text-positive',
    isExpired: false,
    isExpiringSoon: false,
    isActive: true,
  }
}
