import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export async function downloadPdfReport(options) {
  const document = await createReportDocument(options)
  document.save(`${sanitizeFilename(options.filename)}.pdf`)
}

export async function printPdfReport(options) {
  const printWindow = window.open('', '_blank')
  try {
    const document = await createReportDocument(options)
    if (!printWindow) {
      document.save(`${sanitizeFilename(options.filename)}.pdf`)
      return
    }
    document.autoPrint()
    const pdfUrl = URL.createObjectURL(document.output('blob'))
    printWindow.location.href = pdfUrl
    window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000)
  } catch (error) {
    printWindow?.close()
    throw error
  }
}

async function createReportDocument({ title, subtitle, sections, warung }) {
  const document = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = document.internal.pageSize.getWidth()
  const margin = 14
  const logoData = warung?.logo ? await loadImageData(warung.logo) : null
  const storeTextX = logoData ? margin + 22 : margin
  const storeTextWidth = logoData ? 68 : 90
  if (logoData) document.addImage(logoData, 'PNG', margin, 14, 18, 18)

  document.setFont('helvetica', 'bold')
  document.setFontSize(14)
  const storeNameLines = document.splitTextToSize(warung?.nama || 'Larisama', storeTextWidth)
  document.text(storeNameLines, storeTextX, 18)

  document.setFont('helvetica', 'normal')
  document.setFontSize(12)
  let storeInfoY = 18 + storeNameLines.length * 5.5
  for (const detail of [warung?.alamat, warung?.telepon].filter(Boolean)) {
    const lines = document.splitTextToSize(String(detail), storeTextWidth)
    document.text(lines, storeTextX, storeInfoY)
    storeInfoY += lines.length * 4.5
  }

  document.setFont('helvetica', 'bold')
  document.setFontSize(14)
  const titleLines = document.splitTextToSize(title, 86)
  document.text(titleLines, pageWidth - margin, 17, { align: 'right' })
  document.setFont('helvetica', 'normal')
  document.setFontSize(12)
  const subtitleLines = document.splitTextToSize(subtitle, 86)
  const subtitleY = 18 + titleLines.length * 5.5
  document.text(subtitleLines, pageWidth - margin, subtitleY, { align: 'right' })

  const headingY = Math.max(42, storeInfoY + 3, subtitleY + subtitleLines.length * 4.5 + 3)
  document.setDrawColor(185, 199, 189)
  document.line(margin, headingY, pageWidth - margin, headingY)

  let cursorY = headingY + 9
  for (const section of sections) {
    if (cursorY > 260) {
      document.addPage()
      cursorY = 18
    }

    document.setFont('helvetica', 'bold')
    document.setFontSize(12)
    document.text(section.title, margin, cursorY)
    const columnStyles = {}
    section.headers.forEach((header, index) => {
      if (isNominalColumn(header)) columnStyles[index] = { halign: 'right' }
    })
    section.columnWidths?.forEach((cellWidth, index) => {
      columnStyles[index] = { ...columnStyles[index], cellWidth }
    })
    autoTable(document, {
      startY: cursorY + 4,
      head: [section.headers],
      body: section.rows.length ? section.rows : [['Tidak ada data', ...Array(section.headers.length - 1).fill('')]],
      foot: section.foot ? [section.foot] : undefined,
      theme: 'grid',
      margin: { left: margin, right: margin, bottom: 14 },
      styles: { font: 'helvetica', fontSize: 12, cellPadding: 1.5, overflow: 'linebreak', valign: 'middle' },
      headStyles: { fillColor: [23, 98, 66], textColor: 255, fontSize: 12, halign: 'center', valign: 'middle' },
      footStyles: { fillColor: [232, 239, 234], textColor: [23, 35, 27], fontStyle: 'bold', fontSize: 12, valign: 'middle' },
      columnStyles,
      alternateRowStyles: { fillColor: [243, 247, 244] },
    })
    cursorY = document.lastAutoTable.finalY + 10
  }

  const pageCount = document.internal.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    document.setPage(page)
    document.setFont('helvetica', 'normal')
    document.setFontSize(12)
    document.text(`Halaman ${page} dari ${pageCount}`, pageWidth - margin, document.internal.pageSize.getHeight() - 7, { align: 'right' })
  }

  return document
}

function isNominalColumn(header) {
  return /nilai|nominal|harga|total|penjualan|retur|pendapatan|pembelian|belum lunas/i.test(String(header))
}

function loadImageData(source) {
  return new Promise((resolve) => {
    const image = new Image()
    const timeoutId = window.setTimeout(() => resolve(null), 5000)
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      window.clearTimeout(timeoutId)
      try {
        const canvas = document.createElement('canvas')
        canvas.width = image.naturalWidth
        canvas.height = image.naturalHeight
        canvas.getContext('2d').drawImage(image, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      } catch {
        resolve(null)
      }
    }
    image.onerror = () => {
      window.clearTimeout(timeoutId)
      resolve(null)
    }
    image.src = source
  })
}

function sanitizeFilename(value) {
  return String(value || 'laporan').trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'laporan'
}
