import { personCredentialService } from '../services/person-credential-service.js'
import { personService } from '../services/person-service.js'

export function render() {
    const container = document.createElement('div')
    container.className = 'card'
    container.innerHTML = `
<h2>Person Credentials</h2>
<div id="credential-list"></div>
<hr>
<form id="credential-form">
<div class="form-row">
    <select name="person_id" required>
        <option value="">Select Person</option>
    </select>
</div>
<div class="form-row"><input name="username" placeholder="Username" required></div>
<div class="form-row"><input name="password" type="password" placeholder="Password" required></div>
<div class="form-row">
    <select name="role_id">
        <option value="">Select Role (Optional)</option>
        <option value="1">Admin</option>
        <option value="2">User</option>
        <option value="3">Viewer</option>
    </select>
</div>
<div class="form-row">
    <label>
        <input name="must_change_password" type="checkbox"> Must change password on first login
    </label>
</div>
<div class="form-row"><input name="security_question" placeholder="Security Question (Optional)"></div>
<div class="form-row"><input name="security_answer" placeholder="Security Answer (Optional)"></div>
<div class="form-row">
    <select name="auth_provider">
        <option value="local">Local</option>
        <option value="google">Google</option>
        <option value="github">GitHub</option>
        <option value="microsoft">Microsoft</option>
    </select>
</div>
<div class="form-row"><button type="submit">Create Credential</button></div>
</form>

<hr>
<h3>Quick Actions</h3>
<div id="quick-actions">
    <input type="number" id="credential-id" placeholder="Credential ID">
    <input type="password" id="new-password" placeholder="New Password">
    <button id="change-password-btn">Change Password</button>
</div>
`
    return container
}

export async function afterRender() {
    await loadPersons()
    await loadList()

    document.getElementById('credential-form').addEventListener('submit', async e => {
        e.preventDefault()
        const fd = new FormData(e.target)
        const data = Object.fromEntries(fd.entries())

        // Convert checkbox to boolean
        data.must_change_password = data.must_change_password === 'on'

        // Convert empty strings to null for optional fields
        if (!data.role_id) data.role_id = null
        if (!data.security_question) data.security_question = null
        if (!data.security_answer) data.security_answer = null

        await personCredentialService.create(data)
        e.target.reset()
        await loadList()
    })

    document.getElementById('change-password-btn').addEventListener('click', async () => {
        const credentialId = document.getElementById('credential-id').value
        const newPassword = document.getElementById('new-password').value

        if (!credentialId || !newPassword) {
            alert('Please enter both Credential ID and New Password')
            return
        }

        try {
            await personCredentialService.changePassword(credentialId, newPassword)
            document.getElementById('credential-id').value = ''
            document.getElementById('new-password').value = ''
            alert('Password changed successfully')
            await loadList()
        } catch (error) {
            alert('Failed to change password: ' + error.message)
        }
    })
}

async function loadPersons() {
    const persons = await personService.list()
    const select = document.querySelector('select[name="person_id"]')
    if (!select) return

    // Keep the default option and add persons
    const defaultOption = select.querySelector('option[value=""]')
    select.innerHTML = ''
    select.appendChild(defaultOption)

    persons.forEach(person => {
        const option = document.createElement('option')
        option.value = person.id
        const fullName = [person.name_prefix, person.first_name, person.middle_name, person.last_name, person.name_suffix]
            .filter(Boolean)
            .join(' ')
        option.textContent = `${person.id}: ${fullName}`
        select.appendChild(option)
    })
}

async function loadList() {
    const list = await personCredentialService.list()
    const container = document.getElementById('credential-list')
    if (!container) return

    container.innerHTML = list.map(cred => {
        const personName = cred.first_name && cred.last_name ?
            `${cred.first_name} ${cred.last_name}` : 'Unknown Person'

        const status = []
        if (!cred.is_active) status.push('INACTIVE')
        if (cred.locked_until && new Date(cred.locked_until) > new Date()) status.push('LOCKED')
        if (cred.must_change_password) status.push('MUST CHANGE PASSWORD')
        if (cred.email_verified) status.push('EMAIL VERIFIED')
        if (cred.phone_verified) status.push('PHONE VERIFIED')

        const statusStr = status.length > 0 ? ` [${status.join(', ')}]` : ''

        const details = []
        if (cred.last_login_at) details.push(`Last login: ${new Date(cred.last_login_at).toLocaleString()}`)
        if (cred.failed_attempts > 0) details.push(`Failed attempts: ${cred.failed_attempts}`)
        if (cred.role_id) details.push(`Role: ${cred.role_id}`)
        if (cred.auth_provider !== 'local') details.push(`Provider: ${cred.auth_provider}`)
        if (cred.last_ip) details.push(`Last IP: ${cred.last_ip}`)

        const detailsStr = details.length > 0 ? `<br><small>${details.join(' | ')}</small>` : ''

        return `
            <div style="border: 1px solid #ddd; padding: 8px; margin-bottom: 8px; border-radius: 4px;">
                <strong>ID ${cred.id}:</strong> ${cred.username} → ${personName}${statusStr}
                ${detailsStr}
            </div>
        `
    }).join('')
}