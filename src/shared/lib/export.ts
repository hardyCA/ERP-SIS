import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { CellInput } from 'jspdf-autotable'
import * as XLSX from 'xlsx'

type PdfColumn = { header: string; dataKey: string }
type PdfRow = Record<string, string | number>

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  sheetName = 'Datos'
) {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export function exportToPdf(
  title: string,
  subtitle: string,
  columns: PdfColumn[],
  rows: PdfRow[],
  summary: { label: string; value: string }[],
  filename: string
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()

  doc.setFontSize(16)
  doc.text(title, pageW / 2, 20, { align: 'center' })

  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(subtitle, pageW / 2, 27, { align: 'center' })

  let y = 35

  summary.forEach((s) => {
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`${s.label}:`, 14, y)
    doc.setTextColor(0)
    doc.text(s.value, 60, y)
    y += 6
  })

  y += 4

  autoTable(doc, {
    startY: y,
    head: [columns.map((c) => c.header)],
    body: rows.map((r) => columns.map((c) => r[c.dataKey] ?? '')),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  })

  doc.save(`${filename}.pdf`)
}

export function printElement(elementId: string) {
  const el = document.getElementById(elementId)
  if (!el) return
  const printWin = window.open('', '_blank')
  if (!printWin) return
  printWin.document.write(`<!DOCTYPE html><html><head><title>Imprimir</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
      th { background: #2563eb; color: white; }
      h1 { font-size: 18px; text-align: center; }
      h2 { font-size: 14px; text-align: center; color: #666; }
      .summary { margin: 16px 0; font-size: 12px; }
      .summary-row { display: flex; justify-content: space-between; padding: 4px 0; }
      .total-row { font-weight: bold; font-size: 14px; border-top: 2px solid #000; padding-top: 8px; margin-top: 8px; }
      .group-brand { background: #2563eb; color: white; font-weight: bold; }
      .group-category { background: #e5edfb; font-weight: bold; }
      .signature { display: flex; justify-content: space-between; margin-top: 48px; }
      .signature-box { width: 45%; text-align: center; padding-top: 8px; }
      .signature-line { border-top: 1px solid #000; padding-top: 6px; }
      .footer-info { margin-top: 32px; text-align: center; font-size: 12px; color: #444; }
      @media print { .no-print { display: none; } }
    </style></head><body>
    ${el.innerHTML}
    <div class="no-print" style="text-align:center;margin-top:20px">
      <button onclick="window.print()" style="padding:10px 24px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer">Imprimir</button>
      <button onclick="window.close()" style="padding:10px 24px;margin-left:8px;border:1px solid #ccc;border-radius:6px;cursor:pointer">Cerrar</button>
    </div>
    <script>window.print()</script>
    </body></html>`)
  printWin.document.close()
}

export interface InventoryPdfItem {
  name: string
  quantity: number
  cost: number
  sale_price: number
}

export interface InventoryPdfCategory {
  name: string
  items: InventoryPdfItem[]
}

export interface InventoryPdfBrand {
  brand: string
  categories: InventoryPdfCategory[]
}

export interface InventorySignature {
  label: string
  name?: string
}

