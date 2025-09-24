import { ApiService } from './ApiService.js'
import { UIService } from './UIService.js'

export class EntityService {
  constructor () {
    this.api = new ApiService()
    this.ui = new UIService()
    this.entityConfigs = new Map()
  }

  async loadEntityConfig (entityType) {
    if (this.entityConfigs.has(entityType)) {
      return this.entityConfigs.get(entityType)
    }

    try {
      // For now, we'll use static configs. In a real app, this might come from an API
      const configs = {
        User: {
          name: 'User',
          displayName: 'User',
          attributes: {
            id: { type: 'integer', displayName: 'ID', ui: { hidden: true } },
            username: { type: 'string', displayName: 'Username' },
            email: { type: 'email', displayName: 'Email' },
            firstName: { type: 'string', displayName: 'First Name' },
            lastName: { type: 'string', displayName: 'Last Name' },
            role: { type: 'string', displayName: 'Role', enum: ['admin', 'manager', 'user'] },
            status: { type: 'string', displayName: 'Status', enum: ['active', 'inactive', 'suspended'] },
            lastLogin: { type: 'datetime', displayName: 'Last Login', ui: { readonly: true } },
            createdAt: { type: 'datetime', displayName: 'Created At', ui: { readonly: true, hidden: true } }
          },
          methods: {
            activate: {
              displayName: 'Activate',
              ui: { button: { text: 'Activate', class: 'btn-success', icon: 'fas fa-check' } }
            },
            suspend: {
              displayName: 'Suspend',
              ui: { button: { text: 'Suspend', class: 'btn-warning', icon: 'fas fa-ban', confirm: true } }
            }
          },
          ui: {
            listView: {
              columns: ['id', 'username', 'email', 'firstName', 'lastName', 'role', 'status'],
              searchable: ['username', 'email', 'firstName', 'lastName']
            }
          }
        },
        Order: {
          name: 'Order',
          displayName: 'Order',
          attributes: {
            id: { type: 'integer', displayName: 'ID', ui: { hidden: true } },
            orderNumber: { type: 'string', displayName: 'Order Number' },
            status: { type: 'string', displayName: 'Status', enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] },
            total: { type: 'number', displayName: 'Total' },
            subtotal: { type: 'number', displayName: 'Subtotal' },
            tax: { type: 'number', displayName: 'Tax' },
            shipping: { type: 'number', displayName: 'Shipping' },
            orderDate: { type: 'datetime', displayName: 'Order Date' },
            createdAt: { type: 'datetime', displayName: 'Created At', ui: { readonly: true, hidden: true } }
          },
          methods: {
            process: {
              displayName: 'Process',
              ui: { button: { text: 'Process', class: 'btn-primary', icon: 'fas fa-play' } }
            },
            ship: {
              displayName: 'Ship',
              ui: { button: { text: 'Ship', class: 'btn-info', icon: 'fas fa-shipping-fast' } }
            },
            cancel: {
              displayName: 'Cancel',
              ui: { button: { text: 'Cancel', class: 'btn-danger', icon: 'fas fa-times', confirm: true } }
            }
          },
          ui: {
            listView: {
              columns: ['id', 'orderNumber', 'status', 'total', 'orderDate'],
              searchable: ['orderNumber']
            }
          }
        }
      }

      const config = configs[entityType]
      if (config) {
        this.entityConfigs.set(entityType, config)
        return config
      }

      throw new Error(`Entity config not found for ${entityType}`)
    } catch (error) {
      console.error('Failed to load entity config:', error)
      throw error
    }
  }

  async getEntities (entityType, params = {}) {
    try {
      this.ui.showLoading(true)
      const result = await this.api.getEntities(entityType, params)
      return result
    } catch (error) {
      console.error('Failed to get entities:', error)
      this.ui.showError(`Failed to load ${entityType} data`)
      throw error
    } finally {
      this.ui.showLoading(false)
    }
  }

  async getEntity (entityType, id) {
    try {
      this.ui.showLoading(true)
      const result = await this.api.getEntity(entityType, id)
      return result.data
    } catch (error) {
      console.error('Failed to get entity:', error)
      this.ui.showError(`Failed to load ${entityType}`)
      throw error
    } finally {
      this.ui.showLoading(false)
    }
  }

  async createEntity (entityType, data) {
    try {
      this.ui.showLoading(true)
      const result = await this.api.createEntity(entityType, data)
      this.ui.showSuccess(`${entityType} created successfully`)
      return result.data
    } catch (error) {
      console.error('Failed to create entity:', error)
      this.ui.showError(`Failed to create ${entityType}`)
      throw error
    } finally {
      this.ui.showLoading(false)
    }
  }

  async updateEntity (entityType, id, data) {
    try {
      this.ui.showLoading(true)
      const result = await this.api.updateEntity(entityType, id, data)
      this.ui.showSuccess(`${entityType} updated successfully`)
      return result.data
    } catch (error) {
      console.error('Failed to update entity:', error)
      this.ui.showError(`Failed to update ${entityType}`)
      throw error
    } finally {
      this.ui.showLoading(false)
    }
  }

  async deleteEntity (entityType, id) {
    try {
      this.ui.showLoading(true)
      await this.api.deleteEntity(entityType, id)
      this.ui.showSuccess(`${entityType} deleted successfully`)
    } catch (error) {
      console.error('Failed to delete entity:', error)
      this.ui.showError(`Failed to delete ${entityType}`)
      throw error
    } finally {
      this.ui.showLoading(false)
    }
  }

  async executeMethod (entityType, id, method, params = {}) {
    try {
      const entityConfig = await this.loadEntityConfig(entityType)
      const methodConfig = entityConfig.methods[method]

      if (methodConfig?.ui?.button?.confirm) {
        const confirmMessage = methodConfig.ui.button.confirmMessage ||
          `Are you sure you want to ${method} this ${entityType.toLowerCase()}?`

        const confirmed = await this.ui.showConfirmDialog(confirmMessage)
        if (!confirmed) return null
      }

      this.ui.showLoading(true)
      const result = await this.api.executeMethod(entityType, id, method, params)

      const methodName = methodConfig?.displayName || method
      this.ui.showSuccess(`${methodName} executed successfully`)

      return result.data
    } catch (error) {
      console.error('Failed to execute method:', error)
      this.ui.showError(`Failed to execute ${method}`)
      throw error
    } finally {
      this.ui.showLoading(false)
    }
  }

  async confirmDelete (entityType, id) {
    const confirmed = await this.ui.showConfirmDialog(
      `Are you sure you want to delete this ${entityType.toLowerCase()}? This action cannot be undone.`,
      'Delete Confirmation'
    )

    if (confirmed) {
      await this.deleteEntity(entityType, id)
    }

    return confirmed
  }

  async showCreateForm (entityType) {
    try {
      const entityConfig = await this.loadEntityConfig(entityType)
      const formHtml = this.generateEntityForm(entityConfig)

      const modal = this.ui.showModal(
        'formModal',
        `Create ${entityConfig.displayName}`,
        formHtml,
        'modal-lg'
      )

      const form = document.getElementById('entity-form')
      if (form) {
        form.setAttribute('data-entity', entityType)
        form.setAttribute('data-action', 'create')
      }

      return modal
    } catch (error) {
      console.error('Failed to show create form:', error)
      this.ui.showError('Failed to load form')
    }
  }

  async showEditForm (entityType, id) {
    try {
      const [entityConfig, entityData] = await Promise.all([
        this.loadEntityConfig(entityType),
        this.getEntity(entityType, id)
      ])

      const formHtml = this.generateEntityForm(entityConfig, entityData)

      const modal = this.ui.showModal(
        'formModal',
        `Edit ${entityConfig.displayName}`,
        formHtml,
        'modal-lg'
      )

      const form = document.getElementById('entity-form')
      if (form) {
        form.setAttribute('data-entity', entityType)
        form.setAttribute('data-id', id)
        form.setAttribute('data-action', 'update')
      }

      return modal
    } catch (error) {
      console.error('Failed to show edit form:', error)
      this.ui.showError('Failed to load form')
    }
  }

  generateEntityForm (entityConfig, data = {}) {
    let formHtml = ''

    const sections = entityConfig.ui?.formView?.sections || [
      { title: 'Information', fields: Object.keys(entityConfig.attributes) }
    ]

    sections.forEach(section => {
      if (section.fields.length === 0) return

      formHtml += `
        <div class="form-section">
          <h6>${section.title}</h6>
          <div class="row">
      `

      section.fields.forEach(fieldName => {
        const attrConfig = entityConfig.attributes[fieldName]
        if (!attrConfig || attrConfig.ui?.hidden) return

        const fieldHtml = this.generateFormField(fieldName, attrConfig, data[fieldName])
        formHtml += `<div class="col-md-6 mb-3">${fieldHtml}</div>`
      })

      formHtml += `
          </div>
        </div>
      `
    })

    return formHtml
  }

  generateFormField (fieldName, config, value = '') {
    const displayName = config.displayName || fieldName
    const isRequired = config.required ? 'required' : ''
    const isReadonly = config.ui?.readonly ? 'readonly' : ''
    const placeholder = config.ui?.placeholder || `Enter ${displayName.toLowerCase()}`

    let inputHtml = ''

    switch (config.ui?.widget || config.type) {
      case 'textarea':
      case 'text':
        inputHtml = `
          <textarea
            class="form-control"
            id="${fieldName}"
            name="${fieldName}"
            placeholder="${placeholder}"
            ${isRequired}
            ${isReadonly}
            rows="3"
          >${value || ''}</textarea>
        `
        break

      case 'select':
        const options = config.enum || []
        inputHtml = `
          <select
            class="form-select"
            id="${fieldName}"
            name="${fieldName}"
            ${isRequired}
            ${isReadonly}
          >
            <option value="">Select ${displayName}</option>
            ${options.map(option =>
              `<option value="${option}" ${value === option ? 'selected' : ''}>${option}</option>`
            ).join('')}
          </select>
        `
        break

      case 'checkbox':
        inputHtml = `
          <div class="form-check">
            <input
              class="form-check-input"
              type="checkbox"
              id="${fieldName}"
              name="${fieldName}"
              value="true"
              ${value ? 'checked' : ''}
              ${isReadonly}
            >
            <label class="form-check-label" for="${fieldName}">
              ${displayName}
            </label>
          </div>
        `
        break

      case 'password':
        inputHtml = `
          <input
            type="password"
            class="form-control"
            id="${fieldName}"
            name="${fieldName}"
            placeholder="${placeholder}"
            ${isRequired}
            ${isReadonly}
          >
        `
        break

      default:
        const inputType = this.getInputType(config.type)
        inputHtml = `
          <input
            type="${inputType}"
            class="form-control"
            id="${fieldName}"
            name="${fieldName}"
            placeholder="${placeholder}"
            value="${value || ''}"
            ${isRequired}
            ${isReadonly}
          >
        `
    }

    return `
      <label for="${fieldName}" class="form-label">
        ${displayName} ${config.required ? '<span class="text-danger">*</span>' : ''}
      </label>
      ${inputHtml}
    `
  }

  getInputType (type) {
    const typeMap = {
      string: 'text',
      email: 'email',
      url: 'url',
      number: 'number',
      integer: 'number',
      date: 'date',
      datetime: 'datetime-local',
      boolean: 'checkbox'
    }

    return typeMap[type] || 'text'
  }

  generateEntityTable (entityConfig, data, actions = true) {
    const columns = entityConfig.ui?.listView?.columns || Object.keys(entityConfig.attributes)
    const visibleColumns = columns.filter(col => !entityConfig.attributes[col]?.ui?.hidden)

    let tableHtml = `
      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              ${visibleColumns.map(col => {
                const attr = entityConfig.attributes[col]
                return `<th>${attr?.displayName || col}</th>`
              }).join('')}
              ${actions ? '<th class="text-end">Actions</th>' : ''}
            </tr>
          </thead>
          <tbody>
    `

    data.forEach(record => {
      tableHtml += '<tr>'

      visibleColumns.forEach(col => {
        const attr = entityConfig.attributes[col]
        const value = this.formatCellValue(record[col], attr)
        tableHtml += `<td>${value}</td>`
      })

      if (actions) {
        tableHtml += `<td class="text-end">${this.generateActionButtons(entityConfig, record)}</td>`
      }

      tableHtml += '</tr>'
    })

    tableHtml += `
          </tbody>
        </table>
      </div>
    `

    return tableHtml
  }

  formatCellValue (value, config) {
    if (value == null || value === '') return '-'

    switch (config?.type) {
      case 'datetime':
      case 'date':
        return this.ui.formatDate(value)

      case 'number':
        if (config.displayName?.toLowerCase().includes('total') ||
            config.displayName?.toLowerCase().includes('price') ||
            config.displayName?.toLowerCase().includes('cost')) {
          return this.ui.formatCurrency(value)
        }
        return this.ui.formatNumber(value)

      case 'boolean':
        return value ? 'Yes' : 'No'

      case 'string':
        if (config.enum && config.displayName?.toLowerCase().includes('status')) {
          return this.ui.createStatusBadge(value)
        }
        return value

      default:
        return value
    }
  }

  generateActionButtons (entityConfig, record) {
    let buttonsHtml = `
      <div class="btn-group btn-group-sm" role="group">
        <button class="btn btn-outline-primary" data-action="view" data-entity="${entityConfig.name}" data-id="${record.id}" title="View">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn btn-outline-secondary" data-action="edit" data-entity="${entityConfig.name}" data-id="${record.id}" title="Edit">
          <i class="fas fa-edit"></i>
        </button>
    `

    // Add method buttons
    if (entityConfig.methods) {
      Object.entries(entityConfig.methods).forEach(([methodName, methodConfig]) => {
        const btnConfig = methodConfig.ui?.button || {}
        const btnClass = btnConfig.class?.replace('btn-', 'btn-outline-') || 'btn-outline-primary'
        const icon = btnConfig.icon || 'fas fa-cog'
        const text = btnConfig.text || methodName

        buttonsHtml += `
          <button
            class="btn ${btnClass}"
            data-action="method"
            data-method="${methodName}"
            data-entity="${entityConfig.name}"
            data-id="${record.id}"
            title="${text}"
          >
            <i class="${icon}"></i>
          </button>
        `
      })
    }

    buttonsHtml += `
        <button class="btn btn-outline-danger" data-action="delete" data-entity="${entityConfig.name}" data-id="${record.id}" title="Delete">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `

    return buttonsHtml
  }
}