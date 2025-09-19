class EmailService {
    constructor(config = {}) {
        this.config = {
            apiUrl: config.apiUrl || 'http://localhost:3001/api/email',
            fromEmail: config.fromEmail || 'noreply@processexecution.com',
            fromName: config.fromName || 'Process Execution System',
            templates: config.templates || {},
            ...config
        };

        this.queue = [];
        this.isProcessing = false;
        this.retryAttempts = 3;
        this.retryDelay = 1000;
    }

    async sendPasswordResetEmail(email, resetToken, userName = '') {
        const resetUrl = `${window.location.origin}/reset-password?token=${resetToken}`;

        const template = this.config.templates.passwordReset || {
            subject: 'Reset Your Password',
            html: this.getPasswordResetTemplate(userName, resetUrl),
            text: this.getPasswordResetTextTemplate(userName, resetUrl)
        };

        return this.sendEmail({
            to: email,
            subject: template.subject,
            html: template.html,
            text: template.text,
            type: 'password_reset',
            metadata: {
                resetToken,
                userName
            }
        });
    }

    async sendEmailVerificationEmail(email, verificationToken, userName = '') {
        const verificationUrl = `${window.location.origin}/verify-email?token=${verificationToken}`;

        const template = this.config.templates.emailVerification || {
            subject: 'Verify Your Email Address',
            html: this.getEmailVerificationTemplate(userName, verificationUrl),
            text: this.getEmailVerificationTextTemplate(userName, verificationUrl)
        };

        return this.sendEmail({
            to: email,
            subject: template.subject,
            html: template.html,
            text: template.text,
            type: 'email_verification',
            metadata: {
                verificationToken,
                userName
            }
        });
    }

    async sendWelcomeEmail(email, userName) {
        const template = this.config.templates.welcome || {
            subject: 'Welcome to Process Execution System',
            html: this.getWelcomeTemplate(userName),
            text: this.getWelcomeTextTemplate(userName)
        };

        return this.sendEmail({
            to: email,
            subject: template.subject,
            html: template.html,
            text: template.text,
            type: 'welcome',
            metadata: {
                userName
            }
        });
    }

    async sendPasswordChangedNotification(email, userName) {
        const template = this.config.templates.passwordChanged || {
            subject: 'Password Changed Successfully',
            html: this.getPasswordChangedTemplate(userName),
            text: this.getPasswordChangedTextTemplate(userName)
        };

        return this.sendEmail({
            to: email,
            subject: template.subject,
            html: template.html,
            text: template.text,
            type: 'password_changed',
            metadata: {
                userName
            }
        });
    }

    async sendEmail(emailData) {
        const email = {
            id: this.generateEmailId(),
            from: {
                email: this.config.fromEmail,
                name: this.config.fromName
            },
            to: emailData.to,
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text,
            type: emailData.type || 'general',
            metadata: emailData.metadata || {},
            createdAt: new Date().toISOString(),
            attempts: 0,
            status: 'pending'
        };

        this.queue.push(email);

        if (!this.isProcessing) {
            this.processQueue();
        }

        return {
            success: true,
            emailId: email.id,
            message: 'Email queued for delivery'
        };
    }

    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.queue.length > 0) {
            const email = this.queue.shift();
            await this.sendSingleEmail(email);
        }

        this.isProcessing = false;
    }

    async sendSingleEmail(email) {
        try {
            email.attempts++;
            email.lastAttempt = new Date().toISOString();

            if (this.config.mockMode || !navigator.onLine) {
                console.log('Mock email sent:', {
                    to: email.to,
                    subject: email.subject,
                    type: email.type
                });
                email.status = 'sent';
                email.sentAt = new Date().toISOString();
                return;
            }

            const response = await fetch(this.config.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(email)
            });

            if (response.ok) {
                email.status = 'sent';
                email.sentAt = new Date().toISOString();
                console.log(`Email sent successfully to ${email.to}`);
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

        } catch (error) {
            console.error(`Failed to send email to ${email.to}:`, error);
            email.lastError = error.message;

            if (email.attempts < this.retryAttempts) {
                email.status = 'retry';
                setTimeout(() => {
                    this.queue.push(email);
                    if (!this.isProcessing) {
                        this.processQueue();
                    }
                }, this.retryDelay * email.attempts);
            } else {
                email.status = 'failed';
                email.failedAt = new Date().toISOString();
            }
        }
    }

    getPasswordResetTemplate(userName, resetUrl) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Reset Your Password</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .button { display: inline-block; background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { padding: 20px; font-size: 12px; color: #7f8c8d; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset Request</h1>
        </div>
        <div class="content">
            <p>Hello ${userName || 'User'},</p>
            <p>We received a request to reset your password for your Process Execution System account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>If you didn't request this password reset, you can safely ignore this email.</p>
            <p>This link will expire in 24 hours for security reasons.</p>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
        </div>
        <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>`;
    }

    getPasswordResetTextTemplate(userName, resetUrl) {
        return `Hello ${userName || 'User'},

We received a request to reset your password for your Process Execution System account.

Click the link below to reset your password:
${resetUrl}

If you didn't request this password reset, you can safely ignore this email.

This link will expire in 24 hours for security reasons.

This is an automated message, please do not reply to this email.`;
    }

    getEmailVerificationTemplate(userName, verificationUrl) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Verify Your Email</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #27ae60; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .button { display: inline-block; background-color: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { padding: 20px; font-size: 12px; color: #7f8c8d; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Verify Your Email Address</h1>
        </div>
        <div class="content">
            <p>Hello ${userName || 'User'},</p>
            <p>Thank you for registering with Process Execution System!</p>
            <p>Please verify your email address by clicking the button below:</p>
            <a href="${verificationUrl}" class="button">Verify Email</a>
            <p>This verification link will expire in 7 days.</p>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        </div>
        <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>`;
    }

    getEmailVerificationTextTemplate(userName, verificationUrl) {
        return `Hello ${userName || 'User'},

Thank you for registering with Process Execution System!

Please verify your email address by clicking the link below:
${verificationUrl}

This verification link will expire in 7 days.

This is an automated message, please do not reply to this email.`;
    }

    getWelcomeTemplate(userName) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to Process Execution System</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #3498db; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .feature { margin: 20px 0; padding: 15px; background-color: white; border-left: 4px solid #3498db; }
        .footer { padding: 20px; font-size: 12px; color: #7f8c8d; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to Process Execution System</h1>
        </div>
        <div class="content">
            <p>Hello ${userName || 'User'},</p>
            <p>Welcome to Process Execution System! Your account has been successfully created and verified.</p>

            <div class="feature">
                <h3>🔄 Process Templates</h3>
                <p>Create and manage process templates with state machines</p>
            </div>

            <div class="feature">
                <h3>📊 Project Execution</h3>
                <p>Execute processes and track project progress in real-time</p>
            </div>

            <div class="feature">
                <h3>👥 Team Collaboration</h3>
                <p>Collaborate with your team and manage organizations</p>
            </div>

            <p>Get started by logging into your account and creating your first process template!</p>
        </div>
        <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>`;
    }

    getWelcomeTextTemplate(userName) {
        return `Hello ${userName || 'User'},

Welcome to Process Execution System! Your account has been successfully created and verified.

Key Features:
- Process Templates: Create and manage process templates with state machines
- Project Execution: Execute processes and track project progress in real-time
- Team Collaboration: Collaborate with your team and manage organizations

Get started by logging into your account and creating your first process template!

This is an automated message, please do not reply to this email.`;
    }

    getPasswordChangedTemplate(userName) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Password Changed</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #e74c3c; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .footer { padding: 20px; font-size: 12px; color: #7f8c8d; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Changed</h1>
        </div>
        <div class="content">
            <p>Hello ${userName || 'User'},</p>
            <p>This is a confirmation that your password has been successfully changed.</p>
            <p>If you did not make this change, please contact support immediately.</p>
            <p>Change occurred at: ${new Date().toLocaleString()}</p>
        </div>
        <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>`;
    }

    getPasswordChangedTextTemplate(userName) {
        return `Hello ${userName || 'User'},

This is a confirmation that your password has been successfully changed.

If you did not make this change, please contact support immediately.

Change occurred at: ${new Date().toLocaleString()}

This is an automated message, please do not reply to this email.`;
    }

    generateEmailId() {
        return 'email_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getQueueStatus() {
        return {
            pending: this.queue.length,
            isProcessing: this.isProcessing
        };
    }

    clearQueue() {
        this.queue = [];
        this.isProcessing = false;
    }

    setConfig(config) {
        this.config = { ...this.config, ...config };
    }
}

export default EmailService;