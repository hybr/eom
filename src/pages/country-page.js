import { countryService } from '../services/country-service.js'
import { continentService } from '../services/continent-service.js'

export function render() {
    const container = document.createElement('div')
    container.className = 'card'
    container.innerHTML = `
<h2>🌍 Countries</h2>
<div class="country-controls">
    <div class="filter-controls">
        <label class="filter-toggle">
            <input type="checkbox" id="active-only-filter" checked>
            Show active only
        </label>
        <select id="continent-filter" class="filter-select">
            <option value="">All Continents</option>
        </select>
        <select id="region-filter" class="filter-select">
            <option value="">All Regions</option>
        </select>
    </div>
    <button id="refresh-btn" class="refresh-btn">🔄 Refresh</button>
</div>

<div id="country-list" class="country-list"></div>

<hr>

<div class="form-section">
    <h3 id="form-title">Add New Country</h3>
    <form id="country-form">
        <input type="hidden" id="country-id" name="id">

        <div class="form-grid">
            <div class="form-row">
                <label for="code">ISO Alpha-2 Code *</label>
                <input
                    name="code"
                    id="code"
                    placeholder="e.g., US, IN, DE"
                    required
                    maxlength="2"
                    pattern="[A-Z]{2}"
                    title="2 uppercase letters"
                >
                <small>2 uppercase letters (ISO 3166-1 alpha-2)</small>
            </div>

            <div class="form-row">
                <label for="code3">ISO Alpha-3 Code *</label>
                <input
                    name="code3"
                    id="code3"
                    placeholder="e.g., USA, IND, DEU"
                    required
                    maxlength="3"
                    pattern="[A-Z]{3}"
                    title="3 uppercase letters"
                >
                <small>3 uppercase letters (ISO 3166-1 alpha-3)</small>
            </div>

            <div class="form-row">
                <label for="numeric_code">Numeric Code *</label>
                <input
                    name="numeric_code"
                    id="numeric_code"
                    placeholder="e.g., 840, 356, 276"
                    required
                    maxlength="3"
                    pattern="\\d{3}"
                    title="3 digits"
                >
                <small>3 digits (ISO 3166-1 numeric)</small>
            </div>

            <div class="form-row">
                <label for="name">Country Name *</label>
                <input name="name" id="name" placeholder="e.g., United States, India, Germany" required>
            </div>

            <div class="form-row">
                <label for="official_name">Official Name</label>
                <input name="official_name" id="official_name" placeholder="e.g., United States of America">
            </div>

            <div class="form-row">
                <label for="capital">Capital</label>
                <input name="capital" id="capital" placeholder="e.g., Washington D.C., New Delhi, Berlin">
            </div>

            <div class="form-row">
                <label for="continent_id">Continent *</label>
                <select name="continent_id" id="continent_id" required>
                    <option value="">Select a continent</option>
                </select>
            </div>

            <div class="form-row">
                <label for="region">Region</label>
                <input name="region" id="region" placeholder="e.g., Europe, Asia, Americas">
            </div>

            <div class="form-row">
                <label for="sub_region">Sub-region</label>
                <input name="sub_region" id="sub_region" placeholder="e.g., Western Europe, South Asia">
            </div>

            <div class="form-row">
                <label for="phone_code">Phone Code</label>
                <input
                    name="phone_code"
                    id="phone_code"
                    placeholder="e.g., +1, +91, +49"
                    pattern="\\+\\d{1,4}"
                    title="Plus sign followed by 1-4 digits"
                >
                <small>International dialing code (e.g., +1, +91)</small>
            </div>
        </div>

        <div class="form-row">
            <label class="checkbox-label">
                <input type="checkbox" name="is_active" id="is_active" checked>
                Active
            </label>
        </div>

        <div class="form-actions">
            <button type="submit" id="submit-btn">Add Country</button>
            <button type="button" id="cancel-btn" style="display: none;">Cancel</button>
        </div>
    </form>
</div>
`

    // Add country-specific styling
    const style = document.createElement('style')
    style.textContent = `
        .country-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding: 12px;
            background: #f8fafc;
            border-radius: 8px;
            flex-wrap: wrap;
            gap: 12px;
        }

        .filter-controls {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        }

        .filter-toggle {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
        }

        .filter-select {
            padding: 6px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
            background: white;
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

        .country-list {
            display: grid;
            gap: 12px;
            margin-bottom: 24px;
        }

        .country-item {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            background: white;
            transition: box-shadow 0.2s;
        }

        .country-item:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .country-item.inactive {
            background: #f8f9fa;
            opacity: 0.7;
        }

        .country-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
        }

        .country-codes {
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
        }

        .country-code {
            background: var(--accent);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 12px;
        }

        .country-code.inactive {
            background: #6b7280;
        }

        .country-name {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin: 0 0 4px 0;
        }

        .country-official-name {
            font-size: 14px;
            color: #6b7280;
            font-style: italic;
            margin: 0;
        }

        .country-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
            margin: 12px 0;
            padding: 12px;
            background: #f8fafc;
            border-radius: 6px;
        }

        .country-detail {
            font-size: 14px;
        }

        .country-detail strong {
            color: #374151;
            display: block;
        }

        .country-detail span {
            color: #6b7280;
        }

        .country-meta {
            font-size: 12px;
            color: #9ca3af;
            margin-top: 12px;
        }

        .country-actions {
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

        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 16px;
            margin-bottom: 16px;
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

        .form-row input, .form-row select, .form-row textarea {
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

        @media (max-width: 768px) {
            .country-controls {
                flex-direction: column;
                align-items: stretch;
            }

            .filter-controls {
                justify-content: center;
            }

            .form-grid {
                grid-template-columns: 1fr;
            }
        }
    `
    container.appendChild(style)

    return container
}

