export const leads = [
  { id: 1, name: 'Arjun Mehta', email: 'arjun.mehta@email.com', phone: '+91 98765 43210', course: 'Full Stack Development', source: 'Website', status: 'new', date: '2026-06-25', notes: 'Interested in weekend batches', avatar: 'AM', priority: 'high' },
  { id: 2, name: 'Priya Sharma', email: 'priya.sharma@email.com', phone: '+91 87654 32109', course: 'Data Science & AI', source: 'Instagram', status: 'contacted', date: '2026-06-24', notes: 'Working professional, prefers evening classes', avatar: 'PS', priority: 'high' },
  { id: 3, name: 'Rahul Kumar', email: 'rahul.k@email.com', phone: '+91 76543 21098', course: 'UI/UX Design', source: 'Referral', status: 'qualified', date: '2026-06-23', notes: 'Background in graphic design', avatar: 'RK', priority: 'medium' },
  { id: 4, name: 'Sneha Patel', email: 'sneha.patel@email.com', phone: '+91 65432 10987', course: 'Digital Marketing', source: 'Google Ads', status: 'negotiation', date: '2026-06-22', notes: 'Comparing with other institutes', avatar: 'SP', priority: 'high' },
  { id: 5, name: 'Vikram Singh', email: 'vikram.s@email.com', phone: '+91 54321 09876', course: 'Cloud Computing', source: 'LinkedIn', status: 'new', date: '2026-06-25', notes: 'IT professional looking to upskill', avatar: 'VS', priority: 'medium' },
  { id: 6, name: 'Ananya Reddy', email: 'ananya.r@email.com', phone: '+91 43210 98765', course: 'Python Programming', source: 'Walk-in', status: 'contacted', date: '2026-06-24', notes: 'College student, interested in internship', avatar: 'AR', priority: 'low' },
  { id: 7, name: 'Deepak Joshi', email: 'deepak.j@email.com', phone: '+91 32109 87654', course: 'Cybersecurity', source: 'Facebook', status: 'qualified', date: '2026-06-21', notes: 'Wants certification-focused course', avatar: 'DJ', priority: 'medium' },
  { id: 8, name: 'Kavitha Nair', email: 'kavitha.n@email.com', phone: '+91 21098 76543', course: 'Mobile App Development', source: 'Website', status: 'new', date: '2026-06-26', notes: 'Entrepreneur wanting to build own app', avatar: 'KN', priority: 'high' },
  { id: 9, name: 'Manish Gupta', email: 'manish.g@email.com', phone: '+91 10987 65432', course: 'DevOps Engineering', source: 'Referral', status: 'enrolled', date: '2026-06-20', notes: 'Referred by Arjun Mehta', avatar: 'MG', priority: 'medium' },
  { id: 10, name: 'Fatima Khan', email: 'fatima.k@email.com', phone: '+91 09876 54321', course: 'Data Science & AI', source: 'Google Ads', status: 'lost', date: '2026-06-18', notes: 'Chose a competitor institute', avatar: 'FK', priority: 'low' },
]