export function exportInventoryPdf(opts: {
  title: string
  subtitle: string
  brands: InventoryPdfBrand[]
  showCost?: boolean
  generatedBy: string
  generatedAt: string
  branchName?: string
  signatures: InventorySignature[]
  filename: string
}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const ml = 14
  const mr = 14
  const rightX = pageW - mr

  doc.setFont('helvetica', 'normal')

  function setBold() { doc.setFont('helvetica', 'bold') }
  function setNormal() { doc.setFont('helvetica', 'normal') }

  // === HEADER ===
  const logoY = 14
  doc.setFontSize(18)
  setBold()
  doc.setTextColor(0)
  doc.text('SIIM', ml, logoY)
  setNormal()
  doc.setFontSize(6.5)
  doc.setTextColor(120)
  doc.text('Sistema Integral de Inventarios', ml, logoY + 3.5)

  doc.setFontSize(14)
  setBold()
  doc.setTextColor(0)
  doc.text(opts.title, pageW / 2, logoY + 8, { align: 'center' })
  setNormal()
  doc.setFontSize(8.5)
  doc.setTextColor(80)
  doc.text(opts.subtitle, pageW / 2, logoY + 12.5, { align: 'center' })
  doc.text(`Sucursal: ${opts.branchName ?? 'Todas'}`, pageW / 2, logoY + 16, { align: 'center' })

  const blockW = 52
  const blockX = rightX - blockW
  doc.setFontSize(6)
  doc.setTextColor(120)
  doc.text('REPORTE', blockX + blockW / 2, logoY + 0.5, { align: 'center' })
  doc.setFontSize(8)
  setBold()
  doc.setTextColor(0)
  doc.text(opts.generatedAt, blockX + blockW / 2, logoY + 5, { align: 'center' })

  // === TABLE ===
  const hasCost = opts.showCost ?? false
  const columns = hasCost
    ? ['Producto', 'Stock', 'Costo', 'Precio Venta', 'Valor Total']
    : ['Producto', 'Stock', 'Precio Venta']
  const colCount = columns.length

  const body: CellInput[][] = []
  let brandCount = 0
  let categoryCount = 0
  let totalItems = 0
  let totalValue = 0
  let totalPotential = 0

  opts.brands.forEach((b) => {
    brandCount += 1
    b.categories.forEach((c) => {
      categoryCount += 1
      c.items.forEach((i) => {
        totalItems += i.quantity
        totalValue += i.cost * i.quantity
        totalPotential += i.sale_price * i.quantity
      })
    })
  })

  opts.brands.forEach((b) => {
    body.push([
      { content: b.brand, colSpan: colCount, styles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8.5 } },
    ])
    let brandValue = 0
    b.categories.forEach((c) => {
      const catValue = c.items.reduce((s, i) => s + i.cost * i.quantity, 0)
      brandValue += catValue
      body.push([
        { content: c.name, colSpan: colCount, styles: { fillColor: [190, 210, 245], textColor: 30, fontStyle: 'bold', fontSize: 8 } },
      ])
      c.items.forEach((i) => {
        const row: CellInput[] = [i.name, i.quantity]
        if (hasCost) row.push(Number(i.cost.toFixed(2)))
        row.push(Number(i.sale_price.toFixed(2)))
        if (hasCost) row.push(Number((i.cost * i.quantity).toFixed(2)))
        body.push(row)
      })
      body.push([
        { content: `Subtotal ${c.name}`, colSpan: colCount - 1, styles: { halign: 'right', fontStyle: 'italic', fontSize: 8 } },
        hasCost ? Number(catValue.toFixed(2)) : '',
      ])
    })
    body.push([
      { content: `Total ${b.brand}`, colSpan: colCount - 1, styles: { halign: 'right', fontStyle: 'bold', fontSize: 8.5 } },
      hasCost ? Number(brandValue.toFixed(2)) : '',
    ])
  })

  const finalFoot: CellInput[] = [
    'TOTAL GENERAL',
    totalItems,
    ...(hasCost ? [Number(totalValue.toFixed(2))] : []),
    Number(totalPotential.toFixed(2)),
    ...(hasCost ? [Number(totalValue.toFixed(2))] : []),
  ]

  autoTable(doc, {
    startY: logoY + 19,
    head: [columns],
    body: body,
    foot: columns.length === finalFoot.length ? [finalFoot] : [],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    footStyles: { fillColor: [210, 223, 245], textColor: [20, 30, 60], fontStyle: 'bold', fontSize: 8.5 },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: hasCost ? { halign: 'right' } : {},
      4: hasCost ? { halign: 'right' } : {},
    },
  })

  const afterTable = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

  // === SUMMARY ===
  let y = afterTable + 2
  const summary: { label: string; value: string }[] = [
    { label: 'Marcas', value: String(brandCount) },
    { label: 'Categorías', value: String(categoryCount) },
    { label: 'Unidades', value: String(totalItems) },
    ...(hasCost ? [{ label: 'Valor inventario (costo)', value: `Bs ${totalValue.toFixed(2)}` }] : []),
    { label: 'Valor venta potencial', value: `Bs ${totalPotential.toFixed(2)}` },
  ]

  doc.setFontSize(8)
  setBold()
  doc.setTextColor(0)
  doc.text('RESUMEN', ml, y)
  y += 5
  setNormal()
  summary.forEach((s) => {
    doc.setFontSize(8)
    doc.setTextColor(80)
    doc.text(`${s.label}:`, ml + 2, y)
    doc.setTextColor(0)
    doc.text(s.value, ml + 60, y)
    y += 4.5
  })

  // === GENERADO POR ===
  y += 2
  doc.setDrawColor(120)
  doc.setLineWidth(0.3)
  doc.line(ml, y, rightX, y)
  y += 5
  doc.setFontSize(8)
  doc.text(`Reporte generado por: ${opts.generatedBy}`, ml, y)
  y += 4

  // === FIRMAS ===
  let sigArea = y + 40
  if (sigArea > pageH - 25) {
    doc.addPage()
    y = 40
    sigArea = y + 40
  }
  const sigGap = (pageW - ml - mr) / opts.signatures.length
  opts.signatures.forEach((s, idx) => {
    const xCenter = ml + sigGap * idx + sigGap / 2
    const lineStart = xCenter - 25
    const lineEnd = xCenter + 25
    doc.setLineWidth(0.4)
    doc.line(lineStart, sigArea - 10, lineEnd, sigArea - 10)
    doc.setFontSize(8.5)
    setBold()
    doc.setTextColor(0)
    doc.text(s.label, xCenter, sigArea, { align: 'center' })
    setNormal()
    if (s.name) {
      doc.setFontSize(8)
      doc.setTextColor(80)
      doc.text(s.name, xCenter, sigArea + 4.5, { align: 'center' })
    }
  })

  doc.save(`${opts.filename}.pdf`)
}

