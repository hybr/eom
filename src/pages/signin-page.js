import { authService } from '../services/auth-service.js'

export function render() {
    const container = document.createElement('div')
    container.className = 'card'
    container.innerHTML = `
<div class="signin-container">
    <div class="signin-header">
        <h2>Welcome Back</h2>
        <p>Sign in to your account to continue</p>
    </div>

    <form id="signin-form" class="signin-form">
        <div class="form-group">
            <label for="username">Username or Email</label>
            <input
                id="username"
                name="username"
                type="text"
                placeholder="Enter your username or email"
                required
                autocomplete="username"
            >
            <span class="validation-message" data-field="username"></span>
        </div>

        <div class="form-group">
            <label for="password">Password</label>
            <div class="password-input-container">
                <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    required
                    autocomplete="current-password"
                >
                <button type="button" class="password-toggle" aria-label="Toggle password visibility">
                    <span class="toggle-text">Show</span>
                </button>
            </div>
            <span class="validation-message" data-field="password"></span>
        </div>

        <div class="form-options">
            <label class="checkbox-container">
                <input type="checkbox" name="remember_me">
                <span class="checkmark"></span>
                Remember me for 7 days
            </label>
            <a href="/forgot-password" data-link class="forgot-password">Forgot password?</a>
        </div>

        <div class="form-actions">
            <button type="submit" id="signin-btn" class="signin-button">
                <span class="btn-text">Sign In</span>
                <span class="btn-loading" style="display: none;">
                    <span class="spinner"></span>
                    Signing in...
                </span>
            </button>
        </div>

        <div class="error-message" id="error-message" style="display: none;"></div>
        <div class="success-message" id="success-message" style="display: none;"></div>
    </form>

    <div class="signin-footer">
        <p>Don't have an account? <a href="/signup" data-link>Sign up here</a></p>
    </div>

    <div id="welcome-back" class="welcome-back" style="display: none;">
        <div class="welcome-content">
            <h3>🎉 Welcome Back!</h3>
            <p>You have successfully signed in.</p>
            <div class="user-info"></div>
            <button onclick="window.location.href='/'" class="continue-btn">Continue to Dashboard</button>
        </div>
    </div>
</div>
`

    // Add styling
    const style = document.createElement('style')
    style.textContent = `
        .signin-container { max-width: 400px; margin: 0 auto; }

        .signin-header { text-align: center; margin-bottom: 32px; }
        .signin-header h2 { margin: 0 0 8px 0; color: var(--accent); }
        .signin-header p { margin: 0; color: #666; }

        .signin-form { margin-bottom: 24px; }

        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-weight: 600; margin-bottom: 6px; color: #333; }
        .form-group input { width: 100%; padding: 12px; border: 2px solid #e1e5e9; border-radius: 8px; font-size: 16px; transition: border-color 0.2s; }
        .form-group input:focus { outline: none; border-color: var(--accent); }

        .password-input-container { position: relative; }
        .password-toggle { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--accent); cursor: pointer; font-size: 14px; }

        .form-options { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; font-size: 14px; }

        .checkbox-container { display: flex; align-items: center; cursor: pointer; }
        .checkbox-container input { width: auto; margin-right: 8px; }

        .forgot-password { color: var(--accent); text-decoration: none; }
        .forgot-password:hover { text-decoration: underline; }

        .signin-button { width: 100%; padding: 14px; font-size: 16px; font-weight: 600; background: var(--accent); color: white; border: none; border-radius: 8px; cursor: pointer; transition: background-color 0.2s; }
        .signin-button:hover:not(:disabled) { background: #1d4ed8; }
        .signin-button:disabled { opacity: 0.6; cursor: not-allowed; }

        .validation-message { display: block; margin-top: 6px; font-size: 12px; color: #e74c3c; }

        .error-message, .success-message { padding: 12px; border-radius: 8px; margin-top: 16px; font-size: 14px; }
        .error-message { background: #fee; border: 1px solid #fcc; color: #c33; }
        .success-message { background: #efe; border: 1px solid #cfc; color: #363; }

        .spinner { display: inline-block; width: 12px; height: 12px; border: 2px solid #ffffff40; border-top: 2px solid #ffffff; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 8px; }

        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .signin-footer { text-align: center; margin-top: 24px; font-size: 14px; color: #666; }
        .signin-footer a { color: var(--accent); text-decoration: none; }
        .signin-footer a:hover { text-decoration: underline; }

        .welcome-back { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; text-align: center; }
        .welcome-content h3 { color: var(--accent); margin: 0 0 12px 0; }
        .welcome-content p { color: #666; margin: 0 0 20px 0; }
        .user-info { background: white; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: left; }
        .continue-btn { background: var(--accent); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; }
    `
    container.appendChild(style)

    return container
}

