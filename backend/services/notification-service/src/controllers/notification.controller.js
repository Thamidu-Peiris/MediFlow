const twilio = require("twilio");
const nodemailer = require("nodemailer");

// Configuration from environment variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "dummy_sid";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "dummy_token";
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || "+1234567890";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.ethereal.email";
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER || "dummy_user";
const SMTP_PASS = process.env.SMTP_PASS || "dummy_pass";

// Initialize services conditionally (mock if not fully configured)
let twilioClient;
let transporter;

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
    });
}

exports.sendNotification = async (req, res) => {
    try {
        const { type, patientPhone, doctorPhone, patientEmail, doctorEmail, payload } = req.body;

        if (!type) {
            return res.status(400).json({ message: "Notification type is required" });
        }

        const tasks = [];

        let subject = "MediFlow Notification";
        let message = "You have a new update.";

        if (type === "APPOINTMENT_BOOKED") {
            subject = "Appointment Confirmed - MediFlow";
            message = `Your appointment for ${payload.date} at ${payload.time} has been successfully scheduled.`;
        } else if (type === "CONSULTATION_COMPLETED") {
            subject = "Consultation Completed - MediFlow";
            message = `Your consultation on ${payload.date} is now completed. Thank you for using MediFlow.`;
        } else {
            subject = `MediFlow Update: ${type}`;
            message = JSON.stringify(payload);
        }

        const sendEmail = async (to, subj, text) => {
            if (!to) return;
            if (transporter) {
                await transporter.sendMail({
                    from: `"MediFlow Notifications" <${SMTP_USER}>`,
                    to,
                    subject: subj,
                    text,
                });
                console.log(`[Notification Service] Email sent to: ${to}`);
            } else {
                console.log(`[Notification Service - MOCK MODE] Email intended for ${to} | Subject: ${subj} | Content: ${text}`);
            }
        };

        const sendSms = async (to, body) => {
            if (!to) return;
            if (twilioClient) {
                await twilioClient.messages.create({
                    body,
                    from: TWILIO_PHONE_NUMBER,
                    to,
                });
                console.log(`[Notification Service] SMS sent to: ${to}`);
            } else {
                console.log(`[Notification Service - MOCK MODE] SMS intended for ${to} | Content: ${body}`);
            }
        };

        // Send to Patient
        tasks.push(sendEmail(patientEmail, subject, `Hi Patient,\n\n${message}`));
        tasks.push(sendSms(patientPhone, message));

        // Send to Doctor
        tasks.push(sendEmail(doctorEmail, subject, `Hi Doctor,\n\n${message}`));
        tasks.push(sendSms(doctorPhone, message));

        await Promise.allSettled(tasks);

        return res.status(200).json({ message: "Notifications dispatched successfully" });
    } catch (error) {
        console.error("Error sending notification:", error);
        return res.status(500).json({ message: "Failed to dispatch notifications" });
    }
};
