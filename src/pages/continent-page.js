import { continentService } from '../services/continent-service.js'

export function render() {
    const container = document.createElement('div')
    container.className = 'card'
    container.innerHTML = `
<h2>🌍 Continents</h2>
<div class="continent-controls">
    <label class="filter-toggle">
        <input type="checkbox" id="active-only-filter" checked>
        Show active only
    </label>
    <button id="refresh-btn" class="refresh-btn">🔄 Refresh</button>
</div>

<div id="continent-list" class="continent-list"></div>

<hr>

<div class="form-section">
    <h3 id="form-title">Add New Continent</h3>
    <form id="continent-form">
        <input type="hidden" id="continent-id" name="id">

        <div class="form-row">
            <label for="code">Code *</label>
            <input
                name="code"
                id="code"
                placeholder="e.g., AF, AS, EU"
                required
                maxlength="3"
                pattern="[A-Z]{2,3}"
                title="2-3 uppercase letters"
            >
            <small>2-3 uppercase letters (e.g., AF, AS, EU)</small>
        </div>

        <div class="form-row">
            <label for="name">Name *</label>
            <input name="name" id="name" placeholder="e.g., Africa, Asia, Europe" required>
        </div>

        <div class="form-row">
            <label for="description">Description</label>
            <textarea
                name="description"
                id="description"
                placeholder="Optional description..."
                rows="3"
            ></textarea>
        </div>

        <div class="form-row">
            <label class="checkbox-label">
                <input type="checkbox" name="is_active" id="is_active" checked>
                Active
            </label>
        </div>

        <div class="form-actions">
            <button type="submit" id="submit-btn">Add Continent</button>
            <button type="button" id="cancel-btn" style="display: none;">Cancel</button>
        </div>
    </form>
</div>
`

    // Add continent-specific styling
    const style = document.createElement('style')
    style.textContent = `
        .continent-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding: 12px;
            background: #f8fafc;
            border-radius: 8px;
        }

        .filter-toggle {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
        }

        .refresh-btn {
            background: var(--accent);
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
        }

        .continent-list {
            display: grid;
            gap: 12px;
            margin-bottom: 24px;
        }

        .continent-item {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            background: white;
            transition: box-shadow 0.2s;
        }

        .continent-item:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .continent-item.inactive {
            background: #f8f9fa;
            opacity: 0.7;
        }

        .continent-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
        }

        .continent-code {
            background: var(--accent);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 12px;
        }

        .continent-code.inactive {
            background: #6b7280;
        }

        .continent-name {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin: 0;
        }

        .continent-description {
            color: #6b7280;
            font-size: 14px;
            margin: 8px 0;
            line-height: 1.4;
        }

        .continent-meta {
            font-size: 12px;
            color: #9ca3af;
            margin-top: 12px;
        }

        .continent-actions {
            display: flex;
            gap: 8px;
            margin-top: 12px;
        }

        .action-btn {
            padding: 4px 8px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
        }

        .edit-btn {
            background: #f59e0b;
            color: white;
        }

        .delete-btn {
            background: #ef4444;
            color: white;
        }

        .activate-btn {
            background: #10b981;
            color: white;
        }

        .form-section {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
        }

        .form-section h3 {
            margin-top: 0;
            color: var(--accent);
        }

        .form-row {
            margin-bottom: 16px;
        }

        .form-row label {
            display: block;
            font-weight: 600;
            margin-bottom: 4px;
            color: #374151;
        }

        .form-row input, .form-row textarea {
            width: 100%;
            padding: 8px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
        }

        .form-row small {
            display: block;
            color: #6b7280;
            font-size: 12px;
            margin-top: 4px;
        }

        .checkbox-label {
            display: flex !important;
            align-items: center;
            gap: 8px;
        }

        .checkbox-label input {
            width: auto !important;
        }

        .form-actions {
            display: flex;
            gap: 12px;
        }

        .form-actions button {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
        }

        #submit-btn {
            background: var(--accent);
            color: white;
        }

        #cancel-btn {
            background: #6b7280;
            color: white;
        }

        .loading {
            text-align: center;
            padding: 20px;
            color: #6b7280;
        }

        .empty-state {
            text-align: center;
            padding: 40px;
            color: #6b7280;
        }
    `
    container.appendChild(style)

    return container
}