export const students = [
  { id: 1, name: 'Manish Gupta', email: 'manish.g@email.com', phone: '+91 10987 65432', course: 'DevOps Engineering', batch: 'Batch 2026-A', enrollDate: '2026-06-20', status: 'active', feePaid: 45000, feeTotal: 60000, avatar: 'MG', attendance: 92 },
  { id: 2, name: 'Ritu Verma', email: 'ritu.v@email.com', phone: '+91 98761 23456', course: 'Full Stack Development', batch: 'Batch 2026-B', enrollDate: '2026-05-15', status: 'active', feePaid: 55000, feeTotal: 75000, avatar: 'RV', attendance: 88 },
  { id: 3, name: 'Amit Saxena', email: 'amit.s@email.com', phone: '+91 87650 12345', course: 'Data Science & AI', batch: 'Batch 2026-A', enrollDate: '2026-04-10', status: 'active', feePaid: 80000, feeTotal: 80000, avatar: 'AS', attendance: 95 },
  { id: 4, name: 'Pooja Iyer', email: 'pooja.i@email.com', phone: '+91 76540 01234', course: 'UI/UX Design', batch: 'Batch 2026-C', enrollDate: '2026-06-01', status: 'active', feePaid: 30000, feeTotal: 50000, avatar: 'PI', attendance: 78 },
  { id: 5, name: 'Karan Malhotra', email: 'karan.m@email.com', phone: '+91 65430 90123', course: 'Cloud Computing', batch: 'Batch 2026-A', enrollDate: '2026-03-20', status: 'completed', feePaid: 65000, feeTotal: 65000, avatar: 'KM', attendance: 97 },
  { id: 6, name: 'Divya Rao', email: 'divya.r@email.com', phone: '+91 54320 89012', course: 'Digital Marketing', batch: 'Batch 2026-B', enrollDate: '2026-05-01', status: 'active', feePaid: 20000, feeTotal: 40000, avatar: 'DR', attendance: 82 },
]

export const packages = [
  { id: 1, name: 'Full Stack Development', duration: '6 Months', price: 75000, description: 'Master HTML, CSS, JavaScript, React, Node.js, MongoDB and build production-ready applications.', modules: 24, students: 45, rating: 4.8, status: 'active', category: 'Development', features: ['Live Projects', 'Placement Assistance', 'Industry Mentors', 'Certificate'] },
  { id: 2, name: 'Data Science & AI', duration: '8 Months', price: 80000, description: 'Learn Python, Machine Learning, Deep Learning, NLP, and work with real-world datasets.', modules: 32, students: 38, rating: 4.9, status: 'active', category: 'Data & AI', features: ['Capstone Project', 'Research Papers', 'Tool Kits Included', 'Certificate'] },
  { id: 3, name: 'UI/UX Design', duration: '4 Months', price: 50000, description: 'Master Figma, Adobe XD, user research, wireframing, prototyping, and design systems.', modules: 16, students: 28, rating: 4.7, status: 'active', category: 'Design', features: ['Portfolio Building', 'Design Tools License', 'Mentorship', 'Certificate'] },
  { id: 4, name: 'Digital Marketing', duration: '3 Months', price: 40000, description: 'SEO, SEM, Social Media Marketing, Content Marketing, Google Analytics, and ad campaign management.', modules: 12, students: 52, rating: 4.6, status: 'active', category: 'Marketing', features: ['Live Campaigns', 'Google Certification', 'Tools Access', 'Certificate'] },
  { id: 5, name: 'Cloud Computing', duration: '5 Months', price: 65000, description: 'AWS, Azure, GCP, Docker, Kubernetes, and cloud architecture best practices.', modules: 20, students: 22, rating: 4.8, status: 'active', category: 'Infrastructure', features: ['Cloud Credits', 'AWS Certification Prep', 'Lab Access', 'Certificate'] },
  { id: 6, name: 'Cybersecurity', duration: '6 Months', price: 70000, description: 'Ethical hacking, penetration testing, network security, SIEM tools, and incident response.', modules: 24, students: 18, rating: 4.7, status: 'active', category: 'Security', features: ['Lab Environment', 'CEH Prep', 'Tools Included', 'Certificate'] },
  { id: 7, name: 'Mobile App Development', duration: '5 Months', price: 60000, description: 'React Native, Flutter, iOS & Android development with app store deployment.', modules: 20, students: 30, rating: 4.6, status: 'active', category: 'Development', features: ['App Publishing', 'Device Testing', 'Mentorship', 'Certificate'] },
  { id: 8, name: 'DevOps Engineering', duration: '5 Months', price: 60000, description: 'CI/CD, Jenkins, Docker, Kubernetes, Terraform, monitoring, and SRE practices.', modules: 20, students: 15, rating: 4.9, status: 'active', category: 'Infrastructure', features: ['Cloud Lab', 'Automation Projects', 'Industry Tools', 'Certificate'] },
  { id: 9, name: 'Python Programming', duration: '2 Months', price: 25000, description: 'Python fundamentals to advanced topics including OOP, APIs, automation, and scripting.', modules: 8, students: 60, rating: 4.5, status: 'active', category: 'Development', features: ['Hands-on Projects', 'Code Reviews', 'Community Access', 'Certificate'] },
]

