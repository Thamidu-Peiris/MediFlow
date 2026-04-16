const twilio = require("twilio");
const nodemailer = require("nodemailer");

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || "";

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || "";
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL || "no-reply@example.com";
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || "MediFlow Notifications";

/** If set (e.g. 94), national numbers starting with 0 become +{CC}{rest} (e.g. 077… → +9477…). */
const SMS_DEFAULT_COUNTRY_CODE = (process.env.SMS_DEFAULT_COUNTRY_CODE || "").replace(/\D/g, "");

const TASK_LABELS = ["patient_email", "patient_sms", "doctor_email", "doctor_sms"];

let twilioClient = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

let mailTransporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASSWORD) {
    mailTransporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number.isFinite(SMTP_PORT) ? SMTP_PORT : 587,
        secure: false,
        requireTLS: true,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASSWORD,
        },
    });
}

function buildDispatchSummary() {
    const emailMode = mailTransporter ? "live" : "mock";
    const smsMode = twilioClient ? "live" : "mock";
    const hints = [];
    if (emailMode === "mock") {
        hints.push("Email: SMTP not active — set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD on the notification service.");
    }
    if (smsMode === "mock") {
        hints.push("SMS: Twilio not active — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.");
    }
    return { email: { mode: emailMode }, sms: { mode: smsMode }, hints };
}

function buildMessage(type, payload = {}) {
    if (type === "APPOINTMENT_BOOKED") {
        return {
            subject: "Appointment Confirmed - MediFlow",
            text: `Your appointment is confirmed for ${payload.date || "N/A"} at ${payload.time || "N/A"}.`,
        };
    }
    if (type === "CONSULTATION_COMPLETED") {
        return {
            subject: "Consultation Completed - MediFlow",
            text: `Your consultation on ${payload.date || "N/A"} has been completed. Thank you for using MediFlow.`,
        };
    }
    return {
        subject: `MediFlow Update: ${type}`,
        text: payload?.message || JSON.stringify(payload || {}),
    };
}

function normalizePhone(raw = "") {
    let s = String(raw).trim();
    if (!s) return "";
    s = s.replace(/[\s().-]/g, "");
    if (s.startsWith("00")) {
        s = `+${s.slice(2)}`;
    }
    if (!s.startsWith("+")) {
        const digits = s.replace(/\D/g, "");
        if (!digits) return "";
        if (digits[0] === "0" && SMS_DEFAULT_COUNTRY_CODE && digits.length >= 10 && digits.length <= 15) {
            s = `+${SMS_DEFAULT_COUNTRY_CODE}${digits.slice(1)}`;
        } else if (/^\d{8,15}$/.test(digits) && digits[0] !== "0") {
            s = `+${digits}`;
        } else {
            return "";
        }
    }
    const cleaned = s.replace(/[^\d+]/g, "");
    if (!cleaned.startsWith("+")) return "";
    const body = cleaned.slice(1);
    if (!/^\d{8,15}$/.test(body)) return "";
    return `+${body}`;
}

function twilioErrorHint(code) {
    if (code === 21608 || code === "21608") {
        return "Twilio trial accounts may only SMS verified destination numbers. Add numbers in Twilio Console under Phone Numbers / Verified Caller IDs, upgrade the account, or use a non-trial sender.";
    }
    return null;
}

exports.sendNotification = async (req, res) => {
    try {
        const { type, patientPhone, doctorPhone, patientEmail, doctorEmail, payload } = req.body;

        if (!type) {
            return res.status(400).json({ message: "Notification type is required" });
        }

        const tasks = [];
        const { subject, text: message } = buildMessage(type, payload);
        const dispatch = buildDispatchSummary();

        const sendEmail = async (to, subj, text) => {
            if (!to) return;
            if (mailTransporter) {
                await mailTransporter.sendMail({
                    from: `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`,
                    to,
                    subject: subj,
                    text,
                });
                console.log(`[Notification Service] Email sent to: ${to}`);
            } else {
                console.log(
                    `[Notification Service - MOCK MODE] Email (SMTP) intended for ${to} | Subject: ${subj} | Content: ${text}`
                );
            }
        };

        const sendSms = async (to, body) => {
            if (!to) return;
            const normalizedTo = normalizePhone(to);
            if (!normalizedTo) {
                console.warn(`[Notification Service] Invalid phone format for SMS: ${to}`);
                return;
            }
            if (twilioClient && TWILIO_PHONE_NUMBER) {
                await twilioClient.messages.create({
                    body,
                    from: TWILIO_PHONE_NUMBER,
                    to: normalizedTo,
                });
                console.log(`[Notification Service] SMS sent to: ${normalizedTo}`);
            } else {
                console.log(`[Notification Service - MOCK MODE] SMS intended for ${normalizedTo} | Content: ${body}`);
            }
        };

        tasks.push(sendEmail(patientEmail, subject, `Hi ${payload?.patientName || "Patient"},\n\n${message}`));
        tasks.push(sendSms(patientPhone, message));

        tasks.push(sendEmail(doctorEmail, subject, `Hi ${payload?.doctorName || "Doctor"},\n\n${message}`));
        tasks.push(sendSms(doctorPhone, message));

        const results = await Promise.allSettled(tasks);
        const rejected = results
            .map((r, i) => ({ r, i }))
            .filter(({ r }) => r.status === "rejected");

        const body = { dispatch };

        if (rejected.length) {
            body.message = "Notifications partially dispatched";
            body.failedTasks = rejected.length;
            body.failures = rejected.map(({ r, i }) => {
                const err = r.reason || {};
                const code = err.code ?? err.status;
                const hint = twilioErrorHint(code);
                return {
                    task: TASK_LABELS[i] || `task_${i}`,
                    message: err.message || String(err),
                    code: code != null ? String(code) : undefined,
                    hint: hint || undefined,
                };
            });
            rejected.forEach(({ r, i }) => {
                const err = r.reason || {};
                console.error(`[Notification Service] Task ${i} failed:`, {
                    message: err.message || String(err),
                    code: err.code,
                    status: err.status,
                    moreInfo: err.moreInfo,
                });
            });
            return res.status(207).json(body);
        }

        body.message = "Notifications dispatched successfully";
        return res.status(200).json(body);
    } catch (error) {
        console.error("Error sending notification:", error);
        return res.status(500).json({ message: "Failed to dispatch notifications" });
    }
};
