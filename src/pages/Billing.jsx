import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  CreditCard,
  Download,
  Eye,
  X,
  ArrowUpDown,
  Search,
  FileText,
  Calendar,
  Hash,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { invoices } from '../data/mockData'

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

const modalVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.9, y: 20, transition: { duration: 0.2 } },
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

export default function Billing() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState('id')
  const [sortDirection, setSortDirection] = useState('desc')
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [modalMode, setModalMode] = useState(null) // 'view' | 'payment'
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMode: 'UPI',
    date: new Date().toISOString().split('T')[0],
    reference: '',
  })

  // Financial calculations
  const totalRevenue = useMemo(() => invoices.reduce((sum, inv) => sum + inv.paid, 0), [])
  const pendingFees = useMemo(() => invoices.reduce((sum, inv) => sum + inv.balance, 0), [])
  const paidCount = useMemo(() => invoices.filter((inv) => inv.status === 'paid').length, [])
  const overdueInvoices = useMemo(() => invoices.filter((inv) => inv.status === 'overdue'), [])
  const overdueTotal = useMemo(() => overdueInvoices.reduce((sum, inv) => sum + inv.balance, 0), [overdueInvoices])

  // Sorting and filtering
  const filteredInvoices = useMemo(() => {
    let result = [...invoices]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (inv) =>
          inv.id.toLowerCase().includes(q) ||
          inv.student.toLowerCase().includes(q) ||
          inv.course.toLowerCase().includes(q) ||
          inv.status.toLowerCase().includes(q)
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
  }, [searchQuery, sortField, sortDirection])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const openModal = (invoice, mode) => {
    setSelectedInvoice(invoice)
    setModalMode(mode)
    if (mode === 'payment') {
      setPaymentForm({
        amount: invoice.balance.toString(),
        paymentMode: invoice.paymentMode || 'UPI',
        date: new Date().toISOString().split('T')[0],
        reference: '',
      })
    }
  }

  const closeModal = () => {
    setSelectedInvoice(null)
    setModalMode(null)
  }

  // Mock payment history for modal
  const getPaymentHistory = (invoice) => {
    if (invoice.status === 'paid') {
      return [
        { date: invoice.date, amount: invoice.amount, mode: invoice.paymentMode, ref: 'TXN' + invoice.id.slice(-3) + '001' },
      ]
    }
    if (invoice.paid > 0) {
      return [
        { date: invoice.date, amount: Math.round(invoice.paid * 0.6), mode: invoice.paymentMode, ref: 'TXN' + invoice.id.slice(-3) + '001' },
        {
          date: new Date(new Date(invoice.date).getTime() + 15 * 86400000).toISOString().split('T')[0],
          amount: invoice.paid - Math.round(invoice.paid * 0.6),
          mode: invoice.paymentMode,
          ref: 'TXN' + invoice.id.slice(-3) + '002',
        },
      ]
    }
    return []
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
      title: 'Total Revenue',
      value: formatLakhs(totalRevenue),
      subtitle: `${formatINR(totalRevenue)} collected`,
      icon: IndianRupee,
      color: 'text-emerald-500',
      bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50',
    },
    {
      title: 'Pending Fees',
      value: formatLakhs(pendingFees),
      subtitle: `${formatINR(pendingFees)} outstanding`,
      icon: Clock,
      color: 'text-accent-500',
      bg: isDark ? 'bg-accent-500/10' : 'bg-amber-50',
    },
    {
      title: 'Paid Invoices',
      value: paidCount,
      subtitle: `of ${invoices.length} total invoices`,
      icon: CheckCircle2,
      color: 'text-sky-500',
      bg: isDark ? 'bg-sky-500/10' : 'bg-sky-50',
    },
    {
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
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-semibold shadow-lg shadow-primary-600/25 hover:shadow-primary-600/40 transition-shadow"
          >
            <Plus size={16} />
            Create Fee Bill
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
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
          <motion.div
            key={item.title}
            variants={itemVariants}
            whileHover={{ y: -2, scale: 1.01 }}
            className={`rounded-2xl p-5 transition-all duration-200 ${card} ${cardHover}`}
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
          </motion.div>
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
          </div>
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
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-center ${textMuted}`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice, i) => (
                <motion.tr
                  key={invoice.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{
                    backgroundColor: isDark
                      ? invoice.status === 'overdue' ? 'rgba(244,63,94,0.08)' : 'rgba(255,255,255,0.03)'
                      : invoice.status === 'overdue' ? 'rgba(244,63,94,0.04)' : 'rgba(0,0,0,0.02)',
                  }}
                  className={`border-b transition-colors ${
                    isDark ? 'border-dark-800' : 'border-dark-100'
                  } ${
                    invoice.status === 'overdue'
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
                  <td className="px-4 py-3.5">{getStatusBadge(invoice.status)}</td>
                  <td className={`px-4 py-3.5 text-sm ${textSecondary}`}>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium ${
                      isDark ? 'bg-dark-800 text-dark-300' : 'bg-dark-100 text-dark-600'
                    }`}>
                      {invoice.paymentMode}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-1">
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => openModal(invoice, 'view')}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isDark ? 'hover:bg-dark-700 text-dark-400 hover:text-sky-400' : 'hover:bg-dark-100 text-dark-400 hover:text-sky-600'
                        }`}
                        title="View Invoice"
                      >
                        <Eye size={15} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isDark ? 'hover:bg-dark-700 text-dark-400 hover:text-violet-400' : 'hover:bg-dark-100 text-dark-400 hover:text-violet-600'
                        }`}
                        title="Download Invoice"
                      >
                        <Download size={15} />
                      </motion.button>
                      {invoice.status !== 'paid' && (
                        <motion.button
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => openModal(invoice, 'payment')}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isDark ? 'hover:bg-dark-700 text-dark-400 hover:text-emerald-400' : 'hover:bg-dark-100 text-dark-400 hover:text-emerald-600'
                          }`}
                          title="Record Payment"
                        >
                          <CreditCard size={15} />
                        </motion.button>
                      )}
                    </div>
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
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={closeModal}
            />

            {/* Modal Content */}
            <motion.div
              variants={modalVariants}
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
                  <h2 className={`text-lg font-bold ${textPrimary}`}>
                    {modalMode === 'payment' ? 'Record Payment' : 'Invoice Details'}
                  </h2>
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
                    <p className={`mt-1 text-sm font-semibold ${textPrimary}`}>{selectedInvoice.dueDate}</p>
                  </div>
                  <div>
                    <p className={`text-xs font-medium uppercase tracking-wider ${textMuted}`}>Status</p>
                    <div className="mt-1">{getStatusBadge(selectedInvoice.status)}</div>
                  </div>
                </div>

                {/* Fee Breakdown */}
                <div>
                  <h3 className={`text-sm font-semibold mb-3 ${textPrimary}`}>Fee Breakdown</h3>
                  <div className={`rounded-xl overflow-hidden border ${
                    isDark ? 'border-dark-700/60' : 'border-dark-200/60'
                  }`}>
                    <div className={`flex items-center justify-between px-4 py-3 ${
                      isDark ? 'bg-dark-800/30' : 'bg-dark-50/50'
                    }`}>
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

                {/* Payment History */}
                <div>
                  <h3 className={`text-sm font-semibold mb-3 ${textPrimary}`}>Payment History</h3>
                  <div className="space-y-2">
                    {getPaymentHistory(selectedInvoice).map((payment, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl ${
                          isDark ? 'bg-dark-800/40 border border-dark-700/40' : 'bg-dark-50 border border-dark-200/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                            <CheckCircle2 size={14} className="text-emerald-500" />
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${textPrimary}`}>{formatINR(payment.amount)}</p>
                            <p className={`text-xs ${textMuted}`}>{payment.date} via {payment.mode}</p>
                          </div>
                        </div>
                        <span className={`text-xs font-mono ${textMuted}`}>{payment.ref}</span>
                      </motion.div>
                    ))}
                    {getPaymentHistory(selectedInvoice).length === 0 && (
                      <p className={`text-sm text-center py-4 ${textMuted}`}>No payments recorded yet.</p>
                    )}
                  </div>
                </div>

                {/* Record Payment Form */}
                {(modalMode === 'payment' && selectedInvoice.status !== 'paid') && (
                  <div>
                    <h3 className={`text-sm font-semibold mb-3 ${textPrimary}`}>Record New Payment</h3>
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
                  {modalMode === 'view' ? 'Close' : 'Cancel'}
                </motion.button>
                {modalMode === 'payment' && selectedInvoice.status !== 'paid' && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 transition-shadow"
                  >
                    <CreditCard size={16} />
                    Confirm Payment
                  </motion.button>
                )}
                {modalMode === 'view' && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-semibold shadow-lg shadow-primary-600/25 hover:shadow-primary-600/40 transition-shadow"
                  >
                    <Download size={16} />
                    Download PDF
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
