import { createContext, useContext, useState, useCallback } from 'react'
import { leads as initialLeads, followUps as initialFollowUps, students as initialStudents, packages as initialPackages, invoices as initialInvoices } from '../data/mockData'

const DataContext = createContext()

export function DataProvider({ children }) {
  const [leads, setLeads] = useState(initialLeads)
  const [followUps, setFollowUps] = useState(initialFollowUps)
  const [students, setStudents] = useState(initialStudents)
  const [packages, setPackages] = useState(initialPackages)
  const [invoices, setInvoices] = useState(initialInvoices)

  const addLead = useCallback((lead) => {
    setLeads((prev) => [lead, ...prev])
  }, [])

  const updateLead = useCallback((updatedLead) => {
    const avatar = updatedLead.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    setLeads((prev) => prev.map((l) => l.id === updatedLead.id ? { ...l, ...updatedLead, avatar } : l))
  }, [])

  const deleteLead = useCallback((leadId) => {
    setLeads((prev) => prev.filter((l) => l.id !== leadId))
  }, [])

  const updateLeadStatus = useCallback((leadId, newStatus) => {
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status: newStatus } : l))
  }, [])

  const addFollowUp = useCallback((followUp) => {
    setFollowUps((prev) => [followUp, ...prev])
  }, [])

  const updateFollowUp = useCallback((followUpId, updates) => {
    setFollowUps((prev) => prev.map((f) => f.id === followUpId ? { ...f, ...updates } : f))
  }, [])

  const addPackage = useCallback((pkg) => {
    setPackages((prev) => [...prev, pkg])
  }, [])

  const enrollLead = useCallback((lead, pkg) => {
    setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, status: 'enrolled' } : l))
    setStudents((prev) => {
      if (prev.find(s => s.email === lead.email)) return prev
      const newStudent = {
        id: Date.now(),
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        course: lead.course,
        batch: `Batch ${new Date().getFullYear()}-${String.fromCharCode(65 + Math.floor(Math.random() * 4))}`,
        enrollDate: new Date().toISOString().slice(0, 10),
        status: 'active',
        feePaid: 0,
        feeTotal: pkg?.price || 0,
        avatar: lead.avatar,
        attendance: 0,
      }
      return [newStudent, ...prev]
    })
    setInvoices((prev) => {
      if (prev.find(inv => inv.student === lead.name && inv.course === lead.course)) return prev
      const invoiceId = `INV-${new Date().getFullYear()}-${String(prev.length + 1).padStart(3, '0')}`
      return [{
        id: invoiceId,
        student: lead.name,
        course: lead.course,
        amount: pkg?.price || 0,
        paid: 0,
        balance: pkg?.price || 0,
        date: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        status: 'partial',
        paymentMode: 'UPI',
      }, ...prev]
    })
  }, [])

  return (
    <DataContext.Provider value={{
      leads, setLeads, addLead, updateLead, deleteLead, updateLeadStatus,
      followUps, setFollowUps, addFollowUp, updateFollowUp,
      students, setStudents, enrollLead,
      packages, setPackages, addPackage,
      invoices, setInvoices,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