export const invoices = [
  { id: 'INV-2026-001', student: 'Manish Gupta', course: 'DevOps Engineering', amount: 60000, paid: 45000, balance: 15000, date: '2026-06-20', dueDate: '2026-07-20', status: 'partial', paymentMode: 'UPI' },
  { id: 'INV-2026-002', student: 'Ritu Verma', course: 'Full Stack Development', amount: 75000, paid: 55000, balance: 20000, date: '2026-05-15', dueDate: '2026-06-30', status: 'partial', paymentMode: 'Bank Transfer' },
  { id: 'INV-2026-003', student: 'Amit Saxena', course: 'Data Science & AI', amount: 80000, paid: 80000, balance: 0, date: '2026-04-10', dueDate: '2026-05-10', status: 'paid', paymentMode: 'Card' },
  { id: 'INV-2026-004', student: 'Pooja Iyer', course: 'UI/UX Design', amount: 50000, paid: 30000, balance: 20000, date: '2026-06-01', dueDate: '2026-07-01', status: 'partial', paymentMode: 'UPI' },
  { id: 'INV-2026-005', student: 'Karan Malhotra', course: 'Cloud Computing', amount: 65000, paid: 65000, balance: 0, date: '2026-03-20', dueDate: '2026-04-20', status: 'paid', paymentMode: 'Bank Transfer' },
  { id: 'INV-2026-006', student: 'Divya Rao', course: 'Digital Marketing', amount: 40000, paid: 20000, balance: 20000, date: '2026-05-01', dueDate: '2026-06-28', status: 'overdue', paymentMode: 'Cash' },
]

export const followUps = [
  { id: 1, lead: 'Arjun Mehta', type: 'call', date: '2026-06-27', time: '10:00 AM', notes: 'Discuss weekend batch timings and fee structure', status: 'pending', priority: 'high' },
  { id: 2, lead: 'Priya Sharma', type: 'email', date: '2026-06-26', time: '02:00 PM', notes: 'Send course brochure and schedule demo class', status: 'completed', priority: 'high' },
  { id: 3, lead: 'Sneha Patel', type: 'meeting', date: '2026-06-28', time: '11:30 AM', notes: 'In-person meeting to discuss scholarship options', status: 'pending', priority: 'high' },
  { id: 4, lead: 'Vikram Singh', type: 'whatsapp', date: '2026-06-26', time: '04:00 PM', notes: 'Share cloud computing course details and industry placement data', status: 'pending', priority: 'medium' },
  { id: 5, lead: 'Ananya Reddy', type: 'call', date: '2026-06-29', time: '09:30 AM', notes: 'Follow up on Python course interest, discuss internship program', status: 'pending', priority: 'low' },
  { id: 6, lead: 'Kavitha Nair', type: 'meeting', date: '2026-06-27', time: '03:00 PM', notes: 'Campus visit and course counseling session', status: 'pending', priority: 'high' },
  { id: 7, lead: 'Deepak Joshi', type: 'email', date: '2026-06-25', time: '10:00 AM', notes: 'Sent certification details and exam preparation timeline', status: 'completed', priority: 'medium' },
  { id: 8, lead: 'Rahul Kumar', type: 'call', date: '2026-06-30', time: '11:00 AM', notes: 'Discuss UI/UX portfolio requirements and job placement', status: 'pending', priority: 'medium' },
]

