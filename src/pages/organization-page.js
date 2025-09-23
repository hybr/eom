import { organizationService } from '../services/organization-service.js'


export function render() {
    const container = document.createElement('div')
    container.className = 'card'
    container.innerHTML = `
<h2>Organization</h2>
<div id="org-list"></div>
<hr>
<form id="org-form">
<div class="form-row"><input name="name" placeholder="Organization name" required></div>
<div class="form-row"><button type="submit">Create Organization</button></div>
</form>
`
    return container
}


export async function afterRender() {
    await loadList()
    document.getElementById('org-form').addEventListener('submit', async e => {
        e.preventDefault()
        const fd = new FormData(e.target)
        const data = Object.fromEntries(fd.entries())
        await organizationService.create(data)
        e.target.reset()
        await loadList()
    })
}


async function loadList() {
    const list = await organizationService.list()
    const container = document.getElementById('org-list')
    if (!container) return
    container.innerHTML = list.map(o => `<div>${o.id}: ${o.name}</div>`).join('')
}