function numeroALetras(n: number): string {
  if (n === 0) return 'CERO'

  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE']
  const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE']
  const decenas = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']

  const entero = Math.floor(n)
  const decimales = Math.round((n - entero) * 100)

  function convertirEntero(num: number): string {
    if (num === 0) return 'CERO'
    if (num === 100) return 'CIEN'

    const c = Math.floor(num / 100)
    const d = Math.floor((num % 100) / 10)
    const u = num % 10

    let res = ''
    if (c > 0) res += centenas[c] + ' '
    if (d === 1) res += especiales[u] + ' '
    else if (d > 1) {
      res += decenas[d]
      if (u > 0 && d === 2) res += 'Y' + unidades[u]
      else if (u > 0) res += ' Y ' + unidades[u]
      res += ' '
    } else if (u > 0) res += unidades[u] + ' '

    return res.trim()
  }

  if (entero === 0) return `CERO CON ${decimales.toString().padStart(2, '0')}/100`
  const palabras = convertirEntero(entero)
  if (decimales > 0) return `${palabras} CON ${decimales.toString().padStart(2, '0')}/100`
  return `${palabras} CON 00/100`
}

interface SaleInvoiceItem {
  code?: string
  product_name: string
  quantity: number
  price: number
  subtotal: number
}

interface CreditPayment {
  date: string
  time: string
  amount: number
  balance: number
}

interface SaleInvoiceData {
  number: string
  date: string
  time: string
  branch: string
  branchAddress: string
  branchPhone: string
  customer: string
  customerPhone: string
  seller: string
  paymentType: string
  total: number
  discount: number
  cashAmount: number
  qrAmount: number
  creditAnticipo: number
  items: SaleInvoiceItem[]
  notes: string | null
  creditPayments: CreditPayment[]
  creditBalance: number
  creditTotalPaid: number
}