export async function afterRender() {
    const form = document.getElementById('signin-form')
    const usernameInput = document.getElementById('username')
    const passwordInput = document.getElementById('password')
    const signinBtn = document.getElementById('signin-btn')
    const passwordToggle = document.querySelector('.password-toggle')
    const errorMessage = document.getElementById('error-message')
    const successMessage = document.getElementById('success-message')

    // Password visibility toggle
    passwordToggle.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password'
        passwordInput.type = isPassword ? 'text' : 'password'
        passwordToggle.querySelector('.toggle-text').textContent = isPassword ? 'Hide' : 'Show'
    })

    // Real-time validation
    setupValidation()

    // Form submission
    form.addEventListener('submit', handleSubmit)

    // Check if user is already signed in
    if (authService.isAuthenticated()) {
        showWelcomeBack(authService.getCurrentUser())
    }

    function setupValidation() {
        const inputs = [usernameInput, passwordInput]

        inputs.forEach(input => {
            input.addEventListener('input', () => validateField(input))
            input.addEventListener('blur', () => validateField(input))
        })
    }

    function validateField(input) {
        const field = input.name
        const value = input.value.trim()
        const messageEl = document.querySelector(`[data-field="${field}"]`)

        let isValid = true
        let message = ''

        switch (field) {
            case 'username':
                if (!value) {
                    isValid = false
                    message = 'Username or email is required'
                } else if (value.length < 3) {
                    isValid = false
                    message = 'Must be at least 3 characters'
                }
                break

            case 'password':
                if (!value) {
                    isValid = false
                    message = 'Password is required'
                }
                break
        }

        if (messageEl) {
            messageEl.textContent = message
            messageEl.style.display = message ? 'block' : 'none'
        }

        return isValid
    }

    function showError(message, attemptsRemaining = null) {
        errorMessage.style.display = 'block'
        successMessage.style.display = 'none'

        let fullMessage = message
        if (attemptsRemaining !== null && attemptsRemaining < 5) {
            fullMessage += ` (${attemptsRemaining} attempts remaining)`
        }

        errorMessage.textContent = fullMessage
    }

    function showSuccess(message) {
        successMessage.style.display = 'block'
        errorMessage.style.display = 'none'
        successMessage.textContent = message
    }

    function hideMessages() {
        errorMessage.style.display = 'none'
        successMessage.style.display = 'none'
    }

    function setLoading(loading) {
        const btnText = signinBtn.querySelector('.btn-text')
        const btnLoading = signinBtn.querySelector('.btn-loading')

        if (loading) {
            btnText.style.display = 'none'
            btnLoading.style.display = 'inline-flex'
            signinBtn.disabled = true
        } else {
            btnText.style.display = 'inline'
            btnLoading.style.display = 'none'
            signinBtn.disabled = false
        }
    }

    function showWelcomeBack(user) {
        document.querySelector('.signin-form').style.display = 'none'
        document.querySelector('.signin-footer').style.display = 'none'
        document.getElementById('welcome-back').style.display = 'block'

        const userInfo = document.querySelector('.user-info')
        userInfo.innerHTML = `
            <div><strong>Name:</strong> ${user.full_name}</div>
            <div><strong>Username:</strong> ${user.username}</div>
            <div><strong>Email:</strong> ${user.email || 'Not provided'}</div>
            <div><strong>Last Login:</strong> ${new Date(user.last_login_at).toLocaleString()}</div>
        `
    }

    async function handleSubmit(e) {
        e.preventDefault()

        // Validate all fields
        const isUsernameValid = validateField(usernameInput)
        const isPasswordValid = validateField(passwordInput)

        if (!isUsernameValid || !isPasswordValid) {
            showError('Please fix the errors above')
            return
        }

        hideMessages()
        setLoading(true)

        try {
            const formData = new FormData(form)
            const credentials = {
                username: formData.get('username'),
                password: formData.get('password'),
                remember_me: formData.get('remember_me') === 'on'
            }

            const result = await authService.signIn(credentials)

            if (result.success) {
                showSuccess(result.message)

                // Check if password change is required
                if (result.requiresPasswordChange) {
                    setTimeout(() => {
                        window.location.href = '/change-password'
                    }, 2000)
                } else {
                    showWelcomeBack(result.user)
                }
            } else {
                showError(result.error, result.attemptsRemaining)
            }

        } catch (error) {
            showError('An unexpected error occurred. Please try again.')
        } finally {
            setLoading(false)
        }
    }
}