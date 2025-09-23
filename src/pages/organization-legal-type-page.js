import { organizationLegalTypeService } from '../services/organization-legal-type-service.js'
import { countryService } from '../services/country-service.js'

export function render() {
    const container = document.createElement('div')
    container.className = 'card'
    container.innerHTML = `
<h2>🏢 Organization Legal Types</h2>
<div class="legal-type-controls">
    <div class="filter-controls">
        <label class="filter-toggle">
            <input type="checkbox" id="active-only-filter" checked>
            Show active only
        </label>
        <select id="country-filter" class="filter-select">
            <option value="">All Countries</option>
        </select>
        <input
            type="text"
            id="search-input"
            placeholder="Search by code, name, or abbreviation..."
            class="search-input"
        >
    </div>
    <button id="refresh-btn" class="refresh-btn">🔄 Refresh</button>
</div>

<div id="legal-type-list" class="legal-type-list"></div>

<hr>

<div class="form-section">
    <h3 id="form-title">Add New Legal Type</h3>
    <form id="legal-type-form">
        <input type="hidden" id="legal-type-id" name="id">

        <div class="form-grid">
            <div class="form-row">
                <label for="code">Code *</label>
                <input
                    name="code"
                    id="code"
                    placeholder="e.g., LLC_US, PVT_LTD_IN"
                    required
                    maxlength="20"
                    pattern="[A-Z0-9_]+"
                    title="Uppercase letters, numbers, and underscores only"
                >
                <small>Uppercase letters, numbers, and underscores (e.g., LLC_US, GMBH_DE)</small>
            </div>

            <div class="form-row">
                <label for="name">Legal Type Name *</label>
                <input
                    name="name"
                    id="name"
                    placeholder="e.g., Limited Liability Company"
                    required
                    maxlength="100"
                >
            </div>

            <div class="form-row">
                <label for="abbreviation">Abbreviation</label>
                <input
                    name="abbreviation"
                    id="abbreviation"
                    placeholder="e.g., LLC, Pvt Ltd, GmbH"
                    maxlength="20"
                >
                <small>Common abbreviation or local designation</small>
            </div>

            <div class="form-row">
                <label for="jurisdiction_country_code">Jurisdiction Country *</label>
                <select name="jurisdiction_country_code" id="jurisdiction_country_code" required>
                    <option value="">Select a country</option>
                </select>
            </div>

            <div class="form-row">
                <label for="jurisdiction_region">Jurisdiction Region</label>
                <input
                    name="jurisdiction_region"
                    id="jurisdiction_region"
                    placeholder="e.g., Delaware, Ontario, EU"
                >
                <small>State, province, or regional jurisdiction (optional)</small>
            </div>

            <div class="form-row full-width">
                <label for="description">Description</label>
                <textarea
                    name="description"
                    id="description"
                    placeholder="Detailed description of the legal entity type..."
                    rows="3"
                    maxlength="500"
                ></textarea>
                <small>Detailed explanation of the legal entity type (optional)</small>
            </div>

            <div class="form-row">
                <label class="checkbox-label">
                    <input type="checkbox" name="is_active" id="is_active" checked>
                    Active
                </label>
            </div>
        </div>

        <div class="form-actions">
            <button type="submit" id="submit-btn">Add Legal Type</button>
            <button type="button" id="cancel-btn">Cancel</button>
        </div>
    </form>
</div>

<style>
.legal-type-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    gap: 1rem;
    flex-wrap: wrap;
}

.filter-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
}

.filter-select, .search-input {
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.9rem;
}

.search-input {
    min-width: 250px;
}

.legal-type-list {
    display: grid;
    gap: 1rem;
    margin-bottom: 2rem;
}

.legal-type-item {
    background: #f9f9f9;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1rem;
    transition: all 0.2s ease;
}

.legal-type-item:hover {
    background: #f0f8ff;
    border-color: #007acc;
}

.legal-type-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
}

.legal-type-name {
    font-weight: bold;
    font-size: 1.1rem;
    color: #333;
}

.legal-type-code {
    font-family: 'Courier New', monospace;
    background: #e8f4f8;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: bold;
}

.legal-type-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.legal-type-detail {
    font-size: 0.9rem;
}

.legal-type-detail strong {
    color: #555;
}

.legal-type-description {
    font-size: 0.9rem;
    color: #666;
    font-style: italic;
    margin-top: 0.5rem;
}

.legal-type-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
}

.btn-small {
    padding: 0.3rem 0.8rem;
    font-size: 0.8rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
}

.btn-edit {
    background: #007acc;
    color: white;
}

.btn-edit:hover {
    background: #005fa3;
}

.btn-delete {
    background: #dc3545;
    color: white;
}

.btn-delete:hover {
    background: #c82333;
}

.btn-activate {
    background: #28a745;
    color: white;
}

.btn-activate:hover {
    background: #218838;
}

.status-active {
    color: #28a745;
    font-weight: bold;
}

.status-inactive {
    color: #dc3545;
    font-weight: bold;
}

.form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
}

.form-row.full-width {
    grid-column: 1 / -1;
}

.form-row {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}

.form-row label {
    font-weight: bold;
    color: #333;
}

.form-row input,
.form-row select,
.form-row textarea {
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
}

.form-row input:focus,
.form-row select:focus,
.form-row textarea:focus {
    outline: none;
    border-color: #007acc;
    box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.1);
}

.form-row small {
    color: #666;
    font-size: 0.8rem;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
}

.checkbox-label input {
    width: auto;
}

.form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
    grid-column: 1 / -1;
}

.form-actions button {
    padding: 0.7rem 1.5rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    transition: background-color 0.2s;
}

#submit-btn {
    background: #007acc;
    color: white;
}

#submit-btn:hover {
    background: #005fa3;
}

#cancel-btn {
    background: #6c757d;
    color: white;
}

#cancel-btn:hover {
    background: #545b62;
}

.refresh-btn {
    background: #28a745;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background-color 0.2s;
}

.refresh-btn:hover {
    background: #218838;
}

.empty-state {
    text-align: center;
    padding: 2rem;
    color: #666;
    font-style: italic;
}

@media (max-width: 768px) {
    .legal-type-controls {
        flex-direction: column;
        align-items: stretch;
    }

    .filter-controls {
        flex-direction: column;
        align-items: stretch;
    }

    .search-input {
        min-width: auto;
    }

    .form-grid {
        grid-template-columns: 1fr;
    }

    .legal-type-header {
        flex-direction: column;
        gap: 0.5rem;
    }

    .legal-type-details {
        grid-template-columns: 1fr;
    }
}
</style>
`
    return container
}