export function exportSaleInvoice(data: SaleInvoiceData, print = false) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pw = doc.internal.pageSize.getWidth()
  const ml = 14
  const mr = 14
  const cw = pw - ml - mr
  const rightX = pw - mr

  doc.setFont('helvetica', 'normal')

  function setBold() { doc.setFont('helvetica', 'bold') }
  function setNormal() { doc.setFont('helvetica', 'normal') }

  function secX(secW: number) { return rightX - secW }

  // === HEADER ===
  const logoY = 14
  doc.setFontSize(20)
  setBold()
  doc.text('SIIM', ml, logoY)
  setNormal()
  doc.setFontSize(6.5)
  doc.setTextColor(120)
  doc.text('Sistema Integral de Inventarios', ml, logoY + 3.5)

  doc.setFontSize(8)
  setBold()
  doc.setTextColor(0)
  const centerText = data.branch
  const centerX = pw / 2
  doc.text(centerText, centerX, logoY + 8, { align: 'center' })
  setNormal()
  doc.setFontSize(7)
  doc.setTextColor(80)
  if (data.branchAddress) doc.text(data.branchAddress, centerX, logoY + 11.5, { align: 'center' })
  if (data.branchPhone) doc.text(`Tel: ${data.branchPhone}`, centerX, logoY + 15, { align: 'center' })

  const blockW = 52
  const blockX = rightX - blockW

  doc.setFontSize(6)
  setNormal()
  doc.setTextColor(120)
  doc.text('COMPROBANTE', blockX + blockW / 2, logoY + 0.5, { align: 'center' })

  doc.setFontSize(9)
  setBold()
  doc.setTextColor(0)
  doc.text(`N° ${data.number}`, blockX + blockW / 2, logoY + 5.5, { align: 'center' })

  doc.setFontSize(6)
  setNormal()
  doc.setTextColor(120)
  doc.text(`${data.date} - ${data.time}`, blockX + blockW / 2, logoY + 9.5, { align: 'center' })

  // === CLIENT INFO ===
  const clientY = logoY + 17
  doc.setFontSize(7.5)
  setBold()
  doc.setTextColor(0)
  doc.text('DATOS DEL CLIENTE', ml, clientY)
  setNormal()
  doc.setTextColor(80)
  doc.setFontSize(7.5)
  doc.text(`Cliente: ${data.customer}`, ml, clientY + 4.5)
  if (data.customerPhone) doc.text(`Tel.: ${data.customerPhone}`, ml, clientY + 8.5)

  // === TABLE ===
  const tableStartY = clientY + 12
  const hasCodes = data.items.some((i) => i.code)
  const itemsTotal = data.items.reduce((s, i) => s + i.subtotal, 0)

  autoTable(doc, {
    startY: tableStartY,
    head: [[
      ...(hasCodes ? ['Código'] : []),
      'Nombre',
      'Cantidad',
      'Precio Unit.',
      'Subtotal',
    ]],
    body: data.items.map((i) => [
      ...(hasCodes ? [i.code ?? ''] : []),
      i.product_name,
      String(i.quantity),
      `Bs ${i.price.toFixed(2)}`,
      `Bs ${i.subtotal.toFixed(2)}`,
    ]),
    foot: [[
      ...(hasCodes ? [''] : []),
      '',
      '',
      'TOTAL',
      `Bs ${itemsTotal.toFixed(2)}`,
    ]],
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: [0, 0, 0],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'right',
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: hasCodes ? 24 : undefined },
      1: { cellWidth: hasCodes ? undefined : undefined },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.3,
  })

  const afterTable = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3

  // === OBSERVATIONS + SIDE INFO ===
  const obsLeftW = 100
  const obsRightX = ml + obsLeftW + 4

  doc.setFontSize(7)
  setBold()
  doc.setTextColor(0)
  doc.text('OBSERVACIONES', ml, afterTable + 1)
  setNormal()
  doc.setFontSize(7)
  doc.setTextColor(80)
  if (data.notes) {
    const splitNotes = doc.splitTextToSize(data.notes, obsLeftW - 2)
    doc.text(splitNotes, ml + 1, afterTable + 4.5)
  }

  const obsRightItems: { label: string; value: string }[] = []
  if (data.discount > 0) {
    obsRightItems.push({ label: 'Descuento', value: `Bs ${data.discount.toFixed(2)}` })
  }
  if (data.creditAnticipo > 0) {
    obsRightItems.push({ label: 'Anticipo', value: `Bs ${data.creditAnticipo.toFixed(2)}` })
  }
  if (data.paymentType === 'Crédito') {
    obsRightItems.push({ label: 'Saldo crédito', value: `Bs ${(data.total - data.creditAnticipo).toFixed(2)}` })
  }

  let ry = afterTable + 1
  obsRightItems.forEach((item) => {
    doc.setFontSize(7)
    doc.setTextColor(80)
    setNormal()
    doc.text(`${item.label}:`, obsRightX, ry)
    setBold()
    doc.setTextColor(0)
    doc.text(item.value, rightX, ry, { align: 'right' })
    ry += 4
  })

  const obsEndY = afterTable + 5 + (data.notes ? doc.splitTextToSize(data.notes, obsLeftW - 2).length * 3.5 : 3)

  // === PAYMENT SUMMARY ===
  const sumY = obsEndY + 2

  doc.setFontSize(8)
  setBold()
  doc.setTextColor(0)
  doc.text('SON:', ml, sumY)
  setNormal()
  doc.setFontSize(7)
  doc.setTextColor(60)
  doc.text(`${numeroALetras(data.total)} BOLIVIANOS`, ml, sumY + 4)

  doc.setFontSize(7)
  setBold()
  doc.setTextColor(0)
  doc.text('FORMA DE PAGO:', ml, sumY + 9.5)
  setNormal()
  doc.setTextColor(80)
  doc.text(data.paymentType.toUpperCase(), ml, sumY + 13)

  let nextY = sumY + 13

  if (data.creditAnticipo > 0) {
    doc.setFontSize(6.5)
    doc.setTextColor(80)
    doc.text(`Anticipo: Bs ${data.creditAnticipo.toFixed(2)}`, ml + 25, nextY)
    nextY += 3.5
  }

  if (data.cashAmount > 0 && data.qrAmount > 0) {
    doc.setFontSize(6.5)
    doc.setTextColor(80)
    doc.text(`Efectivo: Bs ${data.cashAmount.toFixed(2)}`, ml + 25, nextY)
    nextY += 3.5
    doc.text(`QR/Transf.: Bs ${data.qrAmount.toFixed(2)}`, ml + 25, nextY)
  } else if (data.cashAmount > 0) {
    doc.setFontSize(6.5)
    doc.setTextColor(80)
    doc.text(`Efectivo: Bs ${data.cashAmount.toFixed(2)}`, ml + 25, nextY)
  } else if (data.qrAmount > 0) {
    doc.setFontSize(6.5)
    doc.setTextColor(80)
    doc.text(`QR/Transf.: Bs ${data.qrAmount.toFixed(2)}`, ml + 25, nextY)
  }

  doc.setFontSize(16)
  setBold()
  doc.setTextColor(0)
  doc.text(`Bs ${data.total.toFixed(2)}`, rightX, sumY + 5, { align: 'right' })

  doc.setFontSize(7)
  setNormal()
  doc.setTextColor(80)
  doc.text(`Cajero: ${data.seller}`, rightX, sumY + 11, { align: 'right' })

  const sumEndY = sumY + 19

  // === CREDIT DETAIL ===
  if (data.paymentType === 'Crédito' && data.creditPayments.length > 0) {
    const creditStartY = sumEndY + 6

    doc.setFontSize(10)
    setBold()
    doc.setTextColor(0)
    doc.text('DETALLE DE CRÉDITO', ml, creditStartY + 3)

    autoTable(doc, {
      startY: creditStartY + 5,
      head: [['Fecha', 'Hora', 'Monto', 'Saldo']],
      body: data.creditPayments.map((p) => [
        p.date,
        p.time,
        `Bs ${p.amount.toFixed(2)}`,
        `Bs ${p.balance.toFixed(2)}`,
      ]),
      foot: [[
        '',
        'TOTAL PAGADO',
        `Bs ${data.creditTotalPaid.toFixed(2)}`,
        '',
      ]],
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: [0, 0, 0],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center',
      },
      footStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 7.5,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: {},
        1: {},
        2: { halign: 'right' },
        3: { halign: 'right' },
      },
      tableLineColor: [0, 0, 0],
      tableLineWidth: 0.3,
    })

    const afterCredit = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5

    doc.setFontSize(8)
    setBold()
    doc.setTextColor(0)
    doc.text(`SALDO ACTUAL: Bs ${data.creditBalance.toFixed(2)}`, rightX, afterCredit, { align: 'right' })
  }

  if (print) {
    doc.output('dataurlnewwindow')
  } else {
    doc.save(`venta-${data.number}.pdf`)
  }
}

