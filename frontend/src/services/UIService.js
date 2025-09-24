export class UIService {
  constructor () {
    this.toastContainer = document.getElementById('toast-container')
    this.loadingSpinner = document.getElementById('loading-spinner')
    this.toastCounter = 0
  }

  showToast (message, type = 'info', duration = 5000) {
    if (!this.toastContainer) return

    const toastId = `toast-${++this.toastCounter}`
    const toastElement = document.createElement('div')
    toastElement.id = toastId
    toastElement.className = `toast align-items-center text-white bg-${type} border-0`
    toastElement.setAttribute('role', 'alert')
    toastElement.setAttribute('aria-live', 'assertive')
    toastElement.setAttribute('aria-atomic', 'true')

    const iconMap = {
      success: 'fas fa-check-circle',
      danger: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    }

    toastElement.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          <i class="${iconMap[type] || iconMap.info} me-2"></i>
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    `

    this.toastContainer.appendChild(toastElement)

    const toast = new bootstrap.Toast(toastElement, {
      delay: duration
    })

    toast.show()

    // Remove toast element after it's hidden
    toastElement.addEventListener('hidden.bs.toast', () => {
      toastElement.remove()
    })

    return toast
  }

  showSuccess (message, duration = 5000) {
    return this.showToast(message, 'success', duration)
  }

  showError (message, duration = 8000) {
    return this.showToast(message, 'danger', duration)
  }

  showWarning (message, duration = 6000) {
    return this.showToast(message, 'warning', duration)
  }

  showInfo (message, duration = 5000) {
    return this.showToast(message, 'info', duration)
  }

  showLoading (show = true) {
    if (!this.loadingSpinner) return

    if (show) {
      this.loadingSpinner.style.display = 'block'
      document.body.style.cursor = 'wait'
    } else {
      this.loadingSpinner.style.display = 'none'
      document.body.style.cursor = 'default'
    }
  }

  showConfirmDialog (message, title = 'Confirm Action') {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirmModal')
      const titleElement = modal.querySelector('.modal-title')
      const messageElement = modal.querySelector('#confirm-message')
      const confirmButton = modal.querySelector('#confirm-action')

      titleElement.textContent = title
      messageElement.textContent = message

      const bsModal = new bootstrap.Modal(modal)
      bsModal.show()

      // Handle confirm button click
      const handleConfirm = () => {
        bsModal.hide()
        resolve(true)
        cleanupListeners()
      }

      // Handle modal dismissal
      const handleDismiss = () => {
        resolve(false)
        cleanupListeners()
      }

      // Setup event listeners
      confirmButton.addEventListener('click', handleConfirm)
      modal.addEventListener('hidden.bs.modal', handleDismiss, { once: true })

      // Cleanup function
      const cleanupListeners = () => {
        confirmButton.removeEventListener('click', handleConfirm)
      }
    })
  }

  setPageContent (content) {
    const pageContent = document.getElementById('page-content')
    if (pageContent) {
      pageContent.innerHTML = content
      pageContent.classList.add('fade-in')
    }
  }

  setPageTitle (title) {
    document.title = `${title} - Entity Management System`

    // Update breadcrumb if exists
    const breadcrumb = document.querySelector('.breadcrumb-item.active')
    if (breadcrumb) {
      breadcrumb.textContent = title
    }
  }

  addBreadcrumb (items) {
    const pageContent = document.getElementById('page-content')
    if (!pageContent) return

    const breadcrumbHtml = `
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><a href="#" data-page="dashboard">Home</a></li>
          ${items.map((item, index) => {
            if (index === items.length - 1) {
              return `<li class="breadcrumb-item active" aria-current="page">${item.text}</li>`
            }
            return `<li class="breadcrumb-item"><a href="${item.href || '#'}">${item.text}</a></li>`
          }).join('')}
        </ol>
      </nav>
    `

    // Insert breadcrumb at the beginning of page content
    pageContent.insertAdjacentHTML('afterbegin', breadcrumbHtml)
  }

  showModal (modalId, title, content, size = '') {
    const modal = document.getElementById(modalId)
    if (!modal) return null

    const titleElement = modal.querySelector('.modal-title')
    const bodyElement = modal.querySelector('.modal-body')
    const dialogElement = modal.querySelector('.modal-dialog')

    if (titleElement) titleElement.textContent = title
    if (bodyElement) bodyElement.innerHTML = content

    // Set modal size
    dialogElement.className = `modal-dialog ${size}`

    const bsModal = new bootstrap.Modal(modal)
    bsModal.show()

    return bsModal
  }

  hideModal (modalId) {
    const modal = document.getElementById(modalId)
    if (modal) {
      const bsModal = bootstrap.Modal.getInstance(modal)
      if (bsModal) {
        bsModal.hide()
      }
    }
  }

  updateElementContent (selector, content) {
    const element = document.querySelector(selector)
    if (element) {
      element.innerHTML = content
    }
  }

  toggleElementVisibility (selector, show) {
    const element = document.querySelector(selector)
    if (element) {
      element.style.display = show ? 'block' : 'none'
    }
  }

  addElementClass (selector, className) {
    const element = document.querySelector(selector)
    if (element) {
      element.classList.add(className)
    }
  }

  removeElementClass (selector, className) {
    const element = document.querySelector(selector)
    if (element) {
      element.classList.remove(className)
    }
  }

  setElementAttribute (selector, attribute, value) {
    const element = document.querySelector(selector)
    if (element) {
      element.setAttribute(attribute, value)
    }
  }

  createElement (tag, attributes = {}, content = '') {
    const element = document.createElement(tag)

    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value
      } else if (key === 'innerHTML') {
        element.innerHTML = value
      } else {
        element.setAttribute(key, value)
      }
    })

    if (content) {
      element.textContent = content
    }

    return element
  }

  formatDate (dateString, options = {}) {
    if (!dateString) return '-'

    const date = new Date(dateString)
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }

    return date.toLocaleDateString('en-US', { ...defaultOptions, ...options })
  }

  formatCurrency (amount, currency = 'USD') {
    if (amount == null) return '-'

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  formatNumber (number, options = {}) {
    if (number == null) return '-'

    return new Intl.NumberFormat('en-US', options).format(number)
  }

  createStatusBadge (status) {
    const statusClass = `status-${status.toLowerCase()}`
    return `<span class="badge ${statusClass}">${status}</span>`
  }

  createActionButton (action, config = {}) {
    const {
      text = action,
      icon = 'fas fa-cog',
      class: btnClass = 'btn-primary',
      size = 'btn-sm',
      attributes = {}
    } = config

    const attributeString = Object.entries(attributes)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ')

    return `
      <button class="btn ${btnClass} ${size}" ${attributeString}>
        <i class="${icon} me-1"></i>
        ${text}
      </button>
    `
  }

  debounce (func, wait) {
    let timeout
    return function executedFunction (...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  throttle (func, limit) {
    let inThrottle
    return function executedFunction (...args) {
      if (!inThrottle) {
        func.apply(this, args)
        inThrottle = true
        setTimeout(() => { inThrottle = false }, limit)
      }
    }
  }
}