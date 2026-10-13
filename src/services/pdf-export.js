import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export function downloadPdfReport({ filename, title, subtitle, sections }) {
  const document = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = document.internal.pageSize.getWidth()
  const margin = 14

  document.setFont('helvetica', 'bold')
  document.setFontSize(18)
  document.text(title, margin, 18)
  document.setFont('helvetica', 'normal')
  document.setFontSize(10)
  document.text(document.splitTextToSize(subtitle, pageWidth - margin * 2), margin, 25)

  let cursorY = 38
  for (const section of sections) {
    if (cursorY > 260) {
      document.addPage()
      cursorY = 18
    }

    document.setFont('helvetica', 'bold')
    document.setFontSize(12)
    document.text(section.title, margin, cursorY)
    autoTable(document, {
      startY: cursorY + 4,
      head: [section.headers],
      body: section.rows.length ? section.rows : [['Tidak ada data', ...Array(section.headers.length - 1).fill('')]],
      foot: section.foot ? [section.foot] : undefined,
      theme: 'grid',
      margin: { left: margin, right: margin, bottom: 14 },
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [23, 98, 66], textColor: 255 },
      footStyles: { fillColor: [232, 239, 234], textColor: [23, 35, 27], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [243, 247, 244] },
    })
    cursorY = document.lastAutoTable.finalY + 10
  }

  const pageCount = document.internal.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    document.setPage(page)
    document.setFont('helvetica', 'normal')
    document.setFontSize(8)
    document.text(`Halaman ${page} dari ${pageCount}`, pageWidth - margin, document.internal.pageSize.getHeight() - 7, { align: 'right' })
  }

  document.save(`${sanitizeFilename(filename)}.pdf`)
}

function sanitizeFilename(value) {
  return String(value || 'laporan').trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'laporan'
}
