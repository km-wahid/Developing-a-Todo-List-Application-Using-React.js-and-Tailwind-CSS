import nodemailer from 'nodemailer'
import { config } from './config.js'
export async function sendLink(email: string, kind: 'verify' | 'reset', token: string) {
  const url = `${config.APP_ORIGIN}/?${kind}=${encodeURIComponent(token)}`
  if (!config.SMTP_HOST && !config.production) return url
  const transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE === 'true',
    auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD } : undefined,
    connectionTimeout: 10000,
  })
  await transport.sendMail({
    from: config.MAIL_FROM,
    to: email,
    subject: kind === 'verify' ? 'Verify your Bloom account' : 'Reset your Bloom password',
    text: `${kind === 'verify' ? 'Verify your email to start planning' : 'Choose a new password'}: ${url}\n\nThis link expires in ${kind === 'verify' ? '24 hours' : '30 minutes'}. If you did not request it, ignore this email.`,
  })
  return undefined
}