export async function afterRender() {
    let isEditing = false
    let editingId = null

    const form = document.getElementById('continent-form')
    const submitBtn = document.getElementById('submit-btn')
    const cancelBtn = document.getElementById('cancel-btn')
    const formTitle = document.getElementById('form-title')
    const activeOnlyFilter = document.getElementById('active-only-filter')
    const refreshBtn = document.getElementById('refresh-btn')

    // Load initial data
    await loadList()

    // Event listeners
    form.addEventListener('submit', handleSubmit)
    cancelBtn.addEventListener('click', cancelEdit)
    activeOnlyFilter.addEventListener('change', loadList)
    refreshBtn.addEventListener('click', loadList)

    // Auto-uppercase code input
    document.getElementById('code').addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase()
    })

    async function loadList() {
        const container = document.getElementById('continent-list')
        container.innerHTML = '<div class="loading">Loading continents...</div>'

        try {
            const activeOnly = activeOnlyFilter.checked
            const continents = await continentService.list(activeOnly)

            if (continents.length === 0) {
                container.innerHTML = '<div class="empty-state">No continents found</div>'
                return
            }

            container.innerHTML = continents.map(continent => `
                <div class="continent-item ${continent.is_active ? '' : 'inactive'}">
                    <div class="continent-header">
                        <div>
                            <span class="continent-code ${continent.is_active ? '' : 'inactive'}">${continent.code}</span>
                            <h3 class="continent-name">${continent.name}</h3>
                        </div>
                    </div>

                    ${continent.description ? `<div class="continent-description">${continent.description}</div>` : ''}

                    <div class="continent-meta">
                        ID: ${continent.id} •
                        Status: ${continent.is_active ? 'Active' : 'Inactive'} •
                        Created: ${new Date(continent.created_at).toLocaleDateString()} •
                        Updated: ${new Date(continent.updated_at).toLocaleDateString()}
                    </div>

                    <div class="continent-actions">
                        <button class="action-btn edit-btn" onclick="editContinent(${continent.id})">
                            ✏️ Edit
                        </button>
                        ${continent.is_active ?
                            `<button class="action-btn delete-btn" onclick="deleteContinent(${continent.id})">
                                🗑️ Delete
                            </button>` :
                            `<button class="action-btn activate-btn" onclick="activateContinent(${continent.id})">
                                ✅ Activate
                            </button>`
                        }
                    </div>
                </div>
            `).join('')

        } catch (error) {
            container.innerHTML = `<div style="color: red; text-align: center;">Error loading continents: ${error.message}</div>`
        }
    }

    async function handleSubmit(e) {
        e.preventDefault()

        const formData = new FormData(form)
        const data = {
            code: formData.get('code'),
            name: formData.get('name'),
            description: formData.get('description') || null,
            is_active: formData.get('is_active') === 'on'
        }

        try {
            submitBtn.disabled = true
            submitBtn.textContent = isEditing ? 'Updating...' : 'Adding...'

            if (isEditing) {
                await continentService.update(editingId, data)
                alert('Continent updated successfully!')
            } else {
                await continentService.create(data)
                alert('Continent created successfully!')
            }

            form.reset()
            document.getElementById('is_active').checked = true
            cancelEdit()
            await loadList()

        } catch (error) {
            alert(`Error: ${error.message}`)
        } finally {
            submitBtn.disabled = false
            submitBtn.textContent = isEditing ? 'Update Continent' : 'Add Continent'
        }
    }

    function cancelEdit() {
        isEditing = false
        editingId = null
        formTitle.textContent = 'Add New Continent'
        submitBtn.textContent = 'Add Continent'
        cancelBtn.style.display = 'none'
        form.reset()
        document.getElementById('is_active').checked = true
    }

    // Global functions for button onclick handlers
    window.editContinent = async (id) => {
        try {
            const continent = await continentService.get(id)
            if (!continent) {
                alert('Continent not found')
                return
            }

            isEditing = true
            editingId = id
            formTitle.textContent = 'Edit Continent'
            submitBtn.textContent = 'Update Continent'
            cancelBtn.style.display = 'inline-block'

            // Populate form
            document.getElementById('code').value = continent.code
            document.getElementById('name').value = continent.name
            document.getElementById('description').value = continent.description || ''
            document.getElementById('is_active').checked = continent.is_active

            // Scroll to form
            document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' })

        } catch (error) {
            alert(`Error loading continent: ${error.message}`)
        }
    }

    window.deleteContinent = async (id) => {
        if (!confirm('Are you sure you want to deactivate this continent?')) return

        try {
            await continentService.delete(id)
            alert('Continent deactivated successfully!')
            await loadList()
        } catch (error) {
            alert(`Error: ${error.message}`)
        }
    }

    window.activateContinent = async (id) => {
        try {
            await continentService.activate(id)
            alert('Continent activated successfully!')
            await loadList()
        } catch (error) {
            alert(`Error: ${error.message}`)
        }
    }
}