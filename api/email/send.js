import nodemailer from 'nodemailer'
import { getAdminClient, getIntegrationConfig, logAudit, requireAuth } from '../webhooks/_lib.js'

// Sends a real email via Gmail SMTP (Google Workspace App Password) instead
// of the mailto: link this replaced, which only opened the user's own local
// mail client and left no record anywhere in the CRM. Every send — success
// or failure — is logged to email_messages so it shows up in the lead/
// student's Email History, the same way WhatsApp messages are tracked.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  let admin
  try {
    admin = getAdminClient()
  } catch (err) {
    res.status(500).json({ error: err.message })
    return
  }

  const auth = await requireAuth(req, admin)
  if (auth.error) {
    res.status(auth.status).json({ error: auth.error })
    return
  }

  const { to, subject, body, leadId, studentId } = req.body || {}
  if (!to || !subject || !body || !body.trim()) {
    res.status(400).json({ error: 'to, subject and body are required' })
    return
  }

  const { data: integration, error: configError } = await getIntegrationConfig(admin, 'email')
  if (configError) {
    res.status(500).json({ error: configError })
    return
  }
  if (!integration.page_id || !integration.page_access_token) {
    res.status(500).json({ error: 'Email integration is not configured yet (missing From Email Address or App Password)' })
    return
  }

  const { data: { user } } = await admin.auth.getUser((req.headers.authorization || '').replace('Bearer ', ''))
  const { data: senderProfile } = await admin.from('profiles').select('name').eq('id', user.id).single()
  const senderName = senderProfile?.name || user.email

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: integration.page_id, pass: integration.page_access_token },
  })

  try {
    await transporter.sendMail({
      from: `"${senderName}" <${integration.page_id}>`,
      to,
      subject,
      text: body,
    })
  } catch (err) {
    await admin.from('email_messages').insert({
      lead_id: leadId ?? null,
      student_id: studentId ?? null,
      to_email: to,
      from_email: integration.page_id,
      subject,
      body,
      sender_id: user.id,
      sender_name: senderName,
      status: 'failed',
      error: err.message,
    })
    await logAudit(admin, 'email', 'Outbound email failed', `To ${to}: ${err.message}`, 'failed')
    res.status(502).json({ error: err.message })
    return
  }

  const { data: logged, error: logError } = await admin.from('email_messages').insert({
    lead_id: leadId ?? null,
    student_id: studentId ?? null,
    to_email: to,
    from_email: integration.page_id,
    subject,
    body,
    sender_id: user.id,
    sender_name: senderName,
    status: 'sent',
  }).select().single()
  if (logError) console.error('email_messages insert error', logError)

  await logAudit(admin, 'email', 'Outbound email sent', `To ${to} by ${senderName}`, 'success')

  res.status(200).json({ success: true, message: logged || null })
}
