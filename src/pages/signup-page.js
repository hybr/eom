import { signupService } from '../services/signup-service.js'

export function render() {
    const container = document.createElement('div')
    container.className = 'card'
    container.innerHTML = `
<h2>Create Your Account</h2>
<p>Join us today! Fill out the form below to create your account.</p>

<form id="signup-form" class="signup-form">
    <!-- Personal Information Section -->
    <fieldset class="form-section">
        <legend>Personal Information</legend>

        <div class="form-row">
            <select name="name_prefix">
                <option value="">Title (Optional)</option>
                <option value="Mr.">Mr.</option>
                <option value="Ms.">Ms.</option>
                <option value="Mrs.">Mrs.</option>
                <option value="Dr.">Dr.</option>
                <option value="Prof.">Prof.</option>
            </select>
        </div>

        <div class="form-row">
            <input name="first_name" placeholder="First Name *" required>
            <span class="validation-message" data-field="first_name"></span>
        </div>

        <div class="form-row">
            <input name="middle_name" placeholder="Middle Name">
        </div>

        <div class="form-row">
            <input name="last_name" placeholder="Last Name *" required>
            <span class="validation-message" data-field="last_name"></span>
        </div>

        <div class="form-row">
            <input name="name_suffix" placeholder="Suffix (Jr., Sr., III, etc.)">
        </div>

        <div class="form-row">
            <label for="date_of_birth">Date of Birth</label>
            <input name="date_of_birth" type="date" id="date_of_birth">
        </div>
    </fieldset>

    <!-- Contact Information Section -->
    <fieldset class="form-section">
        <legend>Contact Information</legend>

        <div class="form-row">
            <input name="primary_email_address" type="email" placeholder="Email Address *" required>
            <span class="validation-message" data-field="primary_email_address"></span>
            <span class="availability-check" data-field="primary_email_address"></span>
        </div>

        <div class="form-row">
            <input name="primary_phone_number" type="tel" placeholder="Phone Number">
        </div>
    </fieldset>

    <!-- Account Security Section -->
    <fieldset class="form-section">
        <legend>Account Security</legend>

        <div class="form-row">
            <input name="username" placeholder="Username *" required>
            <span class="validation-message" data-field="username"></span>
            <span class="availability-check" data-field="username"></span>
        </div>

        <div class="form-row">
            <input name="password" type="password" placeholder="Password *" required>
            <span class="validation-message" data-field="password"></span>
            <div class="password-strength" id="password-strength"></div>
        </div>

        <div class="form-row">
            <input name="confirm_password" type="password" placeholder="Confirm Password *" required>
            <span class="validation-message" data-field="confirm_password"></span>
        </div>

        <div class="form-row">
            <input name="security_question" placeholder="Security Question (Optional)">
        </div>

        <div class="form-row">
            <input name="security_answer" placeholder="Security Answer (Optional)">
        </div>
    </fieldset>

    <!-- Submit Section -->
    <div class="form-actions">
        <button type="submit" id="submit-btn" disabled>
            <span class="btn-text">Create Account</span>
            <span class="btn-loading" style="display: none;">Creating...</span>
        </button>
    </div>

    <div class="form-footer">
        <p>Already have an account? <a href="/login" data-link>Sign in here</a></p>
    </div>
</form>

<div id="success-message" class="success-message" style="display: none;">
    <h3>🎉 Account Created Successfully!</h3>
    <p>Welcome aboard! Your account has been created and you can now sign in.</p>
    <button onclick="window.location.href='/login'">Go to Sign In</button>
</div>
`

    // Add some styling
    const style = document.createElement('style')
    style.textContent = `
        .signup-form { max-width: 600px; margin: 0 auto; }
        .form-section { border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
        .form-section legend { font-weight: 600; padding: 0 8px; color: var(--accent); }
        .form-row { margin-bottom: 12px; position: relative; }
        .form-row input, .form-row select { width: 100%; }
        .validation-message { font-size: 12px; color: #e74c3c; display: block; margin-top: 4px; }
        .validation-message.success { color: #27ae60; }
        .availability-check { font-size: 12px; margin-top: 4px; display: block; }
        .availability-check.checking { color: #f39c12; }
        .availability-check.available { color: #27ae60; }
        .availability-check.unavailable { color: #e74c3c; }
        .password-strength { margin-top: 4px; font-size: 12px; }
        .strength-weak { color: #e74c3c; }
        .strength-medium { color: #f39c12; }
        .strength-strong { color: #27ae60; }
        .form-actions { text-align: center; margin-top: 24px; }
        .form-actions button { padding: 12px 32px; font-size: 16px; font-weight: 600; }
        .form-actions button:disabled { opacity: 0.6; cursor: not-allowed; }
        .form-footer { text-align: center; margin-top: 16px; font-size: 14px; }
        .success-message { background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; text-align: center; }
        .success-message h3 { color: #155724; margin: 0 0 12px 0; }
        .success-message p { color: #155724; margin: 0 0 16px 0; }
        .success-message button { background: var(--accent); color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
    `
    container.appendChild(style)

    return container
}

