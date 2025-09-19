import AuthenticationService from '../services/AuthenticationService.js';
import EmailService from '../services/EmailService.js';

class AuthenticationComponent {
    constructor() {
        this.authService = new AuthenticationService();
        this.emailService = new EmailService({ mockMode: true });
        this.currentView = 'login';
        this.isLoggedIn = false;
        this.currentUser = null;
        this.currentSession = null;

        this.setupEventListeners();
        this.setupAuthServiceListeners();
        this.loadSessionFromStorage();
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            this.render();
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('auth-link')) {
                e.preventDefault();
                const view = e.target.dataset.view;
                this.showView(view);
            }

            if (e.target.classList.contains('auth-submit')) {
                e.preventDefault();
                this.handleFormSubmit(e.target.closest('form'));
            }

            if (e.target.classList.contains('logout-btn')) {
                e.preventDefault();
                this.logout();
            }
        });

        document.addEventListener('submit', (e) => {
            if (e.target.classList.contains('auth-form')) {
                e.preventDefault();
                this.handleFormSubmit(e.target);
            }
        });
    }

    setupAuthServiceListeners() {
        this.authService.addEventListener('user:registered', (data) => {
            if (data.requiresEmailVerification) {
                this.emailService.sendEmailVerificationEmail(
                    data.email,
                    data.emailVerificationToken,
                    data.username
                );
                this.showMessage('Registration successful! Please check your email to verify your account.', 'success');
                this.showView('login');
            } else {
                this.showMessage('Registration successful! You can now log in.', 'success');
                this.showView('login');
            }
        });

        this.authService.addEventListener('user:logged_in', (data) => {
            this.showMessage('Login successful!', 'success');
            this.isLoggedIn = true;
            this.currentUser = data.user;
            this.currentSession = data.session;
            this.saveSessionToStorage();
            this.render();
        });

        this.authService.addEventListener('user:password_reset_requested', (data) => {
            this.emailService.sendPasswordResetEmail(
                data.email,
                data.resetToken,
                data.userName
            );
        });
    }

    async handleFormSubmit(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        const formType = form.dataset.type;

        this.clearMessages();
        this.setLoading(true);

        try {
            switch (formType) {
                case 'login':
                    await this.handleLogin(data);
                    break;
                case 'register':
                    await this.handleRegister(data);
                    break;
                case 'forgot-password':
                    await this.handleForgotPassword(data);
                    break;
                case 'reset-password':
                    await this.handleResetPassword(data);
                    break;
                case 'change-password':
                    await this.handleChangePassword(data);
                    break;
            }
        } catch (error) {
            this.showMessage(error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async handleLogin(data) {
        const result = await this.authService.login({
            usernameOrEmail: data.usernameOrEmail,
            password: data.password
        });

        if (!result.success) {
            throw new Error(result.error);
        }

        this.isLoggedIn = true;
        this.currentUser = result.user;
        this.currentSession = result.session;
        this.saveSessionToStorage();
        this.render();
    }

    async handleRegister(data) {
        if (data.password !== data.confirmPassword) {
            throw new Error('Passwords do not match');
        }

        const result = await this.authService.register({
            username: data.username,
            email: data.email,
            password: data.password,
            firstName: data.firstName || '',
            lastName: data.lastName || ''
        });

        if (!result.success) {
            throw new Error(result.error);
        }
    }

    async handleForgotPassword(data) {
        const result = await this.authService.requestPasswordReset(data.email);

        if (result.success) {
            this.showMessage('If an account with that email exists, you will receive a password reset link.', 'info');
            this.showView('login');
        } else {
            throw new Error(result.error);
        }
    }

    async handleResetPassword(data) {
        if (data.password !== data.confirmPassword) {
            throw new Error('Passwords do not match');
        }

        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
            throw new Error('Invalid reset token');
        }

        const result = await this.authService.resetPassword(token, data.password);

        if (result.success) {
            this.showMessage('Password reset successful! You can now log in with your new password.', 'success');
            this.showView('login');
        } else {
            throw new Error(result.error);
        }
    }

    async handleChangePassword(data) {
        if (data.newPassword !== data.confirmPassword) {
            throw new Error('Passwords do not match');
        }

        const result = await this.authService.changePassword(
            this.currentUser.id,
            data.currentPassword,
            data.newPassword
        );

        if (result.success) {
            this.showMessage('Password changed successfully!', 'success');
            this.showView('profile');
        } else {
            throw new Error(result.error);
        }
    }

    async logout() {
        if (this.currentSession) {
            await this.authService.logout(this.currentSession.id);
        }

        this.isLoggedIn = false;
        this.currentUser = null;
        this.currentSession = null;
        this.clearSessionFromStorage();
        this.render();
        this.showMessage('Logged out successfully', 'info');
    }

    async verifyEmail(token) {
        const result = await this.authService.verifyEmail(token);

        if (result.success) {
            this.showMessage('Email verified successfully! You can now log in.', 'success');
            this.showView('login');
        } else {
            this.showMessage(result.error, 'error');
        }
    }

    showView(view) {
        this.currentView = view;
        this.render();
    }

    render() {
        const authContainer = document.getElementById('auth-container');
        if (!authContainer) {
            this.createAuthContainer();
            return;
        }

        if (this.isLoggedIn) {
            authContainer.style.display = 'none';
            this.showMainApp();
        } else {
            authContainer.style.display = 'block';
            this.hideMainApp();
            authContainer.innerHTML = this.getViewHTML();
        }
    }

    createAuthContainer() {
        const authContainer = document.createElement('div');
        authContainer.id = 'auth-container';
        authContainer.className = 'auth-container';
        document.body.appendChild(authContainer);
        this.render();
    }

    showMainApp() {
        const app = document.getElementById('app');
        if (app) {
            app.style.display = 'block';
        }
    }

    hideMainApp() {
        const app = document.getElementById('app');
        if (app) {
            app.style.display = 'none';
        }
    }

    getViewHTML() {
        switch (this.currentView) {
            case 'login':
                return this.getLoginHTML();
            case 'register':
                return this.getRegisterHTML();
            case 'forgot-password':
                return this.getForgotPasswordHTML();
            case 'reset-password':
                return this.getResetPasswordHTML();
            case 'change-password':
                return this.getChangePasswordHTML();
            default:
                return this.getLoginHTML();
        }
    }

    getLoginHTML() {
        return `
            <div class="auth-form-container">
                <div class="auth-header">
                    <h2>Login</h2>
                    <p>Sign in to your account</p>
                </div>

                <form class="auth-form" data-type="login">
                    <div class="form-group">
                        <label for="usernameOrEmail">Username or Email</label>
                        <input type="text" id="usernameOrEmail" name="usernameOrEmail" required>
                    </div>

                    <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" name="password" required>
                    </div>

                    <button type="submit" class="btn btn-primary auth-submit">
                        <span class="btn-text">Sign In</span>
                        <span class="loading" style="display: none;"></span>
                    </button>

                    <div class="auth-links">
                        <a href="#" class="auth-link" data-view="forgot-password">Forgot Password?</a>
                        <a href="#" class="auth-link" data-view="register">Create Account</a>
                    </div>
                </form>

                <div id="auth-messages"></div>
            </div>
        `;
    }

    getRegisterHTML() {
        return `
            <div class="auth-form-container">
                <div class="auth-header">
                    <h2>Create Account</h2>
                    <p>Join Process Execution System</p>
                </div>

                <form class="auth-form" data-type="register">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="firstName">First Name</label>
                            <input type="text" id="firstName" name="firstName">
                        </div>
                        <div class="form-group">
                            <label for="lastName">Last Name</label>
                            <input type="text" id="lastName" name="lastName">
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="username">Username</label>
                        <input type="text" id="username" name="username" required>
                    </div>

                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" name="email" required>
                    </div>

                    <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" name="password" required>
                        <small class="form-help">At least 8 characters with uppercase, lowercase, number, and special character</small>
                    </div>

                    <div class="form-group">
                        <label for="confirmPassword">Confirm Password</label>
                        <input type="password" id="confirmPassword" name="confirmPassword" required>
                    </div>

                    <button type="submit" class="btn btn-primary auth-submit">
                        <span class="btn-text">Create Account</span>
                        <span class="loading" style="display: none;"></span>
                    </button>

                    <div class="auth-links">
                        <a href="#" class="auth-link" data-view="login">Already have an account? Sign In</a>
                    </div>
                </form>

                <div id="auth-messages"></div>
            </div>
        `;
    }

    getForgotPasswordHTML() {
        return `
            <div class="auth-form-container">
                <div class="auth-header">
                    <h2>Reset Password</h2>
                    <p>Enter your email to receive a reset link</p>
                </div>

                <form class="auth-form" data-type="forgot-password">
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" name="email" required>
                    </div>

                    <button type="submit" class="btn btn-primary auth-submit">
                        <span class="btn-text">Send Reset Link</span>
                        <span class="loading" style="display: none;"></span>
                    </button>

                    <div class="auth-links">
                        <a href="#" class="auth-link" data-view="login">Back to Sign In</a>
                    </div>
                </form>

                <div id="auth-messages"></div>
            </div>
        `;
    }

    getResetPasswordHTML() {
        return `
            <div class="auth-form-container">
                <div class="auth-header">
                    <h2>Set New Password</h2>
                    <p>Enter your new password</p>
                </div>

                <form class="auth-form" data-type="reset-password">
                    <div class="form-group">
                        <label for="password">New Password</label>
                        <input type="password" id="password" name="password" required>
                    </div>

                    <div class="form-group">
                        <label for="confirmPassword">Confirm New Password</label>
                        <input type="password" id="confirmPassword" name="confirmPassword" required>
                    </div>

                    <button type="submit" class="btn btn-primary auth-submit">
                        <span class="btn-text">Reset Password</span>
                        <span class="loading" style="display: none;"></span>
                    </button>

                    <div class="auth-links">
                        <a href="#" class="auth-link" data-view="login">Back to Sign In</a>
                    </div>
                </form>

                <div id="auth-messages"></div>
            </div>
        `;
    }

    getChangePasswordHTML() {
        return `
            <div class="auth-form-container">
                <div class="auth-header">
                    <h2>Change Password</h2>
                    <p>Update your password</p>
                </div>

                <form class="auth-form" data-type="change-password">
                    <div class="form-group">
                        <label for="currentPassword">Current Password</label>
                        <input type="password" id="currentPassword" name="currentPassword" required>
                    </div>

                    <div class="form-group">
                        <label for="newPassword">New Password</label>
                        <input type="password" id="newPassword" name="newPassword" required>
                    </div>

                    <div class="form-group">
                        <label for="confirmPassword">Confirm New Password</label>
                        <input type="password" id="confirmPassword" name="confirmPassword" required>
                    </div>

                    <button type="submit" class="btn btn-primary auth-submit">
                        <span class="btn-text">Change Password</span>
                        <span class="loading" style="display: none;"></span>
                    </button>

                    <div class="auth-links">
                        <a href="#" class="auth-link" data-view="profile">Back to Profile</a>
                    </div>
                </form>

                <div id="auth-messages"></div>
            </div>
        `;
    }

    showMessage(message, type = 'info') {
        const messagesContainer = document.getElementById('auth-messages');
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `${type}-message`;
        messageDiv.textContent = message;

        messagesContainer.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }

    clearMessages() {
        const messagesContainer = document.getElementById('auth-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
    }

    setLoading(isLoading) {
        const submitButtons = document.querySelectorAll('.auth-submit');
        submitButtons.forEach(button => {
            const text = button.querySelector('.btn-text');
            const loading = button.querySelector('.loading');

            if (isLoading) {
                button.disabled = true;
                text.style.display = 'none';
                loading.style.display = 'inline-block';
            } else {
                button.disabled = false;
                text.style.display = 'inline';
                loading.style.display = 'none';
            }
        });
    }

    saveSessionToStorage() {
        if (this.currentSession && this.currentUser) {
            localStorage.setItem('session', JSON.stringify(this.currentSession));
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        }
    }

    loadSessionFromStorage() {
        try {
            const sessionData = localStorage.getItem('session');
            const userData = localStorage.getItem('currentUser');

            if (sessionData && userData) {
                this.currentSession = JSON.parse(sessionData);
                this.currentUser = JSON.parse(userData);

                // Validate session
                this.authService.validateSession(this.currentSession.id).then(result => {
                    if (result.valid) {
                        this.isLoggedIn = true;
                        this.render();
                    } else {
                        this.clearSessionFromStorage();
                    }
                });
            }
        } catch (error) {
            console.error('Error loading session:', error);
            this.clearSessionFromStorage();
        }
    }

    clearSessionFromStorage() {
        localStorage.removeItem('session');
        localStorage.removeItem('currentUser');
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isUserLoggedIn() {
        return this.isLoggedIn;
    }

    getAuthService() {
        return this.authService;
    }
}

export default AuthenticationComponent;