interface PurchasePdfData {
  number: string
  date: string
  branch: string
  branchAddress: string
  branchPhone: string
  responsible: string
  total: number
  items: { product_name: string; quantity: number; unit_cost: number; subtotal: number }[]
  expenses: { description: string; cost: number }[]
  notes: string | null
}

export function exportPurchasePdf(data: PurchasePdfData, showCost = true) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pw = doc.internal.pageSize.getWidth()
  const ml = 14
  const mr = 14
  const cw = pw - ml - mr
  const rightX = pw - mr

  doc.setFont('helvetica', 'normal')

  function setBold() { doc.setFont('helvetica', 'bold') }
  function setNormal() { doc.setFont('helvetica', 'normal') }

  const logoY = 14
  doc.setFontSize(20)
  setBold()
  doc.text('SIIM', ml, logoY)
  setNormal()
  doc.setFontSize(6.5)
  doc.setTextColor(120)
  doc.text('Sistema Integral de Inventarios', ml, logoY + 3.5)

  doc.setFontSize(8)
  setBold()
  doc.setTextColor(0)
  doc.text(data.branch, pw / 2, logoY + 8, { align: 'center' })
  setNormal()
  doc.setFontSize(7)
  doc.setTextColor(80)
  if (data.branchAddress) doc.text(data.branchAddress, pw / 2, logoY + 11.5, { align: 'center' })
  if (data.branchPhone) doc.text(`Tel: ${data.branchPhone}`, pw / 2, logoY + 15, { align: 'center' })

  const blockW = 52
  const blockX = rightX - blockW

  doc.setFontSize(6)
  setNormal()
  doc.setTextColor(120)
  doc.text('COMPROBANTE', blockX + blockW / 2, logoY + 0.5, { align: 'center' })

  doc.setFontSize(9)
  setBold()
  doc.setTextColor(0)
  doc.text(`N° ${data.number}`, blockX + blockW / 2, logoY + 5.5, { align: 'center' })

  doc.setFontSize(6)
  setNormal()
  doc.setTextColor(120)
  doc.text(data.date, blockX + blockW / 2, logoY + 9.5, { align: 'center' })

  const infoY = logoY + 17
  doc.setFontSize(7.5)
  setBold()
  doc.setTextColor(0)
  doc.text('DATOS DE LA COMPRA', ml, infoY)
  setNormal()
  doc.setTextColor(80)
  doc.setFontSize(7.5)
  doc.text(`Responsable: ${data.responsible}`, ml, infoY + 4.5)

  const tableStartY = infoY + 12

  const itemsTotal = data.items.reduce((s, i) => s + i.subtotal, 0)
  const expensesTotal = data.expenses.reduce((s, e) => s + e.cost, 0)

  const headRow = showCost
    ? ['Nombre', 'Cantidad', 'Costo Unit.', 'Subtotal']
    : ['Nombre', 'Cantidad']

  const bodyRows = showCost
    ? data.items.map((i) => [
        i.product_name,
        String(i.quantity),
        `Bs ${i.unit_cost.toFixed(2)}`,
        `Bs ${i.subtotal.toFixed(2)}`,
      ])
    : data.items.map((i) => [
        i.product_name,
        String(i.quantity),
      ])

  const footRow = showCost
    ? ['', '', 'TOTAL', `Bs ${itemsTotal.toFixed(2)}`]
    : ['', `TOTAL: Bs ${data.total.toFixed(2)}`]

  const colStyles: Record<string, { halign: 'left' | 'center' | 'right' | 'justify' }> = showCost
    ? { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
    : { 1: { halign: 'right' } }

  autoTable(doc, {
    startY: tableStartY,
    head: [headRow],
    body: bodyRows,
    foot: [footRow],
    styles: {
      fontSize: 7.5,
      cellPadding: 1.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: [0, 0, 0],
      fontSize: 7,
      fontStyle: 'bold',
      halign: 'center',
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'right',
      cellPadding: 2,
    },
    columnStyles: colStyles,
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.3,
  })

  const afterItems = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3

  if (showCost && data.expenses.length > 0) {
    doc.setFontSize(8)
    setBold()
    doc.setTextColor(0)
    doc.text('GASTOS OPERATIVOS', ml, afterItems)
    setNormal()

    autoTable(doc, {
      startY: afterItems + 2,
      head: [['Detalle', 'Costo']],
      body: data.expenses.map((e) => [e.description, `Bs ${e.cost.toFixed(2)}`]),
      foot: [['TOTAL GASTOS', `Bs ${expensesTotal.toFixed(2)}`]],
      styles: {
        fontSize: 7.5,
        cellPadding: 1.5,
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: [0, 0, 0],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center',
      },
      footStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'right',
        cellPadding: 2,
      },
      columnStyles: {
        0: {},
        1: { halign: 'right', cellWidth: 40 },
      },
      tableLineColor: [0, 0, 0],
      tableLineWidth: 0.3,
    })
  }

  const afterTable = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3

  doc.setFontSize(7)
  setBold()
  doc.setTextColor(0)
  doc.text('OBSERVACIONES', ml, afterTable + 1)
  setNormal()
  doc.setFontSize(7)
  doc.setTextColor(80)
  if (data.notes) {
    const splitNotes = doc.splitTextToSize(data.notes, cw - 2)
    doc.text(splitNotes, ml + 1, afterTable + 4.5)
  }

  const obsEndY = afterTable + 5 + (data.notes ? doc.splitTextToSize(data.notes, cw - 2).length * 3.5 : 3)

  const sumY = obsEndY + 2

  doc.setFontSize(8)
  setBold()
  doc.setTextColor(0)
  doc.text('SON:', ml, sumY)
  setNormal()
  doc.setFontSize(7)
  doc.setTextColor(60)
  doc.text(`${numeroALetras(data.total)} BOLIVIANOS`, ml, sumY + 4)

  doc.setFontSize(16)
  setBold()
  doc.setTextColor(0)
  doc.text(`Bs ${data.total.toFixed(2)}`, rightX, sumY + 2, { align: 'right' })

  doc.setFontSize(7)
  setNormal()
  doc.setTextColor(80)
  doc.text(`Responsable: ${data.responsible}`, rightX, sumY + 8, { align: 'right' })

  doc.save(`compra-${data.number}.pdf`)
}