export async function afterRender() {
    const form = document.getElementById('signup-form')
    const submitBtn = document.getElementById('submit-btn')

    // Validation state
    const validationState = {
        first_name: false,
        last_name: false,
        primary_email_address: false,
        username: false,
        password: false,
        confirm_password: false,
        email_available: false,
        username_available: false
    }

    // Real-time validation
    setupValidation()

    // Form submission
    form.addEventListener('submit', handleSubmit)

    function setupValidation() {
        const inputs = form.querySelectorAll('input[required]')

        inputs.forEach(input => {
            input.addEventListener('blur', () => validateField(input))
            input.addEventListener('input', () => {
                if (input.name === 'password') {
                    checkPasswordStrength(input.value)
                    validateField(document.querySelector('input[name="confirm_password"]'))
                }
                if (input.name === 'confirm_password') {
                    validateField(input)
                }
                if (input.name === 'username' || input.name === 'primary_email_address') {
                    debounce(() => checkAvailability(input), 500)()
                }
                validateField(input)
                updateSubmitButton()
            })
        })
    }

    function validateField(input) {
        const field = input.name
        const value = input.value.trim()
        const messageEl = document.querySelector(`[data-field="${field}"]`)

        let isValid = true
        let message = ''

        switch (field) {
            case 'first_name':
            case 'last_name':
                if (!value) {
                    isValid = false
                    message = 'This field is required'
                } else if (value.length < 2) {
                    isValid = false
                    message = 'Must be at least 2 characters'
                }
                break

            case 'primary_email_address':
                if (!value) {
                    isValid = false
                    message = 'Email is required'
                } else if (!isValidEmail(value)) {
                    isValid = false
                    message = 'Please enter a valid email address'
                }
                break

            case 'username':
                if (!value) {
                    isValid = false
                    message = 'Username is required'
                } else if (value.length < 3) {
                    isValid = false
                    message = 'Username must be at least 3 characters'
                } else if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
                    isValid = false
                    message = 'Username can only contain letters, numbers, hyphens, and underscores'
                }
                break

            case 'password':
                if (!value) {
                    isValid = false
                    message = 'Password is required'
                } else if (value.length < 8) {
                    isValid = false
                    message = 'Password must be at least 8 characters'
                }
                break

            case 'confirm_password':
                const password = document.querySelector('input[name="password"]').value
                if (!value) {
                    isValid = false
                    message = 'Please confirm your password'
                } else if (value !== password) {
                    isValid = false
                    message = 'Passwords do not match'
                }
                break
        }

        validationState[field] = isValid

        if (messageEl) {
            messageEl.textContent = message
            messageEl.className = isValid ? 'validation-message success' : 'validation-message'
        }

        return isValid
    }

    async function checkAvailability(input) {
        const field = input.name
        const value = input.value.trim()
        const checkEl = document.querySelector(`[data-field="${field}"].availability-check`)

        if (!value || !validateField(input)) {
            if (checkEl) checkEl.textContent = ''
            return
        }

        if (checkEl) {
            checkEl.textContent = 'Checking availability...'
            checkEl.className = 'availability-check checking'
        }

        try {
            let available = false
            if (field === 'username') {
                available = await signupService.checkUsername(value)
                validationState.username_available = available
            } else if (field === 'primary_email_address') {
                available = await signupService.checkEmail(value)
                validationState.email_available = available
            }

            if (checkEl) {
                if (available) {
                    checkEl.textContent = '✓ Available'
                    checkEl.className = 'availability-check available'
                } else {
                    checkEl.textContent = '✗ Not available'
                    checkEl.className = 'availability-check unavailable'
                }
            }
        } catch (error) {
            if (checkEl) {
                checkEl.textContent = 'Could not check availability'
                checkEl.className = 'availability-check'
            }
        }

        updateSubmitButton()
    }

    function checkPasswordStrength(password) {
        const strengthEl = document.getElementById('password-strength')
        if (!strengthEl) return

        let strength = 0
        let feedback = []

        if (password.length >= 8) strength++
        else feedback.push('At least 8 characters')

        if (/[a-z]/.test(password)) strength++
        else feedback.push('lowercase letter')

        if (/[A-Z]/.test(password)) strength++
        else feedback.push('uppercase letter')

        if (/\d/.test(password)) strength++
        else feedback.push('number')

        if (/[^a-zA-Z\d]/.test(password)) strength++
        else feedback.push('special character')

        let strengthText = ''
        let strengthClass = ''

        if (strength < 3) {
            strengthText = 'Weak'
            strengthClass = 'strength-weak'
        } else if (strength < 5) {
            strengthText = 'Medium'
            strengthClass = 'strength-medium'
        } else {
            strengthText = 'Strong'
            strengthClass = 'strength-strong'
        }

        if (feedback.length > 0) {
            strengthText += ` - Add: ${feedback.join(', ')}`
        }

        strengthEl.textContent = password ? `Password strength: ${strengthText}` : ''
        strengthEl.className = `password-strength ${strengthClass}`
    }

    function updateSubmitButton() {
        const isFormValid = validationState.first_name &&
                           validationState.last_name &&
                           validationState.primary_email_address &&
                           validationState.username &&
                           validationState.password &&
                           validationState.confirm_password &&
                           validationState.email_available &&
                           validationState.username_available

        submitBtn.disabled = !isFormValid
    }

    async function handleSubmit(e) {
        e.preventDefault()

        const btnText = submitBtn.querySelector('.btn-text')
        const btnLoading = submitBtn.querySelector('.btn-loading')

        // Show loading state
        btnText.style.display = 'none'
        btnLoading.style.display = 'inline'
        submitBtn.disabled = true

        try {
            const formData = new FormData(form)
            const data = Object.fromEntries(formData.entries())

            // Remove empty optional fields
            Object.keys(data).forEach(key => {
                if (data[key] === '') data[key] = null
            })

            const result = await signupService.register(data)

            // Show success message
            document.getElementById('signup-form').style.display = 'none'
            document.getElementById('success-message').style.display = 'block'

        } catch (error) {
            // Show error message
            const errorMessage = error.message || 'Failed to create account. Please try again.'
            alert(`Error: ${errorMessage}`)

            // Reset button
            btnText.style.display = 'inline'
            btnLoading.style.display = 'none'
            submitBtn.disabled = false
        }
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }

    function debounce(func, wait) {
        let timeout
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout)
                func(...args)
            }
            clearTimeout(timeout)
            timeout = setTimeout(later, wait)
        }
    }
}