export const recentActivities = [
  { id: 1, type: 'lead', message: 'New lead Kavitha Nair registered from Website', time: '2 hours ago', icon: 'user-plus' },
  { id: 2, type: 'payment', message: 'Pooja Iyer paid Rs. 15,000 (Installment 2)', time: '3 hours ago', icon: 'credit-card' },
  { id: 3, type: 'enrollment', message: 'Manish Gupta enrolled in DevOps Engineering', time: '5 hours ago', icon: 'graduation-cap' },
  { id: 4, type: 'followup', message: 'Follow-up completed with Priya Sharma', time: '6 hours ago', icon: 'phone' },
  { id: 5, type: 'course', message: 'New batch started for Full Stack Development', time: '1 day ago', icon: 'book-open' },
  { id: 6, type: 'payment', message: 'Amit Saxena cleared full fee for Data Science', time: '1 day ago', icon: 'credit-card' },
  { id: 7, type: 'lead', message: 'Vikram Singh inquiry from LinkedIn campaign', time: '2 days ago', icon: 'user-plus' },
  { id: 8, type: 'enrollment', message: 'Ritu Verma enrolled in Full Stack Development', time: '2 days ago', icon: 'graduation-cap' },
]

export const dashboardStats = {
  totalLeads: 156,
  activeStudents: 248,
  totalRevenue: 1847500,
  conversionRate: 34.2,
  pendingFollowUps: 12,
  coursesActive: 9,
  monthlyGrowth: 12.5,
  pendingFees: 425000,
}

export const monthlyRevenueData = [
  { month: 'Jan', revenue: 245000, students: 18 },
  { month: 'Feb', revenue: 312000, students: 24 },
  { month: 'Mar', revenue: 278000, students: 20 },
  { month: 'Apr', revenue: 390000, students: 32 },
  { month: 'May', revenue: 425000, students: 28 },
  { month: 'Jun', revenue: 197500, students: 15 },
]

export const leadSourceData = [
  { name: 'Website', value: 35, color: '#6366f1' },
  { name: 'Google Ads', value: 25, color: '#f59e0b' },
  { name: 'Referral', value: 20, color: '#10b981' },
  { name: 'Social Media', value: 12, color: '#f43f5e' },
  { name: 'Walk-in', value: 8, color: '#0ea5e9' },
]

export const enrollmentPipeline = {
  inquiry: leads.filter(l => l.status === 'new'),
  contacted: leads.filter(l => l.status === 'contacted'),
  qualified: leads.filter(l => l.status === 'qualified'),
  negotiation: leads.filter(l => l.status === 'negotiation'),
  enrolled: leads.filter(l => l.status === 'enrolled'),
}

export const communications = [
  { id: 1, from: 'System', to: 'Arjun Mehta', type: 'sms', subject: 'Welcome to BIX Academy', message: 'Thank you for your interest in our courses. We will get back to you shortly.', date: '2026-06-25', status: 'sent' },
  { id: 2, from: 'Admin', to: 'Priya Sharma', type: 'email', subject: 'Course Brochure - Data Science & AI', message: 'Please find attached the detailed brochure for our Data Science & AI program.', date: '2026-06-24', status: 'sent' },
  { id: 3, from: 'System', to: 'All Students', type: 'notification', subject: 'Holiday Notice - July 4th', message: 'The academy will remain closed on July 4th. Classes will resume on July 5th.', date: '2026-06-26', status: 'scheduled' },
  { id: 4, from: 'Admin', to: 'Divya Rao', type: 'email', subject: 'Fee Reminder', message: 'This is a gentle reminder that your fee installment of Rs. 20,000 is due on June 28th.', date: '2026-06-25', status: 'sent' },
]

