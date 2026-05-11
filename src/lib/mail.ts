import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_SERVER || 'smtp.gmail.com',
    port: Number(process.env.MAIL_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
    },
});

export const sendEmailAsync = async (
    subject: string,
    to: string,
    htmlBody: string
) => {
    try {
        const fromName = process.env.MAIL_FROM_NAME || 'SPARK';
        const fromEmail = process.env.MAIL_FROM;

        const info = await transporter.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to,
            subject,
            html: htmlBody,
        });

        console.log(`Message sent: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`Error sending email to ${to}:`, error);
        return false;
    }
};
