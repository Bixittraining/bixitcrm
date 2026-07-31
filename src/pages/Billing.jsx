import { useState, useMemo, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IndianRupee,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  CreditCard,
  Download,
  X,
  ArrowUpDown,
  Search,
  FileText,
  Calendar,
  Hash,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { modalOverlayVariants, modalCardVariants } from '../lib/modalVariants'
import { useData } from '../context/DataContext'

const formatINR = (num) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num)
}

const formatLakhs = (num) => {
  if (num >= 100000) {
    const lakhs = (num / 100000).toFixed(1)
    return `${lakhs}L`
  }
  return formatINR(num)
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export default function Billing() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { students, invoices: invoicesData, recordPayment, createInvoice, installments, updateInvoiceDueDate } = useData()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [sortField, setSortField] = useState('id')
  const [sortDirection, setSortDirection] = useState('desc')
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [toast, setToast] = useState(null)
  const [showCreateBill, setShowCreateBill] = useState(false)
  const [createForm, setCreateForm] = useState({ student: '', course: '', amount: '', dueDate: '' })
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMode: 'UPI',
    date: new Date().toISOString().split('T')[0],
    reference: '',
  })

  const showToast = (msg, type = 'success') => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000) }

  const getSchedule = (invoiceId) => installments.filter((i) => i.invoice_id === invoiceId).sort((a, b) => a.seq - b.seq)
  // First installment that isn't fully paid yet — a "partial" one (paid
  // less than its amount) still counts as next, not just untouched ones.
  const getNextPending = (invoiceId) => getSchedule(invoiceId).find((i) => i.status !== 'paid')

  const handleConfirmPayment = () => {
    const amt = Number(paymentForm.amount)
    if (!amt || amt <= 0 || amt > selectedInvoice.balance) { showToast('Enter a valid payment amount', 'error'); return }
    recordPayment(selectedInvoice.id, amt, paymentForm.paymentMode, paymentForm.date)
    showToast(`Payment of ${formatINR(amt)} recorded for ${selectedInvoice.student}`)
    closeModal()
  }

  const handleCreateBill = (e) => {
    e.preventDefault()
    // Deriving from array length breaks the moment a gap appears in the
    // sequence (e.g. an invoice gets deleted) — length+1 can collide with
    // an ID that already exists, silently failing the insert. Derive from
    // the highest existing suffix for the current year instead.
    const prefix = `INV-${new Date().getFullYear()}-`
    const maxSeq = invoicesData.reduce((max, inv) => {
      if (!inv.id?.startsWith(prefix)) return max
      const n = parseInt(inv.id.slice(prefix.length), 10)
      return Number.isFinite(n) && n > max ? n : max
    }, 0)
    const id = `${prefix}${String(maxSeq + 1).padStart(3, '0')}`
    createInvoice({
      id, student: createForm.student, course: createForm.course,
      amount: Number(createForm.amount), paid: 0, balance: Number(createForm.amount),
      date: new Date().toISOString().split('T')[0], due_date: createForm.dueDate,
      status: 'partial', payment_mode: 'UPI',
    })
    setShowCreateBill(false)
    setCreateForm({ student: '', course: '', amount: '', dueDate: '' })
    showToast(`Fee bill ${id} created for ${createForm.student}`)
  }

  const handleDownloadReport = () => {
    const csv = 'Invoice ID,Student,Course,Amount,Paid,Balance,Due Date,Status\n' + invoicesData.map(i => `${i.id},${i.student},${i.course},${i.amount},${i.paid},${i.balance},${i.dueDate},${i.status}`).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'billing-report.csv'; a.click(); URL.revokeObjectURL(url)
    showToast('Billing report downloaded')
  }

  const handleDownloadInvoice = (inv) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 48
    let y = 60

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.setTextColor(79, 70, 229)
    doc.text('BIX Academy', margin, y)
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.setFont('helvetica', 'normal')
    doc.text('Education CRM', margin, y + 16)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(20)
    doc.text('TAX INVOICE', pageWidth - margin, y, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(inv.id, pageWidth - margin, y + 16, { align: 'right' })

    y += 50
    doc.setDrawColor(220)
    doc.line(margin, y, pageWidth - margin, y)
    y += 30

    doc.setFontSize(10)
    doc.setTextColor(120)
    doc.text('BILLED TO', margin, y)
    doc.text('INVOICE DETAILS', pageWidth / 2 + 10, y)
    y += 16

    doc.setFontSize(12)
    doc.setTextColor(20)
    doc.setFont('helvetica', 'bold')
    doc.text(inv.student, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Course: ${inv.course}`, margin, y + 16)

    doc.setFontSize(10)
    doc.text(`Invoice Date: ${inv.date || '-'}`, pageWidth / 2 + 10, y)
    doc.text(`Due Date: ${inv.dueDate || '-'}`, pageWidth / 2 + 10, y + 16)
    doc.text(`Status: ${inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}`, pageWidth / 2 + 10, y + 32)
    if (inv.payment_plan) doc.text(`Payment Plan: ${inv.payment_plan}`, pageWidth / 2 + 10, y + 48)

    y += 80
    const rowH = 26
    doc.setFillColor(79, 70, 229)
    doc.rect(margin, y, pageWidth - margin * 2, rowH, 'F')
    doc.setTextColor(255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('DESCRIPTION', margin + 10, y + 17)
    doc.text('AMOUNT', pageWidth - margin - 10, y + 17, { align: 'right' })
    y += rowH

    const rows = [
      ['Course Fee (incl. GST)', formatINR(inv.amount)],
      ['Amount Paid', `- ${formatINR(inv.paid)}`],
    ]
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(40)
    rows.forEach(([label, val], i) => {
      if (i % 2 === 1) { doc.setFillColor(245, 245, 250); doc.rect(margin, y, pageWidth - margin * 2, rowH, 'F') }
      doc.text(label, margin + 10, y + 17)
      doc.text(val, pageWidth - margin - 10, y + 17, { align: 'right' })
      y += rowH
    })

    doc.setDrawColor(220)
    doc.line(margin, y, pageWidth - margin, y)
    y += 24
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(20)
    doc.text('Balance Due', margin, y)
    doc.setTextColor(inv.balance > 0 ? 220 : 22, inv.balance > 0 ? 38 : 163, inv.balance > 0 ? 38 : 74)
    doc.text(formatINR(inv.balance), pageWidth - margin, y, { align: 'right' })

    y += 50
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(140)
    doc.text('This is a computer-generated invoice from BIX Academy CRM.', margin, y)

    doc.save(`${inv.id}.pdf`)
  }

  // "Overdue" used to mean "status literally equals the string 'overdue'" —
  // but no code path ever sets that; only one old seed row happened to have
  // it. Every other unpaid invoice past its due date was invisible to this
  // metric. Overdue is now computed the same way everywhere: unpaid balance
  // + due date in the past, regardless of what the stored status says.
  const today = new Date().toISOString().slice(0, 10)
  const isInvoiceOverdue = (inv) => inv.balance > 0 && !!inv.dueDate && inv.dueDate < today
  const displayStatus = (inv) => (isInvoiceOverdue(inv) ? 'overdue' : inv.status)

  // Financial calculations
  const totalRevenue = useMemo(() => invoicesData.reduce((sum, inv) => sum + inv.paid, 0), [invoicesData])
  const pendingFees = useMemo(() => invoicesData.reduce((sum, inv) => sum + inv.balance, 0), [invoicesData])
  const paidCount = useMemo(() => invoicesData.filter((inv) => inv.status === 'paid').length, [invoicesData])
  const overdueInvoices = useMemo(() => invoicesData.filter(isInvoiceOverdue), [invoicesData, today])
  const overdueTotal = useMemo(() => overdueInvoices.reduce((sum, inv) => sum + inv.balance, 0), [overdueInvoices])

  const [bucketFilter, setBucketFilter] = useState('all')

  // Sorting and filtering
  const filteredInvoices = useMemo(() => {
    let result = [...invoicesData]

    if (bucketFilter === 'pending') result = result.filter((inv) => inv.balance > 0)
    else if (bucketFilter === 'paid') result = result.filter((inv) => inv.status === 'paid')
    else if (bucketFilter === 'overdue') result = result.filter(isInvoiceOverdue)

    // "Full Payment" isn't always stored explicitly — an invoice with no
    // installment plan (payment_plan is null) is a full-payment invoice by
    // definition, so it's treated the same as an explicit "Full Payment".
    if (planFilter === 'full') result = result.filter((inv) => !inv.payment_plan || inv.payment_plan === 'Full Payment')
    else if (planFilter !== 'all') result = result.filter((inv) => inv.payment_plan === planFilter)

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (inv) =>
          inv.id.toLowerCase().includes(q) ||
          inv.student.toLowerCase().includes(q) ||
          inv.course.toLowerCase().includes(q) ||
          displayStatus(inv).toLowerCase().includes(q)
      )
    }

    result.sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [invoicesData, searchQuery, sortField, sortDirection, bucketFilter, planFilter, today])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // The old "view" vs "payment" split opened two differently-shaped modals
  // for the same invoice (details-only vs payment-only, missing each
  // other's info depending on which icon you clicked). Every invoice modal
  // now always shows full details + installment schedule + the payment
  // form together.
  const openModal = (invoice) => {
    setSelectedInvoice(invoice)
    const next = getNextPending(invoice.id)
    const suggested = next ? Number(next.amount) - Number(next.paid_amount) : invoice.balance
    setPaymentForm({
      amount: suggested.toString(),
      paymentMode: invoice.paymentMode || 'UPI',
      date: new Date().toISOString().split('T')[0],
      reference: '',
    })
  }

  // Auto-open a specific student's invoice when navigated here with that
  // intent (e.g. the "Fees" button on the Students page). Picks the most
  // recent invoice if a student somehow has more than one.
  useEffect(() => {
    const studentName = location.state?.openInvoiceForStudent
    if (studentName) {
      const matches = invoicesData.filter((inv) => inv.student === studentName)
      const target = matches[0]
      if (target) openModal(target)
      else showToast(`No invoice found yet for ${studentName}`, 'error')
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, location.pathname, navigate, invoicesData])

  const closeModal = () => {
    setSelectedInvoice(null)
  }


  const getStatusBadge = (status) => {
    const styles = {
      paid: 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30',
      partial: 'bg-accent-500/15 text-accent-500 border border-accent-500/30',
      overdue: 'bg-rose-500/15 text-rose-500 border border-rose-500/30',
    }
    const labels = { paid: 'Paid', partial: 'Partial', overdue: 'Overdue' }
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
        {status === 'paid' && <CheckCircle2 size={12} />}
        {status === 'partial' && <Clock size={12} />}
        {status === 'overdue' && <AlertTriangle size={12} />}
        {labels[status]}
      </span>
    )
  }

  // Style helpers
  const card = isDark
    ? 'bg-dark-900 border border-dark-700/60'
    : 'bg-white border border-dark-200/60 shadow-sm'

  const cardHover = isDark
    ? 'hover:border-dark-600/80'
    : 'hover:border-dark-300/80 hover:shadow-md'

  const textPrimary = isDark ? 'text-white' : 'text-dark-900'
  const textSecondary = isDark ? 'text-dark-400' : 'text-dark-500'
  const textMuted = isDark ? 'text-dark-500' : 'text-dark-400'

  const overviewCards = [
    {
      key: 'all',
      title: 'Total Revenue',
      value: formatLakhs(totalRevenue),
      subtitle: `${formatINR(totalRevenue)} collected`,
      icon: IndianRupee,
      color: 'text-emerald-500',
      bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50',
    },
    {
      key: 'pending',
      title: 'Pending Fees',
      value: formatLakhs(pendingFees),
      subtitle: `${formatINR(pendingFees)} outstanding`,
      icon: Clock,
      color: 'text-accent-500',
      bg: isDark ? 'bg-accent-500/10' : 'bg-amber-50',
    },
    {
      key: 'paid',
      title: 'Paid Invoices',
      value: paidCount,
      subtitle: `of ${invoicesData.length} total invoices`,
      icon: CheckCircle2,
      color: 'text-sky-500',
      bg: isDark ? 'bg-sky-500/10' : 'bg-sky-50',
    },
    {
      key: 'overdue',
      title: 'Overdue',
      value: overdueInvoices.length,
      subtitle: `${formatINR(overdueTotal)} overdue`,
      icon: AlertTriangle,
      color: 'text-rose-500',
      bg: isDark ? 'bg-rose-500/10' : 'bg-rose-50',
    },
  ]

  const tableHeaders = [
    { key: 'id', label: 'Invoice ID' },
    { key: 'student', label: 'Student' },
    { key: 'course', label: 'Course' },
    { key: 'amount', label: 'Total Amount', align: 'right' },
    { key: 'paid', label: 'Paid', align: 'right' },
    { key: 'balance', label: 'Balance', align: 'right' },
    { key: 'dueDate', label: 'Due Date' },
    { key: 'status', label: 'Status' },
    { key: 'payment_plan', label: 'Payment Plan' },
    { key: 'paymentMode', label: 'Payment Mode' },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${textPrimary}`}>Fees & Billing</h1>
          <p className={`mt-1 text-sm ${textSecondary}`}>
            Manage student fees, invoices, and payment tracking
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowCreateBill(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-semibold shadow-lg shadow-primary-600/25 hover:shadow-primary-600/40 transition-shadow"
          >
            <Plus size={16} />
            Create Fee Bill
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => showToast('Click any invoice row below to view details and record a payment', 'error')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
              isDark
                ? 'border-dark-600 text-dark-300 hover:bg-dark-800 hover:text-white'
                : 'border-dark-300 text-dark-600 hover:bg-dark-50 hover:text-dark-900'
            }`}
          >
            <CreditCard size={16} />
            Record Payment
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleDownloadReport}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
              isDark
                ? 'border-dark-600 text-dark-300 hover:bg-dark-800 hover:text-white'
                : 'border-dark-300 text-dark-600 hover:bg-dark-50 hover:text-dark-900'
            }`}
          >
            <Download size={16} />
            Download Report
          </motion.button>
        </div>
      </motion.div>

      {/* Financial Overview Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewCards.map((item, i) => (
          <motion.button
            key={item.key}
            type="button"
            variants={itemVariants}
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setBucketFilter(bucketFilter === item.key ? 'all' : item.key)}
            className={`rounded-2xl p-5 text-left transition-all duration-200 ${card} ${cardHover} ${
              bucketFilter === item.key ? 'ring-2 ring-primary-500 border-primary-500' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className={`text-xs font-medium uppercase tracking-wider ${textMuted}`}>{item.title}</p>
                <motion.p
                  className={`text-2xl font-bold ${item.title === 'Overdue' ? 'text-rose-500' : textPrimary}`}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.1, type: 'spring', stiffness: 200 }}
                >
                  {typeof item.value === 'number' ? item.value : item.value}
                </motion.p>
                <p className={`text-xs ${textSecondary}`}>{item.subtitle}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${item.bg}`}>
                <item.icon size={20} className={item.color} />
              </div>
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* Invoices Table */}
      <motion.div variants={itemVariants} className={`rounded-2xl overflow-hidden ${card}`}>
        {/* Table Header Bar */}
        <div className={`px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b ${
          isDark ? 'border-dark-700/60' : 'border-dark-200/60'
        }`}>
          <div className="flex items-center gap-2">
            <FileText size={18} className={textSecondary} />
            <h2 className={`text-lg font-semibold ${textPrimary}`}>Invoices</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              isDark ? 'bg-dark-800 text-dark-400' : 'bg-dark-100 text-dark-500'
            }`}>
              {filteredInvoices.length}
            </span>
            {bucketFilter !== 'all' && (
              <button onClick={() => setBucketFilter('all')}
                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${isDark ? 'bg-primary-500/15 text-primary-400 hover:bg-primary-500/25' : 'bg-primary-50 text-primary-600 hover:bg-primary-100'}`}>
                {overviewCards.find((c) => c.key === bucketFilter)?.title} filter <X size={12} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl text-sm outline-none cursor-pointer transition-colors ${
                isDark
                  ? 'bg-dark-800 border border-dark-600 text-white'
                  : 'bg-dark-50 border border-dark-200 text-dark-900'
              }`}
            >
              <option value="all">All Payment Plans</option>
              <option value="full">Full Payment</option>
              <option value="2 Installments">2 Installments</option>
              <option value="3 Installments">3 Installments</option>
            </select>
            <div className="relative">
              <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-9 pr-4 py-2 rounded-xl text-sm w-full sm:w-64 outline-none transition-colors ${
                  isDark
                    ? 'bg-dark-800 border border-dark-600 text-white placeholder:text-dark-500 focus:border-primary-500'
                    : 'bg-dark-50 border border-dark-200 text-dark-900 placeholder:text-dark-400 focus:border-primary-500'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={isDark ? 'bg-dark-800/50' : 'bg-dark-50/80'}>
                {tableHeaders.map((header) => (
                  <th
                    key={header.key}
                    onClick={() => handleSort(header.key)}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors hover:${
                      isDark ? 'bg-dark-700/50' : 'bg-dark-100/80'
                    } ${header.align === 'right' ? 'text-right' : 'text-left'} ${textMuted}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {header.label}
                      <ArrowUpDown
                        size={12}
                        className={sortField === header.key ? (isDark ? 'text-primary-400' : 'text-primary-600') : 'opacity-30'}
                      />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice, i) => (
                <motion.tr
                  key={invoice.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => openModal(invoice)}
                  whileHover={{
                    backgroundColor: isDark
                      ? isInvoiceOverdue(invoice) ? 'rgba(244,63,94,0.08)' : 'rgba(255,255,255,0.03)'
                      : isInvoiceOverdue(invoice) ? 'rgba(244,63,94,0.04)' : 'rgba(0,0,0,0.02)',
                  }}
                  className={`border-b cursor-pointer transition-colors ${
                    isDark ? 'border-dark-800' : 'border-dark-100'
                  } ${
                    isInvoiceOverdue(invoice)
                      ? isDark ? 'bg-rose-500/[0.03]' : 'bg-rose-50/40'
                      : i % 2 === 1
                        ? isDark ? 'bg-dark-800/20' : 'bg-dark-50/40'
                        : ''
                  }`}
                >
                  <td className={`px-4 py-3.5 text-sm font-mono font-semibold ${
                    isDark ? 'text-primary-400' : 'text-primary-600'
                  }`}>
                    {invoice.id}
                  </td>
                  <td className={`px-4 py-3.5 text-sm font-medium ${textPrimary}`}>{invoice.student}</td>
                  <td className={`px-4 py-3.5 text-sm ${textSecondary}`}>{invoice.course}</td>
                  <td className={`px-4 py-3.5 text-sm font-semibold text-right ${textPrimary}`}>
                    {formatINR(invoice.amount)}
                  </td>
                  <td className={`px-4 py-3.5 text-sm text-right font-medium text-emerald-500`}>
                    {formatINR(invoice.paid)}
                  </td>
                  <td className={`px-4 py-3.5 text-sm text-right font-medium ${
                    invoice.balance > 0 ? 'text-rose-500' : 'text-emerald-500'
                  }`}>
                    {formatINR(invoice.balance)}
                  </td>
                  <td className={`px-4 py-3.5 text-sm ${textSecondary}`}>{invoice.dueDate}</td>
                  <td className="px-4 py-3.5">{getStatusBadge(displayStatus(invoice))}</td>
                  <td className={`px-4 py-3.5 text-sm ${textSecondary}`}>
                    {invoice.payment_plan ? (
                      <span className="inline-flex items-center gap-1">
                        {invoice.payment_plan}{invoice.locked && <span title="Locked — admin only to change">🔒</span>}
                      </span>
                    ) : '—'}
                  </td>
                  <td className={`px-4 py-3.5 text-sm ${textSecondary}`}>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium ${
                      isDark ? 'bg-dark-800 text-dark-300' : 'bg-dark-100 text-dark-600'
                    }`}>
                      {invoice.paymentMode}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length === 0 && (
          <div className={`px-6 py-12 text-center ${textMuted}`}>
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No invoices found matching your search.</p>
          </div>
        )}
      </motion.div>

      {/* Invoice Detail / Record Payment Modal */}
      <AnimatePresence>
        {selectedInvoice && (
          <motion.div
            variants={modalOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
            />

            {/* Modal Content */}
            <motion.div
              variants={modalCardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl ${
                isDark
                  ? 'bg-dark-900 border border-dark-700/60'
                  : 'bg-white border border-dark-200/60 shadow-2xl'
              }`}
            >
              {/* Modal Header */}
              <div className={`sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b ${
                isDark ? 'border-dark-700/60 bg-dark-900' : 'border-dark-200/60 bg-white'
              }`}>
                <div>
                  <h2 className={`text-lg font-bold ${textPrimary}`}>Invoice Details</h2>
                  <div className={`flex items-center gap-3 mt-1 text-sm ${textSecondary}`}>
                    <span className="font-mono font-semibold">{selectedInvoice.id}</span>
                    <span>|</span>
                    <span>{selectedInvoice.date}</span>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={closeModal}
                  className={`p-2 rounded-xl transition-colors ${
                    isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-dark-100 text-dark-500'
                  }`}
                >
                  <X size={18} />
                </motion.button>
              </div>

              <div className="p-6 space-y-6">
                {/* Student & Course Info */}
                <div className={`grid grid-cols-2 gap-4 p-4 rounded-xl ${
                  isDark ? 'bg-dark-800/50' : 'bg-dark-50'
                }`}>
                  <div>
                    <p className={`text-xs font-medium uppercase tracking-wider ${textMuted}`}>Student</p>
                    <p className={`mt-1 text-sm font-semibold ${textPrimary}`}>{selectedInvoice.student}</p>
                  </div>
                  <div>
                    <p className={`text-xs font-medium uppercase tracking-wider ${textMuted}`}>Course</p>
                    <p className={`mt-1 text-sm font-semibold ${textPrimary}`}>{selectedInvoice.course}</p>
                  </div>
                  <div>
                    <p className={`text-xs font-medium uppercase tracking-wider ${textMuted}`}>Due Date</p>
                    <input
                      type="date"
                      value={selectedInvoice.dueDate || ''}
                      onChange={(e) => {
                        const newDate = e.target.value
                        setSelectedInvoice((prev) => ({ ...prev, dueDate: newDate }))
                        updateInvoiceDueDate(selectedInvoice.id, newDate)
                        showToast(`Due date updated for ${selectedInvoice.id}`)
                      }}
                      className={`mt-1 text-sm font-semibold bg-transparent outline-none rounded px-1 -mx-1 cursor-pointer ${textPrimary}`}
                    />
                  </div>
                  <div>
                    <p className={`text-xs font-medium uppercase tracking-wider ${textMuted}`}>Status</p>
                    <div className="mt-1">{getStatusBadge(displayStatus(selectedInvoice))}</div>
                  </div>
                </div>

                {/* Fee Breakdown */}
                <div>
                  <h3 className={`text-sm font-semibold mb-3 ${textPrimary}`}>Fee Breakdown</h3>
                  <div className={`rounded-xl overflow-hidden border ${
                    isDark ? 'border-dark-700/60' : 'border-dark-200/60'
                  }`}>
                    {selectedInvoice.payment_plan && (
                      <div className={`flex items-center justify-between px-4 py-3 ${
                        isDark ? 'bg-dark-800/30' : 'bg-dark-50/50'
                      }`}>
                        <span className={`text-sm ${textSecondary}`}>Payment Plan</span>
                        <span className={`text-sm font-semibold ${textPrimary}`}>
                          {selectedInvoice.payment_plan}{selectedInvoice.locked ? ' 🔒' : ''}
                        </span>
                      </div>
                    )}
                    <div className={`flex items-center justify-between px-4 py-3 border-t ${
                      isDark ? 'border-dark-700/40' : 'border-dark-100'
                    } ${!selectedInvoice.payment_plan ? '!border-t-0' : ''}`}>
                      <span className={`text-sm ${textSecondary}`}>Total Fee</span>
                      <span className={`text-sm font-semibold ${textPrimary}`}>{formatINR(selectedInvoice.amount)}</span>
                    </div>
                    <div className={`flex items-center justify-between px-4 py-3 border-t ${
                      isDark ? 'border-dark-700/40' : 'border-dark-100'
                    }`}>
                      <span className={`text-sm ${textSecondary}`}>Amount Paid</span>
                      <span className="text-sm font-semibold text-emerald-500">{formatINR(selectedInvoice.paid)}</span>
                    </div>
                    <div className={`flex items-center justify-between px-4 py-3 border-t ${
                      isDark ? 'border-dark-700/40 bg-dark-800/50' : 'border-dark-100 bg-dark-50'
                    }`}>
                      <span className={`text-sm font-semibold ${textPrimary}`}>Balance Due</span>
                      <span className={`text-sm font-bold ${selectedInvoice.balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {formatINR(selectedInvoice.balance)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Installment Schedule */}
                {getSchedule(selectedInvoice.id).length > 0 && (
                  <div>
                    <h3 className={`text-sm font-semibold mb-3 ${textPrimary}`}>Installment Schedule</h3>
                    <div className="space-y-2">
                      {getSchedule(selectedInvoice.id).map((inst) => {
                        const isNext = inst.status !== 'paid' && inst.id === getNextPending(selectedInvoice.id)?.id
                        const remaining = Number(inst.amount) - Number(inst.paid_amount)
                        return (
                          <div key={inst.id} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                            inst.status === 'paid'
                              ? isDark ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
                              : isNext
                                ? isDark ? 'bg-accent-500/10 border-accent-500/40' : 'bg-amber-50 border-amber-300'
                                : isDark ? 'bg-dark-800/40 border-dark-700/40' : 'bg-dark-50 border-dark-200/40'
                          }`}>
                            <div className="flex items-center gap-3">
                              <div className={`p-1.5 rounded-lg ${inst.status === 'paid' ? (isDark ? 'bg-emerald-500/15' : 'bg-emerald-100') : (isDark ? 'bg-dark-700' : 'bg-dark-200')}`}>
                                {inst.status === 'paid' ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Clock size={14} className={isDark ? 'text-dark-400' : 'text-dark-500'} />}
                              </div>
                              <div>
                                <p className={`text-sm font-medium ${textPrimary}`}>
                                  Installment {inst.seq} &middot; {formatINR(inst.amount)}
                                  {inst.status === 'partial' && <span className={textMuted}> ({formatINR(Number(inst.paid_amount))} paid, {formatINR(remaining)} left)</span>}
                                </p>
                                <p className={`text-xs ${textMuted}`}>
                                  {inst.status === 'paid' ? `Paid on ${inst.paid_date}` : `Due ${inst.due_date}`}
                                </p>
                              </div>
                            </div>
                            {isNext && <span className="text-xs font-semibold text-accent-500">Pay this next</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Record Payment Form */}
                {selectedInvoice.status !== 'paid' && (
                  <div>
                    <h3 className={`text-sm font-semibold mb-3 ${textPrimary}`}>
                      {getSchedule(selectedInvoice.id).length > 0 ? `Record Payment — Installment ${getNextPending(selectedInvoice.id)?.seq}` : 'Record New Payment'}
                    </h3>
                    {getSchedule(selectedInvoice.id).length > 0 && (
                      <p className={`text-xs mb-3 ${textMuted}`}>Suggested amount is the next installment's remaining balance — pay more to roll into later installments, or less to leave it partial.</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-xs font-medium mb-1.5 ${textSecondary}`}>
                          <span className="flex items-center gap-1"><IndianRupee size={12} /> Amount</span>
                        </label>
                        <input
                          type="number"
                          value={paymentForm.amount}
                          onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                          max={selectedInvoice.balance}
                          className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors ${
                            isDark
                              ? 'bg-dark-800 border border-dark-600 text-white focus:border-primary-500'
                              : 'bg-white border border-dark-200 text-dark-900 focus:border-primary-500'
                          }`}
                          placeholder="Enter amount"
                        />
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-1.5 ${textSecondary}`}>
                          <span className="flex items-center gap-1"><CreditCard size={12} /> Payment Mode</span>
                        </label>
                        <select
                          value={paymentForm.paymentMode}
                          onChange={(e) => setPaymentForm((f) => ({ ...f, paymentMode: e.target.value }))}
                          className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors ${
                            isDark
                              ? 'bg-dark-800 border border-dark-600 text-white focus:border-primary-500'
                              : 'bg-white border border-dark-200 text-dark-900 focus:border-primary-500'
                          }`}
                        >
                          <option value="UPI">UPI</option>
                          <option value="Card">Card</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Cash">Cash</option>
                        </select>
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-1.5 ${textSecondary}`}>
                          <span className="flex items-center gap-1"><Calendar size={12} /> Date</span>
                        </label>
                        <input
                          type="date"
                          value={paymentForm.date}
                          onChange={(e) => setPaymentForm((f) => ({ ...f, date: e.target.value }))}
                          className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors ${
                            isDark
                              ? 'bg-dark-800 border border-dark-600 text-white focus:border-primary-500'
                              : 'bg-white border border-dark-200 text-dark-900 focus:border-primary-500'
                          }`}
                        />
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-1.5 ${textSecondary}`}>
                          <span className="flex items-center gap-1"><Hash size={12} /> Reference Number</span>
                        </label>
                        <input
                          type="text"
                          value={paymentForm.reference}
                          onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))}
                          className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors ${
                            isDark
                              ? 'bg-dark-800 border border-dark-600 text-white focus:border-primary-500'
                              : 'bg-white border border-dark-200 text-dark-900 focus:border-primary-500'
                          }`}
                          placeholder="e.g. TXN123456"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className={`sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t ${
                isDark ? 'border-dark-700/60 bg-dark-900' : 'border-dark-200/60 bg-white'
              }`}>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={closeModal}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                    isDark
                      ? 'border-dark-600 text-dark-300 hover:bg-dark-800'
                      : 'border-dark-300 text-dark-600 hover:bg-dark-50'
                  }`}
                >
                  Close
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleDownloadInvoice(selectedInvoice)}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                    isDark ? 'border-dark-600 text-dark-300 hover:bg-dark-800' : 'border-dark-300 text-dark-600 hover:bg-dark-50'
                  }`}
                >
                  <Download size={16} />
                  Download PDF
                </motion.button>
                {selectedInvoice.status !== 'paid' && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleConfirmPayment}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 transition-shadow"
                  >
                    <CreditCard size={16} />
                    Confirm Payment
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 80 }}
            className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border ${
              toast.type === 'success' ? isDark ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : isDark ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Fee Bill Modal */}
      <AnimatePresence>
        {showCreateBill && (
          <motion.div variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateBill(false)}>
            <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
              onClick={e => e.stopPropagation()}
              className={`w-full max-w-lg rounded-2xl p-6 ${isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-xl'}`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-lg font-bold ${textPrimary}`}>Create Fee Bill</h2>
                <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={() => setShowCreateBill(false)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-dark-100 text-dark-500'}`}><X size={20} /></motion.button>
              </div>
              <form onSubmit={handleCreateBill} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Student</label>
                  <select required value={createForm.student} onChange={e => { const s = students.find(st => st.name === e.target.value); setCreateForm(p => ({ ...p, student: e.target.value, course: s?.course || '' })) }}
                    className={`w-full px-3 py-2.5 rounded-xl text-sm border ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-800'}`}>
                    <option value="">Select student</option>
                    {students.map(s => <option key={s.id} value={s.name}>{s.name} — {s.course}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Amount (₹)</label>
                    <input type="number" required value={createForm.amount} onChange={e => setCreateForm(p => ({ ...p, amount: e.target.value }))}
                      className={`w-full px-3 py-2.5 rounded-xl text-sm border ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-800'}`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Due Date</label>
                    <input type="date" required value={createForm.dueDate} onChange={e => setCreateForm(p => ({ ...p, dueDate: e.target.value }))}
                      className={`w-full px-3 py-2.5 rounded-xl text-sm border ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-800'}`} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreateBill(false)} className={`px-5 py-2.5 rounded-xl text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300' : 'border-dark-200 text-dark-600'}`}>Cancel</button>
                  <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-primary-500">Create Bill</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