export const integrationLogs = [
  { id: 1, timestamp: '2026-06-27 10:30:15', integration: 'Meta Ads', action: 'Lead Imported', details: 'New lead "Rohit Verma" imported from campaign "Summer Enrollment 2026"', status: 'success' },
  { id: 2, timestamp: '2026-06-27 10:28:42', integration: 'Google Ads', action: 'Webhook Received', details: 'Form submission received from "BIX Academy - Data Science" campaign', status: 'success' },
  { id: 3, timestamp: '2026-06-27 09:15:00', integration: 'Google Ads', action: 'Sync Completed', details: 'Synced 3 new leads from Google Ads campaigns', status: 'success' },
  { id: 4, timestamp: '2026-06-27 08:45:33', integration: 'Meta Ads', action: 'Lead Imported', details: 'New lead "Meera Shah" imported from Instagram Lead Ad', status: 'success' },
  { id: 5, timestamp: '2026-06-26 18:20:10', integration: 'JustDial', action: 'Sync Error', details: 'API rate limit exceeded. Retry scheduled in 15 minutes.', status: 'failed' },
  { id: 6, timestamp: '2026-06-26 16:00:00', integration: 'Meta Ads', action: 'Sync Completed', details: 'Synced 5 new leads from Meta Ads campaigns', status: 'success' },
  { id: 7, timestamp: '2026-06-26 14:30:22', integration: 'JustDial', action: 'Webhook Received', details: 'New inquiry received for "Python Programming" course', status: 'success' },
  { id: 8, timestamp: '2026-06-26 12:10:45', integration: 'Google Ads', action: 'Field Mapping Updated', details: 'Campaign field mapped to Source', status: 'warning' },
  { id: 9, timestamp: '2026-06-26 10:00:00', integration: 'Meta Ads', action: 'Connection Refreshed', details: 'Access token refreshed successfully', status: 'success' },
  { id: 10, timestamp: '2026-06-25 22:00:00', integration: 'Google Ads', action: 'Sync Error', details: 'Invalid API key. Please update credentials.', status: 'failed' },
  { id: 11, timestamp: '2026-06-25 18:30:00', integration: 'JustDial', action: 'Lead Imported', details: 'New lead "Sanjay Mishra" imported from JustDial listing', status: 'success' },
  { id: 12, timestamp: '2026-06-25 15:45:12', integration: 'Meta Ads', action: 'Duplicate Detected', details: 'Lead "Priya Sharma" already exists. Skipped import.', status: 'warning' },
]

export const apiKeys = [
  { id: 1, name: 'Production API Key', key: 'bix_prod_ak_7x9m2kLp4QrS...', created: '2026-05-01', lastUsed: '2026-06-27', status: 'active', requests: 1247 },
  { id: 2, name: 'Development API Key', key: 'bix_dev_ak_3nT8wFg2YhKm...', created: '2026-06-10', lastUsed: '2026-06-25', status: 'active', requests: 89 },
  { id: 3, name: 'Webhook Signing Key', key: 'bix_whk_sk_9pR4mNx7BqLz...', created: '2026-04-15', lastUsed: '2026-06-27', status: 'active', requests: 562 },
  { id: 4, name: 'Test API Key', key: 'bix_test_ak_1aB2cD3eF4gH...', created: '2026-06-20', lastUsed: '2026-06-22', status: 'revoked', requests: 15 },
]

export const webhooksList = [
  { id: 1, integration: 'Meta Ads', url: 'https://api.bixacademy.com/webhooks/meta-ads/a1b2c3', events: ['New Lead', 'Form Submission'], status: 'active', lastTriggered: '2026-06-27 10:30 AM' },
  { id: 2, integration: 'JustDial', url: 'https://api.bixacademy.com/webhooks/justdial/d4e5f6', events: ['New Inquiry', 'Lead Updated'], status: 'active', lastTriggered: '2026-06-26 02:30 PM' },
  { id: 3, integration: 'Google Ads', url: 'https://api.bixacademy.com/webhooks/google-ads/g7h8i9', events: ['New Lead', 'Form Submission', 'Campaign Update'], status: 'active', lastTriggered: '2026-06-27 09:15 AM' },
  { id: 4, integration: 'Custom', url: 'https://api.bixacademy.com/webhooks/custom/j0k1l2', events: ['Lead Status Change'], status: 'inactive', lastTriggered: '2026-06-20 04:00 PM' },
]
