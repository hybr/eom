import { personService } from '../services/person-service.js'


export function render() {
    const container = document.createElement('div')
    container.className = 'card'
    container.innerHTML = `
<h2>Person</h2>
<div id="person-list"></div>
<hr>
<form id="person-form">
<div class="form-row"><input name="name_prefix" placeholder="Prefix (Mr., Ms., Dr., etc.)"></div>
<div class="form-row"><input name="first_name" placeholder="First name" required></div>
<div class="form-row"><input name="middle_name" placeholder="Middle name"></div>
<div class="form-row"><input name="last_name" placeholder="Last name" required></div>
<div class="form-row"><input name="name_suffix" placeholder="Suffix (Jr., Sr., III, etc.)"></div>
<div class="form-row"><input name="date_of_birth" type="date" placeholder="Date of birth"></div>
<div class="form-row"><input name="primary_phone_number" type="tel" placeholder="Primary phone number"></div>
<div class="form-row"><input name="primary_email_address" type="email" placeholder="Primary email address"></div>
<div class="form-row"><button type="submit">Create Person</button></div>
</form>
`
    return container
}


export async function afterRender() {
    await loadList()
    document.getElementById('person-form').addEventListener('submit', async e => {
        e.preventDefault()
        const fd = new FormData(e.target)
        const data = Object.fromEntries(fd.entries())
        await personService.create(data)
        e.target.reset()
        await loadList()
    })
}


async function loadList() {
    const list = await personService.list()
    const container = document.getElementById('person-list')
    if (!container) return

    container.innerHTML = list.map(p => {
        const fullName = [p.name_prefix, p.first_name, p.middle_name, p.last_name, p.name_suffix]
            .filter(Boolean)
            .join(' ')

        const details = []
        if (p.date_of_birth) details.push(`DOB: ${p.date_of_birth}`)
        if (p.primary_email_address) details.push(`Email: ${p.primary_email_address}`)
        if (p.primary_phone_number) details.push(`Phone: ${p.primary_phone_number}`)

        const detailsStr = details.length > 0 ? ` (${details.join(', ')})` : ''

        return `<div>${p.id}: ${fullName}${detailsStr}</div>`
    }).join('')
}