interface TransferPdfData {
  number: string
  date: string
  fromBranch: string
  fromBranchAddress: string
  fromBranchPhone: string
  toBranch: string
  toBranchAddress: string
  toBranchPhone: string
  createdBy: string
  sentBy: string
  receivedBy: string
  statusLabel: string
  notes: string | null
  items: { product_name: string; quantity: number; unit_cost: number }[]
}

export function exportTransferPdf(data: TransferPdfData, showCost = true) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pw = doc.internal.pageSize.getWidth()
  const ml = 14
  const mr = 14
  const rightX = pw - mr

  doc.setFont('helvetica', 'normal')

  function setBold() { doc.setFont('helvetica', 'bold') }
  function setNormal() { doc.setFont('helvetica', 'normal') }

  const logoY = 14
  doc.setFontSize(20)
  setBold()
  doc.text('SIIM', ml, logoY)
  setNormal()
  doc.setFontSize(6.5)
  doc.setTextColor(120)
  doc.text('Sistema Integral de Inventarios', ml, logoY + 3.5)

  doc.setFontSize(14)
  setBold()
  doc.setTextColor(0)
  doc.text('TRASPASO DE INVENTARIO', pw / 2, logoY + 8, { align: 'center' })
  setNormal()
  doc.setFontSize(8)
  doc.setTextColor(80)
  doc.text(`Estado: ${data.statusLabel}`, pw / 2, logoY + 12, { align: 'center' })

  const blockW = 52
  const blockX = rightX - blockW

  doc.setFontSize(6)
  setNormal()
  doc.setTextColor(120)
  doc.text('COMPROBANTE', blockX + blockW / 2, logoY + 0.5, { align: 'center' })

  doc.setFontSize(9)
  setBold()
  doc.setTextColor(0)
  doc.text(`N° ${data.number}`, blockX + blockW / 2, logoY + 5.5, { align: 'center' })

  doc.setFontSize(6)
  setNormal()
  doc.setTextColor(120)
  doc.text(data.date, blockX + blockW / 2, logoY + 9.5, { align: 'center' })

  const infoY = logoY + 17
  doc.setFontSize(7.5)
  setBold()
  doc.setTextColor(0)
  doc.text('DATOS DEL TRASPASO', ml, infoY)
  setNormal()
  doc.setTextColor(80)
  doc.setFontSize(7.5)

  doc.text(`Origen: ${data.fromBranch}`, ml, infoY + 4.5)
  if (data.fromBranchAddress) doc.text(`Dirección: ${data.fromBranchAddress}`, ml, infoY + 8.5)
  if (data.fromBranchPhone) doc.text(`Tel: ${data.fromBranchPhone}`, ml, infoY + 12.5)
  doc.text(`Destino: ${data.toBranch}`, rightX, infoY + 4.5, { align: 'right' })
  if (data.toBranchAddress) doc.text(`Dirección: ${data.toBranchAddress}`, rightX, infoY + 8.5, { align: 'right' })
  if (data.toBranchPhone) doc.text(`Tel: ${data.toBranchPhone}`, rightX, infoY + 12.5, { align: 'right' })

  const tableStartY = infoY + 17

  const itemsTotal = data.items.reduce((s, i) => s + i.quantity * i.unit_cost, 0)
  const totalUnits = data.items.reduce((s, i) => s + i.quantity, 0)

  const headRow = showCost
    ? ['Nombre', 'Cantidad', 'Costo Unit.', 'Subtotal']
    : ['Nombre', 'Cantidad']

  const bodyRows = showCost
    ? data.items.map(i => [
        i.product_name,
        String(i.quantity),
        `Bs ${i.unit_cost.toFixed(2)}`,
        `Bs ${(i.quantity * i.unit_cost).toFixed(2)}`,
      ])
    : data.items.map(i => [i.product_name, String(i.quantity)])

  const footRow = showCost
    ? ['', '', 'TOTAL', `Bs ${itemsTotal.toFixed(2)}`]
    : ['', `TOTAL UNIDADES: ${totalUnits}`]

  const colStyles: Record<string, { halign: 'left' | 'center' | 'right' | 'justify' }> = showCost
    ? { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
    : { 1: { halign: 'right' } }

  autoTable(doc, {
    startY: tableStartY,
    head: [headRow],
    body: bodyRows,
    foot: [footRow],
    styles: {
      fontSize: 7.5,
      cellPadding: 1.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: [0, 0, 0],
      fontSize: 7,
      fontStyle: 'bold',
      halign: 'center',
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'right',
      cellPadding: 2,
    },
    columnStyles: colStyles,
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.3,
  })

  const afterTable = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3

  doc.setFontSize(7)
  setBold()
  doc.setTextColor(0)
  doc.text('OBSERVACIONES', ml, afterTable + 1)
  setNormal()
  doc.setFontSize(7)
  doc.setTextColor(80)
  if (data.notes) {
    const splitNotes = doc.splitTextToSize(data.notes, 180)
    doc.text(splitNotes, ml + 1, afterTable + 4.5)
  }

  doc.setFontSize(7)
  setBold()
  doc.setTextColor(0)
  doc.text('RESPONSABLES', ml, afterTable + 17)
  setNormal()
  doc.setTextColor(80)
  doc.text(`Creado por: ${data.createdBy}`, ml, afterTable + 21)
  doc.text(`Enviado por: ${data.sentBy}`, ml, afterTable + 25)
  doc.text(`Recibido por: ${data.receivedBy}`, ml, afterTable + 29)

  const sigY = afterTable + 42
  doc.setLineWidth(0.3)
  doc.line(ml + 5, sigY - 6, ml + 35, sigY - 6)
  doc.line(rightX - 35, sigY - 6, rightX - 5, sigY - 6)

  doc.setFontSize(8)
  setBold()
  doc.setTextColor(0)
  doc.text('ENVIADO POR', ml + 20, sigY, { align: 'center' })
  doc.text('RECIBIDO POR', rightX - 20, sigY, { align: 'center' })
  setNormal()
  doc.setFontSize(7)
  doc.setTextColor(80)
  doc.text('Firma y sello', ml + 20, sigY + 3, { align: 'center' })
  doc.text('Firma y sello', rightX - 20, sigY + 3, { align: 'center' })

  doc.save(`traspaso-${data.number}.pdf`)
}