export async function afterRender() {
    let isEditing = false
    let editingId = null
    let continents = []
    let countries = []

    const form = document.getElementById('country-form')
    const submitBtn = document.getElementById('submit-btn')
    const cancelBtn = document.getElementById('cancel-btn')
    const formTitle = document.getElementById('form-title')
    const activeOnlyFilter = document.getElementById('active-only-filter')
    const continentFilter = document.getElementById('continent-filter')
    const regionFilter = document.getElementById('region-filter')
    const refreshBtn = document.getElementById('refresh-btn')
    const continentSelect = document.getElementById('continent_id')

    // Load initial data
    await loadContinents()
    await loadList()

    // Event listeners
    form.addEventListener('submit', handleSubmit)
    cancelBtn.addEventListener('click', cancelEdit)
    activeOnlyFilter.addEventListener('change', loadList)
    continentFilter.addEventListener('change', loadList)
    regionFilter.addEventListener('change', loadList)
    refreshBtn.addEventListener('click', loadList)

    // Auto-uppercase code inputs
    document.getElementById('code').addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase()
    })
    document.getElementById('code3').addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase()
    })

    // Auto-format phone code
    document.getElementById('phone_code').addEventListener('input', (e) => {
        let value = e.target.value
        if (value && !value.startsWith('+')) {
            e.target.value = '+' + value.replace(/\D/g, '')
        }
    })

    async function loadContinents() {
        try {
            continents = await continentService.list(true) // Only active continents

            // Populate continent select in form
            continentSelect.innerHTML = '<option value="">Select a continent</option>' +
                continents.map(continent =>
                    `<option value="${continent.id}">${continent.name} (${continent.code})</option>`
                ).join('')

            // Populate continent filter
            continentFilter.innerHTML = '<option value="">All Continents</option>' +
                continents.map(continent =>
                    `<option value="${continent.id}">${continent.name}</option>`
                ).join('')

        } catch (error) {
            console.error('Error loading continents:', error)
        }
    }

    async function loadList() {
        const container = document.getElementById('country-list')
        container.innerHTML = '<div class="loading">Loading countries...</div>'

        try {
            const activeOnly = activeOnlyFilter.checked
            countries = await countryService.list(activeOnly)

            // Apply filters
            let filteredCountries = countries

            const selectedContinent = continentFilter.value
            if (selectedContinent) {
                filteredCountries = filteredCountries.filter(country =>
                    country.continent_id == selectedContinent
                )
            }

            const selectedRegion = regionFilter.value
            if (selectedRegion) {
                filteredCountries = filteredCountries.filter(country =>
                    country.region === selectedRegion
                )
            }

            // Update region filter options
            const regions = [...new Set(countries.map(c => c.region).filter(Boolean))]
            regionFilter.innerHTML = '<option value="">All Regions</option>' +
                regions.map(region =>
                    `<option value="${region}" ${region === selectedRegion ? 'selected' : ''}>${region}</option>`
                ).join('')

            if (filteredCountries.length === 0) {
                container.innerHTML = '<div class="empty-state">No countries found</div>'
                return
            }

            container.innerHTML = filteredCountries.map(country => {
                const continent = continents.find(c => c.id == country.continent_id)
                const continentName = continent ? continent.name : 'Unknown'

                return `
                    <div class="country-item ${country.is_active ? '' : 'inactive'}">
                        <div class="country-header">
                            <div>
                                <div class="country-codes">
                                    <span class="country-code ${country.is_active ? '' : 'inactive'}">${country.code}</span>
                                    <span class="country-code ${country.is_active ? '' : 'inactive'}">${country.code3}</span>
                                    <span class="country-code ${country.is_active ? '' : 'inactive'}">${country.numeric_code}</span>
                                </div>
                                <h3 class="country-name">${country.name}</h3>
                                ${country.official_name && country.official_name !== country.name ?
                                    `<p class="country-official-name">${country.official_name}</p>` : ''
                                }
                            </div>
                        </div>

                        <div class="country-details">
                            ${country.capital ? `
                                <div class="country-detail">
                                    <strong>Capital</strong>
                                    <span>${country.capital}</span>
                                </div>
                            ` : ''}
                            <div class="country-detail">
                                <strong>Continent</strong>
                                <span>${continentName}</span>
                            </div>
                            ${country.region ? `
                                <div class="country-detail">
                                    <strong>Region</strong>
                                    <span>${country.region}</span>
                                </div>
                            ` : ''}
                            ${country.sub_region ? `
                                <div class="country-detail">
                                    <strong>Sub-region</strong>
                                    <span>${country.sub_region}</span>
                                </div>
                            ` : ''}
                            ${country.phone_code ? `
                                <div class="country-detail">
                                    <strong>Phone Code</strong>
                                    <span>${country.phone_code}</span>
                                </div>
                            ` : ''}
                        </div>

                        <div class="country-meta">
                            ID: ${country.id} •
                            Status: ${country.is_active ? 'Active' : 'Inactive'} •
                            Created: ${new Date(country.created_at).toLocaleDateString()} •
                            Updated: ${new Date(country.updated_at).toLocaleDateString()}
                        </div>

                        <div class="country-actions">
                            <button class="action-btn edit-btn" onclick="editCountry(${country.id})">
                                ✏️ Edit
                            </button>
                            ${country.is_active ?
                                `<button class="action-btn delete-btn" onclick="deleteCountry(${country.id})">
                                    🗑️ Delete
                                </button>` :
                                `<button class="action-btn activate-btn" onclick="activateCountry(${country.id})">
                                    ✅ Activate
                                </button>`
                            }
                        </div>
                    </div>
                `
            }).join('')

        } catch (error) {
            container.innerHTML = `<div style="color: red; text-align: center;">Error loading countries: ${error.message}</div>`
        }
    }

    async function handleSubmit(e) {
        e.preventDefault()

        const formData = new FormData(form)
        const data = {
            code: formData.get('code'),
            code3: formData.get('code3'),
            numeric_code: formData.get('numeric_code'),
            name: formData.get('name'),
            official_name: formData.get('official_name') || null,
            capital: formData.get('capital') || null,
            continent_id: formData.get('continent_id'),
            region: formData.get('region') || null,
            sub_region: formData.get('sub_region') || null,
            phone_code: formData.get('phone_code') || null,
            is_active: formData.get('is_active') === 'on'
        }

        try {
            submitBtn.disabled = true
            submitBtn.textContent = isEditing ? 'Updating...' : 'Adding...'

            if (isEditing) {
                await countryService.update(editingId, data)
                alert('Country updated successfully!')
            } else {
                await countryService.create(data)
                alert('Country created successfully!')
            }

            form.reset()
            document.getElementById('is_active').checked = true
            cancelEdit()
            await loadList()

        } catch (error) {
            alert(`Error: ${error.message}`)
        } finally {
            submitBtn.disabled = false
            submitBtn.textContent = isEditing ? 'Update Country' : 'Add Country'
        }
    }

    function cancelEdit() {
        isEditing = false
        editingId = null
        formTitle.textContent = 'Add New Country'
        submitBtn.textContent = 'Add Country'
        cancelBtn.style.display = 'none'
        form.reset()
        document.getElementById('is_active').checked = true
    }

    // Global functions for button onclick handlers
    window.editCountry = async (id) => {
        try {
            const country = await countryService.get(id)
            if (!country) {
                alert('Country not found')
                return
            }

            isEditing = true
            editingId = id
            formTitle.textContent = 'Edit Country'
            submitBtn.textContent = 'Update Country'
            cancelBtn.style.display = 'inline-block'

            // Populate form
            document.getElementById('code').value = country.code
            document.getElementById('code3').value = country.code3
            document.getElementById('numeric_code').value = country.numeric_code
            document.getElementById('name').value = country.name
            document.getElementById('official_name').value = country.official_name || ''
            document.getElementById('capital').value = country.capital || ''
            document.getElementById('continent_id').value = country.continent_id
            document.getElementById('region').value = country.region || ''
            document.getElementById('sub_region').value = country.sub_region || ''
            document.getElementById('phone_code').value = country.phone_code || ''
            document.getElementById('is_active').checked = country.is_active

            // Scroll to form
            document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' })

        } catch (error) {
            alert(`Error loading country: ${error.message}`)
        }
    }

    window.deleteCountry = async (id) => {
        if (!confirm('Are you sure you want to deactivate this country?')) return

        try {
            await countryService.delete(id)
            alert('Country deactivated successfully!')
            await loadList()
        } catch (error) {
            alert(`Error: ${error.message}`)
        }
    }

    window.activateCountry = async (id) => {
        try {
            await countryService.activate(id)
            alert('Country activated successfully!')
            await loadList()
        } catch (error) {
            alert(`Error: ${error.message}`)
        }
    }
}