export async function afterRender() {
    let allLegalTypes = []
    let allCountries = []
    let filteredLegalTypes = []
    let isEditing = false
    let editingId = null

    // Get DOM elements
    const legalTypesList = document.getElementById('legal-type-list')
    const form = document.getElementById('legal-type-form')
    const formTitle = document.getElementById('form-title')
    const submitBtn = document.getElementById('submit-btn')
    const cancelBtn = document.getElementById('cancel-btn')
    const refreshBtn = document.getElementById('refresh-btn')
    const activeOnlyFilter = document.getElementById('active-only-filter')
    const countryFilter = document.getElementById('country-filter')
    const searchInput = document.getElementById('search-input')

    // Form fields
    const legalTypeIdField = document.getElementById('legal-type-id')
    const codeField = document.getElementById('code')
    const nameField = document.getElementById('name')
    const abbreviationField = document.getElementById('abbreviation')
    const jurisdictionCountryField = document.getElementById('jurisdiction_country_code')
    const jurisdictionRegionField = document.getElementById('jurisdiction_region')
    const descriptionField = document.getElementById('description')
    const isActiveField = document.getElementById('is_active')

    // Load initial data
    async function loadData() {
        try {
            const [legalTypesResponse, countriesResponse] = await Promise.all([
                organizationLegalTypeService.list(),
                countryService.list(true) // active countries only
            ])

            allLegalTypes = Array.isArray(legalTypesResponse) ? legalTypesResponse : []
            allCountries = Array.isArray(countriesResponse) ? countriesResponse : []

            populateCountrySelectors()
            filterAndDisplayLegalTypes()
        } catch (error) {
            console.error('Error loading data:', error)
            legalTypesList.innerHTML = '<div class="empty-state">❌ Error loading legal types</div>'
        }
    }

    // Populate country dropdowns
    function populateCountrySelectors() {
        // Populate country filter
        countryFilter.innerHTML = '<option value="">All Countries</option>'
        allCountries.forEach(country => {
            const option = document.createElement('option')
            option.value = country.code
            option.textContent = `${country.name} (${country.code})`
            countryFilter.appendChild(option)
        })

        // Populate jurisdiction country selector
        jurisdictionCountryField.innerHTML = '<option value="">Select a country</option>'
        allCountries.forEach(country => {
            const option = document.createElement('option')
            option.value = country.code
            option.textContent = `${country.name} (${country.code})`
            jurisdictionCountryField.appendChild(option)
        })
    }

    // Filter and display legal types
    function filterAndDisplayLegalTypes() {
        const activeOnly = activeOnlyFilter.checked
        const selectedCountry = countryFilter.value
        const searchTerm = searchInput.value.toLowerCase()

        filteredLegalTypes = allLegalTypes.filter(legalType => {
            if (activeOnly && !legalType.is_active) return false
            if (selectedCountry && legalType.jurisdiction_country_code !== selectedCountry) return false
            if (searchTerm && !matchesSearchTerm(legalType, searchTerm)) return false
            return true
        })

        displayLegalTypes(filteredLegalTypes)
    }

    // Check if legal type matches search term
    function matchesSearchTerm(legalType, searchTerm) {
        return (
            legalType.code.toLowerCase().includes(searchTerm) ||
            legalType.name.toLowerCase().includes(searchTerm) ||
            (legalType.abbreviation && legalType.abbreviation.toLowerCase().includes(searchTerm)) ||
            (legalType.description && legalType.description.toLowerCase().includes(searchTerm)) ||
            legalType.jurisdiction_country_code.toLowerCase().includes(searchTerm)
        )
    }

    // Display legal types
    function displayLegalTypes(legalTypes) {
        if (legalTypes.length === 0) {
            legalTypesList.innerHTML = '<div class="empty-state">📝 No legal types found</div>'
            return
        }

        legalTypesList.innerHTML = legalTypes.map(legalType => {
            const country = allCountries.find(c => c.code === legalType.jurisdiction_country_code)
            const countryName = country ? country.name : legalType.jurisdiction_country_code

            return `
                <div class="legal-type-item">
                    <div class="legal-type-header">
                        <div>
                            <div class="legal-type-name">${legalType.name}</div>
                            <span class="legal-type-code">${legalType.code}</span>
                        </div>
                        <span class="${legalType.is_active ? 'status-active' : 'status-inactive'}">
                            ${legalType.is_active ? '✅ Active' : '❌ Inactive'}
                        </span>
                    </div>

                    <div class="legal-type-details">
                        <div class="legal-type-detail">
                            <strong>Abbreviation:</strong> ${legalType.abbreviation || 'N/A'}
                        </div>
                        <div class="legal-type-detail">
                            <strong>Jurisdiction:</strong> ${countryName}${legalType.jurisdiction_region ? ` - ${legalType.jurisdiction_region}` : ''}
                        </div>
                    </div>

                    ${legalType.description ? `<div class="legal-type-description">${legalType.description}</div>` : ''}

                    <div class="legal-type-actions">
                        <button class="btn-small btn-edit" onclick="editLegalType('${legalType.id}')">
                            ✏️ Edit
                        </button>
                        ${legalType.is_active
                            ? `<button class="btn-small btn-delete" onclick="deleteLegalType('${legalType.id}')">🗑️ Deactivate</button>`
                            : `<button class="btn-small btn-activate" onclick="activateLegalType('${legalType.id}')">✅ Activate</button>`
                        }
                    </div>
                </div>
            `
        }).join('')
    }

    // Event listeners for filtering
    activeOnlyFilter.addEventListener('change', filterAndDisplayLegalTypes)
    countryFilter.addEventListener('change', filterAndDisplayLegalTypes)
    searchInput.addEventListener('input', filterAndDisplayLegalTypes)
    refreshBtn.addEventListener('click', loadData)

    // Form handling
    form.addEventListener('submit', async (e) => {
        e.preventDefault()

        const formData = new FormData(form)
        const legalTypeData = {
            code: formData.get('code').toUpperCase(),
            name: formData.get('name'),
            abbreviation: formData.get('abbreviation'),
            jurisdiction_country_code: formData.get('jurisdiction_country_code'),
            jurisdiction_region: formData.get('jurisdiction_region'),
            description: formData.get('description'),
            is_active: formData.has('is_active')
        }

        try {
            if (isEditing) {
                await organizationLegalTypeService.update(editingId, legalTypeData)
                console.log('Legal type updated successfully')
            } else {
                await organizationLegalTypeService.create(legalTypeData)
                console.log('Legal type created successfully')
            }

            resetForm()
            await loadData()
        } catch (error) {
            console.error('Error saving legal type:', error)
            alert(error.message || 'Error saving legal type')
        }
    })

    cancelBtn.addEventListener('click', resetForm)

    // Form management functions
    function resetForm() {
        form.reset()
        isEditing = false
        editingId = null
        formTitle.textContent = 'Add New Legal Type'
        submitBtn.textContent = 'Add Legal Type'
        legalTypeIdField.value = ''
        isActiveField.checked = true
    }

    // Global functions for button actions
    window.editLegalType = (id) => {
        const legalType = allLegalTypes.find(lt => lt.id === id)
        if (!legalType) return

        isEditing = true
        editingId = id
        formTitle.textContent = 'Edit Legal Type'
        submitBtn.textContent = 'Update Legal Type'

        legalTypeIdField.value = legalType.id
        codeField.value = legalType.code
        nameField.value = legalType.name
        abbreviationField.value = legalType.abbreviation || ''
        jurisdictionCountryField.value = legalType.jurisdiction_country_code
        jurisdictionRegionField.value = legalType.jurisdiction_region || ''
        descriptionField.value = legalType.description || ''
        isActiveField.checked = legalType.is_active

        document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' })
    }

    window.deleteLegalType = async (id) => {
        const legalType = allLegalTypes.find(lt => lt.id === id)
        if (!legalType) return

        if (confirm(`Are you sure you want to deactivate "${legalType.name}"?`)) {
            try {
                await organizationLegalTypeService.delete(id)
                console.log('Legal type deactivated successfully')
                await loadData()
            } catch (error) {
                console.error('Error deactivating legal type:', error)
                alert(error.message || 'Error deactivating legal type')
            }
        }
    }

    window.activateLegalType = async (id) => {
        const legalType = allLegalTypes.find(lt => lt.id === id)
        if (!legalType) return

        if (confirm(`Are you sure you want to activate "${legalType.name}"?`)) {
            try {
                await organizationLegalTypeService.activate(id)
                console.log('Legal type activated successfully')
                await loadData()
            } catch (error) {
                console.error('Error activating legal type:', error)
                alert(error.message || 'Error activating legal type')
            }
        }
    }

    // Load initial data
    await loadData()
}