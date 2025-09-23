export default class AuthComponent {
    constructor() {
        this.currentTab = 'signin';
        this.isLoading = false;
    }

    render(container) {
        container.innerHTML = this.getHTML();
        this.setupEventListeners();
        this.showTab(this.currentTab);
    }

    getHTML() {
        return `
            <div class="auth-form">
                <h2>Welcome to V4L</h2>

                <!-- Tab Navigation -->
                <div class="auth-tabs">
                    <button class="auth-tab" data-tab="signin">Sign In</button>
                    <button class="auth-tab" data-tab="signup">Sign Up</button>
                </div>

                <!-- Sign In Form -->
                <div id="signin-tab" class="auth-tab-content">
                    <form id="signin-form">
                        <div class="form-group">
                            <label for="signin-username">Username or Email</label>
                            <input type="text" id="signin-username" name="usernameOrEmail" required autocomplete="username" placeholder="Enter your username or email">
                        </div>
                        <div class="form-group">
                            <label for="signin-password">Password</label>
                            <input type="password" id="signin-password" name="password" required autocomplete="current-password">
                            <a href="#" id="forgot-password-link" class="forgot-password-link">Forgot password?</a>
                        </div>
                        <button type="submit" class="btn btn-primary">Sign In</button>
                    </form>
                </div>

                <!-- Sign Up Form -->
                <div id="signup-tab" class="auth-tab-content">
                    <form id="signup-form">
                        <div class="form-group">
                            <label for="signup-username">Username</label>
                            <input type="text" id="signup-username" name="username" required autocomplete="username" placeholder="Choose a unique username">
                            <small class="form-help">3-30 characters, letters, numbers, and underscores only</small>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="signup-first-name">First Name</label>
                                <input type="text" id="signup-first-name" name="firstName" required autocomplete="given-name">
                            </div>
                            <div class="form-group">
                                <label for="signup-last-name">Last Name</label>
                                <input type="text" id="signup-last-name" name="lastName" required autocomplete="family-name">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="signup-email">Email Address</label>
                            <input type="email" id="signup-email" name="email" required autocomplete="email" placeholder="Used for password reset and notifications">
                            <small class="form-help">We'll use this for password recovery</small>
                        </div>
                        <div class="form-group">
                            <label for="signup-password">Password</label>
                            <input type="password" id="signup-password" name="password" required autocomplete="new-password">
                            <div class="password-requirements">
                                <ul id="password-requirements-list">
                                    <li data-requirement="length">At least 8 characters</li>
                                    <li data-requirement="uppercase">One uppercase letter</li>
                                    <li data-requirement="lowercase">One lowercase letter</li>
                                    <li data-requirement="number">One number</li>
                                </ul>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="signup-organization">Organization Name (Optional)</label>
                            <input type="text" id="signup-organization" name="organizationName" placeholder="Create a new organization">
                        </div>
                        <div class="form-checkbox">
                            <input type="checkbox" id="signup-terms" name="terms" required>
                            <label for="signup-terms">I agree to the Terms of Service and Privacy Policy</label>
                        </div>
                        <button type="submit" class="btn btn-primary">Create Account</button>
                    </form>
                </div>

                <!-- Forgot Password Form -->
                <div id="forgot-password-tab" class="auth-tab-content">
                    <div class="forgot-password-info">
                        <h3>Reset Your Password</h3>
                        <p>Enter your email address and we'll send you a link to reset your password.</p>
                    </div>
                    <form id="forgot-password-form">
                        <div class="form-group">
                            <label for="forgot-email">Email Address</label>
                            <input type="email" id="forgot-email" name="email" required placeholder="Enter your email address">
                        </div>
                        <button type="submit" class="btn btn-primary">Send Reset Link</button>
                        <button type="button" id="back-to-signin" class="btn btn-secondary">Back to Sign In</button>
                    </form>
                </div>

                <!-- Messages -->
                <div id="auth-message" class="message hidden"></div>
            </div>
        `;
    }

    setupEventListeners() {
        // Tab switching
        const tabs = document.querySelectorAll('.auth-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.showTab(tab.dataset.tab);
            });
        });

        // Sign In form
        const signinForm = document.getElementById('signin-form');
        if (signinForm) {
            signinForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSignIn(signinForm);
            });
        }

        // Sign Up form
        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSignUp(signupForm);
            });

            // Password validation
            const passwordInput = document.getElementById('signup-password');
            if (passwordInput) {
                passwordInput.addEventListener('input', () => {
                    this.validatePassword(passwordInput.value);
                });
            }

            // Username validation
            const usernameInput = document.getElementById('signup-username');
            if (usernameInput) {
                usernameInput.addEventListener('input', () => {
                    this.validateUsername(usernameInput.value);
                });
            }
        }

        // Forgot Password form
        const forgotForm = document.getElementById('forgot-password-form');
        if (forgotForm) {
            forgotForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleForgotPassword(forgotForm);
            });
        }

        // Forgot password link
        const forgotLink = document.getElementById('forgot-password-link');
        if (forgotLink) {
            forgotLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showTab('forgot-password');
            });
        }

        // Back to sign in button
        const backBtn = document.getElementById('back-to-signin');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.showTab('signin');
            });
        }
    }

    showTab(tabName) {
        this.currentTab = tabName;

        // Update tab buttons
        const tabs = document.querySelectorAll('.auth-tab');
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            }
        });

        // Update tab content
        const contents = document.querySelectorAll('.auth-tab-content');
        contents.forEach(content => {
            content.classList.remove('active');
        });

        const activeContent = document.getElementById(`${tabName}-tab`);
        if (activeContent) {
            activeContent.classList.add('active');
        }

        this.clearMessage();
    }

    async handleSignIn(form) {
        if (this.isLoading) return;

        this.setLoading(true);
        this.clearMessage();

        const formData = new FormData(form);
        const data = {
            usernameOrEmail: formData.get('usernameOrEmail'),
            password: formData.get('password')
        };

        try {
            const auth = window.app?.getAuth();
            if (!auth) {
                throw new Error('Authentication service not available');
            }

            const result = await auth.signIn(data);

            if (result.success) {
                this.showMessage('Signed in successfully!', 'success');
                // The app will handle the authenticated event
            } else {
                this.showMessage(result.message || 'Sign in failed', 'error');
            }

        } catch (error) {
            console.error('Sign in error:', error);
            this.showMessage('An error occurred during sign in', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async handleSignUp(form) {
        if (this.isLoading) return;

        this.setLoading(true);
        this.clearMessage();

        const formData = new FormData(form);
        const data = {
            username: formData.get('username'),
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            password: formData.get('password'),
            organizationName: formData.get('organizationName')
        };

        try {
            const auth = window.app?.getAuth();
            if (!auth) {
                throw new Error('Authentication service not available');
            }

            const result = await auth.signUp(data);

            if (result.success) {
                this.showMessage('Account created successfully! Please sign in.', 'success');
                this.showTab('signin');
                form.reset();
            } else {
                this.showMessage(result.message || 'Sign up failed', 'error');
            }

        } catch (error) {
            console.error('Sign up error:', error);
            this.showMessage('An error occurred during sign up', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async handleForgotPassword(form) {
        if (this.isLoading) return;

        this.setLoading(true);
        this.clearMessage();

        const formData = new FormData(form);
        const email = formData.get('email');

        try {
            const auth = window.app?.getAuth();
            if (!auth) {
                throw new Error('Authentication service not available');
            }

            const result = await auth.forgotPassword(email);

            if (result.success) {
                this.showMessage(result.message, 'success');
                form.reset();
            } else {
                this.showMessage(result.message || 'Failed to send reset email', 'error');
            }

        } catch (error) {
            console.error('Forgot password error:', error);
            this.showMessage('An error occurred while sending reset email', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    validatePassword(password) {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password)
        };

        Object.keys(requirements).forEach(requirement => {
            const element = document.querySelector(`[data-requirement="${requirement}"]`);
            if (element) {
                if (requirements[requirement]) {
                    element.classList.add('valid');
                } else {
                    element.classList.remove('valid');
                }
            }
        });
    }

    validateUsername(username) {
        const usernameInput = document.getElementById('signup-username');
        const helpText = usernameInput?.parentElement.querySelector('.form-help');

        if (!usernameInput) return;

        const isValid = /^[a-zA-Z0-9_]{3,30}$/.test(username);

        if (username.length === 0) {
            usernameInput.classList.remove('valid', 'invalid');
            if (helpText) helpText.textContent = '3-30 characters, letters, numbers, and underscores only';
        } else if (isValid) {
            usernameInput.classList.remove('invalid');
            usernameInput.classList.add('valid');
            if (helpText) helpText.textContent = 'Username looks good!';
        } else {
            usernameInput.classList.remove('valid');
            usernameInput.classList.add('invalid');
            if (helpText) helpText.textContent = 'Username must be 3-30 characters, letters, numbers, and underscores only';
        }
    }

    showMessage(message, type = 'info') {
        const messageEl = document.getElementById('auth-message');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `message message-${type}`;
            messageEl.classList.remove('hidden');
        }
    }

    clearMessage() {
        const messageEl = document.getElementById('auth-message');
        if (messageEl) {
            messageEl.classList.add('hidden');
            messageEl.textContent = '';
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        const forms = document.querySelectorAll('.auth-form form');

        forms.forEach(form => {
            if (loading) {
                form.classList.add('loading');
            } else {
                form.classList.remove('loading');
            }

            const buttons = form.querySelectorAll('button[type="submit"]');
            buttons.forEach(button => {
                button.disabled = loading;
            });
        });
    }
}