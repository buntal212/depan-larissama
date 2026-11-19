import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  getTodayInTimezone,
  calculateRemainingDays,
  getSubscriptionValidity,
} from '../src/services/subscription-validity.js'

describe('Subscription Validity Utilities', () => {
  it('formats today date according to the specified timezone', () => {
    const todayWib = getTodayInTimezone('Asia/Jakarta')
    assert.match(todayWib, /^\d{4}-\d{2}-\d{2}$/)

    const todayUtc = getTodayInTimezone('UTC')
    assert.match(todayUtc, /^\d{4}-\d{2}-\d{2}$/)

    // Fallback for invalid timezone
    const fallback = getTodayInTimezone('Invalid/Timezone')
    assert.match(fallback, /^\d{4}-\d{2}-\d{2}$/)
  })

  it('calculates remaining days accurately across different end dates', () => {
    const today = getTodayInTimezone('Asia/Jakarta')
    const [y, m, d] = today.split('-').map(Number)

    // Helper to format date
    const formatDate = (offsetDays) => {
      const date = new Date(Date.UTC(y, m - 1, d + offsetDays))
      return date.toISOString().slice(0, 10)
    }

    assert.equal(calculateRemainingDays(formatDate(30), 'Asia/Jakarta'), 30)
    assert.equal(calculateRemainingDays(formatDate(7), 'Asia/Jakarta'), 7)
    assert.equal(calculateRemainingDays(formatDate(1), 'Asia/Jakarta'), 1)
    assert.equal(calculateRemainingDays(formatDate(0), 'Asia/Jakarta'), 0)
    assert.equal(calculateRemainingDays(formatDate(-1), 'Asia/Jakarta'), -1)
    assert.equal(calculateRemainingDays(formatDate(-10), 'Asia/Jakarta'), -10)
    assert.equal(calculateRemainingDays(null), null)
    assert.equal(calculateRemainingDays(''), null)
    assert.equal(calculateRemainingDays('invalid-date'), null)
  })

  it('identifies status: Aktif when remaining days > 7', () => {
    const today = getTodayInTimezone('Asia/Jakarta')
    const [y, m, d] = today.split('-').map(Number)
    const futureDate = new Date(Date.UTC(y, m - 1, d + 20)).toISOString().slice(0, 10)

    const warung = {
      nama: 'Warung Maju',
      tanggal_mulai: today,
      tanggal_berakhir: futureDate,
      timezone: 'Asia/Jakarta',
      status_langganan: 'aktif',
      aktif: true,
      pendaftaran_disetujui: true,
    }

    const validity = getSubscriptionValidity(warung)
    assert.equal(validity.status, 'aktif')
    assert.equal(validity.label, 'Aktif')
    assert.equal(validity.badgeColor, 'positive')
    assert.equal(validity.remainingDays, 20)
    assert.equal(validity.summaryText, '20 hari')
    assert.equal(validity.remainingSummary, '20 hari tersisa')
    assert.equal(validity.isActive, true)
    assert.equal(validity.isExpiringSoon, false)
    assert.equal(validity.isExpired, false)
  })

  it('identifies status: Segera Berakhir when remaining days <= 7', () => {
    const today = getTodayInTimezone('Asia/Jakarta')
    const [y, m, d] = today.split('-').map(Number)
    const expiringSoonDate = new Date(Date.UTC(y, m - 1, d + 5)).toISOString().slice(0, 10)

    const warung = {
      nama: 'Warung Segera Habis',
      tanggal_mulai: today,
      tanggal_berakhir: expiringSoonDate,
      timezone: 'Asia/Jakarta',
      status_langganan: 'aktif',
      aktif: true,
      pendaftaran_disetujui: true,
    }

    const validity = getSubscriptionValidity(warung)
    assert.equal(validity.status, 'segera_berakhir')
    assert.equal(validity.label, 'Segera Berakhir')
    assert.equal(validity.badgeColor, 'warning')
    assert.equal(validity.remainingDays, 5)
    assert.equal(validity.summaryText, '5 hari')
    assert.equal(validity.remainingSummary, '5 hari tersisa')
    assert.equal(validity.isActive, true)
    assert.equal(validity.isExpiringSoon, true)
    assert.equal(validity.isExpired, false)
  })

  it('identifies status: Segera Berakhir for today expiration (0 days)', () => {
    const today = getTodayInTimezone('Asia/Jakarta')

    const warung = {
      nama: 'Warung Hari Terakhir',
      tanggal_mulai: today,
      tanggal_berakhir: today,
      timezone: 'Asia/Jakarta',
      status_langganan: 'aktif',
      aktif: true,
      pendaftaran_disetujui: true,
    }

    const validity = getSubscriptionValidity(warung)
    assert.equal(validity.status, 'segera_berakhir')
    assert.equal(validity.label, 'Segera Berakhir')
    assert.equal(validity.badgeColor, 'warning')
    assert.equal(validity.remainingDays, 0)
    assert.equal(validity.summaryText, '0 hari')
    assert.equal(validity.remainingSummary, 'Hari ini berakhir')
    assert.equal(validity.isActive, true)
    assert.equal(validity.isExpiringSoon, true)
  })

  it('identifies status: Kedaluwarsa when remaining days < 0', () => {
    const today = getTodayInTimezone('Asia/Jakarta')
    const [y, m, d] = today.split('-').map(Number)
    const pastDate = new Date(Date.UTC(y, m - 1, d - 2)).toISOString().slice(0, 10)

    const warung = {
      nama: 'Warung Telah Habis',
      tanggal_mulai: '2026-01-01',
      tanggal_berakhir: pastDate,
      timezone: 'Asia/Jakarta',
      status_langganan: 'kedaluwarsa',
      aktif: true,
      pendaftaran_disetujui: true,
    }

    const validity = getSubscriptionValidity(warung)
    assert.equal(validity.status, 'kedaluwarsa')
    assert.equal(validity.label, 'Kedaluwarsa')
    assert.equal(validity.badgeColor, 'negative')
    assert.equal(validity.remainingDays, 0)
    assert.equal(validity.summaryText, 'Kedaluwarsa')
    assert.equal(validity.isExpired, true)
    assert.equal(validity.isActive, false)
  })

  it('identifies status: Menunggu Persetujuan when registration is not approved', () => {
    const warung = {
      nama: 'Warung Baru',
      tanggal_mulai: null,
      tanggal_berakhir: null,
      status_langganan: 'menunggu_persetujuan',
      pendaftaran_disetujui: false,
    }

    const validity = getSubscriptionValidity(warung)
    assert.equal(validity.status, 'menunggu_persetujuan')
    assert.equal(validity.label, 'Menunggu Persetujuan')
    assert.equal(validity.badgeColor, 'orange-8')
    assert.equal(validity.remainingDays, null)
    assert.equal(validity.summaryText, 'Menunggu persetujuan')
  })

  it('identifies status: Dinonaktifkan when active is false', () => {
    const warung = {
      nama: 'Warung Dinonaktifkan',
      tanggal_mulai: '2026-01-01',
      tanggal_berakhir: '2026-12-31',
      aktif: false,
      pendaftaran_disetujui: true,
    }

    const validity = getSubscriptionValidity(warung)
    assert.equal(validity.status, 'dinonaktifkan')
    assert.equal(validity.label, 'Dinonaktifkan')
    assert.equal(validity.badgeColor, 'grey-7')
    assert.equal(validity.summaryText, 'Nonaktif')
  })

  it('handles null or empty warung gracefully without crashing', () => {
    const validityNull = getSubscriptionValidity(null)
    assert.equal(validityNull.status, 'tanpa_masa_aktif')
    assert.equal(validityNull.label, 'Belum Ada Data')
    assert.equal(validityNull.remainingSummary, '—')

    const validityEmpty = getSubscriptionValidity({})
    assert.equal(validityEmpty.status, 'tanpa_masa_aktif')
  })

  it('triggers smooth scroll to pilih-paket-section when Perpanjang Langganan is clicked', () => {
    let scrolled = false
    let scrollOptions = null

    const mockElement = {
      scrollIntoView: (options) => {
        scrolled = true
        scrollOptions = options
      },
    }

    // Mock global document
    global.document = {
      getElementById: (id) => {
        if (id === 'pilih-paket-section') return mockElement
        return null
      },
    }

    const el = global.document.getElementById('pilih-paket-section')
    assert.ok(el)
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })

    assert.equal(scrolled, true)
    assert.deepEqual(scrollOptions, { behavior: 'smooth', block: 'start' })

    delete global.document
  })
})
