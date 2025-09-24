// Main application entry point
import { AuthService } from './services/AuthService.js'
import { ApiService } from './services/ApiService.js'
import { WebSocketService } from './services/WebSocketService.js'
import { UIService } from './services/UIService.js'
import { EntityService } from './services/EntityService.js'
import { Router } from './utils/Router.js'
import { EventBus } from './utils/EventBus.js'

class App {
  constructor () {
    this.services = {}
    this.entities = new Map()
    this.currentUser = null
    this.currentEntity = null
    this.currentPage = null

    this.init()
  }

  async init () {
    try {
      // Initialize services
      this.services.auth = new AuthService()
      this.services.api = new ApiService()
      this.services.websocket = new WebSocketService()
      this.services.ui = new UIService()
      this.services.entity = new EntityService()

      // Initialize event bus
      this.eventBus = new EventBus()

      // Initialize router
      this.router = new Router()

      // Set up event listeners
      this.setupEventListeners()

      // Check authentication
      await this.checkAuthentication()

      // Load entities
      await this.loadEntities()

      // Initialize WebSocket if authenticated
      if (this.currentUser) {
        await this.services.websocket.connect(this.services.auth.getToken())
      }

      // Initialize router
      this.router.init()

      // Show initial page
      this.showInitialPage()

      console.log('Application initialized successfully')
    } catch (error) {
      console.error('Failed to initialize application:', error)
      this.services.ui.showError('Failed to initialize application')
    }
  }

  setupEventListeners () {
    // Authentication events
    this.eventBus.on('auth:login', (user) => {
      this.handleLogin(user)
    })

    this.eventBus.on('auth:logout', () => {
      this.handleLogout()
    })

    // Entity events
    this.eventBus.on('entity:loaded', (entities) => {
      this.buildNavigation()
    })

    // WebSocket events
    this.eventBus.on('websocket:connected', () => {
      this.updateConnectionStatus('connected')
    })

    this.eventBus.on('websocket:disconnected', () => {
      this.updateConnectionStatus('disconnected')
    })

    this.eventBus.on('websocket:error', (error) => {
      console.error('WebSocket error:', error)
      this.updateConnectionStatus('disconnected')
    })

    // UI events
    document.addEventListener('click', this.handleGlobalClick.bind(this))
    document.addEventListener('submit', this.handleGlobalSubmit.bind(this))

    // Navigation events
    document.addEventListener('DOMContentLoaded', () => {
      this.setupNavigation()
    })

    // Logout button
    const logoutBtn = document.getElementById('logout-btn')
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault()
        this.services.auth.logout()
      })
    }

    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn')
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.refreshCurrentPage()
      })
    }

    // Add entity button
    const addEntityBtn = document.getElementById('add-entity-btn')
    if (addEntityBtn) {
      addEntityBtn.addEventListener('click', () => {
        if (this.currentEntity) {
          this.services.entity.showCreateForm(this.currentEntity)
        }
      })
    }
  }

  setupNavigation () {
    // Navigation links
    document.querySelectorAll('[data-page]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault()
        const page = e.target.getAttribute('data-page') || e.target.closest('[data-page]').getAttribute('data-page')
        this.router.navigateTo(page)
      })
    })

    // Entity navigation
    document.querySelectorAll('[data-entity]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault()
        const entity = e.target.getAttribute('data-entity') || e.target.closest('[data-entity]').getAttribute('data-entity')
        this.router.navigateTo(`entity/${entity}`)
      })
    })
  }

  handleGlobalClick (e) {
    // Handle entity actions
    if (e.target.matches('[data-action]') || e.target.closest('[data-action]')) {
      e.preventDefault()
      const target = e.target.matches('[data-action]') ? e.target : e.target.closest('[data-action]')
      const action = target.getAttribute('data-action')
      const entityId = target.getAttribute('data-id')
      const entityType = target.getAttribute('data-entity')
      const methodName = target.getAttribute('data-method')

      this.handleEntityAction(action, entityType, entityId, methodName)
    }

    // Handle page navigation
    if (e.target.matches('[data-page]') || e.target.closest('[data-page]')) {
      e.preventDefault()
      const target = e.target.matches('[data-page]') ? e.target : e.target.closest('[data-page]')
      const page = target.getAttribute('data-page')
      this.router.navigateTo(page)
    }
  }

  handleGlobalSubmit (e) {
    // Handle form submissions
    if (e.target.matches('#entity-form')) {
      e.preventDefault()
      this.handleEntityForm(e.target)
    }

    if (e.target.matches('#method-form')) {
      e.preventDefault()
      this.handleMethodForm(e.target)
    }
  }

  async checkAuthentication () {
    try {
      const token = this.services.auth.getToken()
      if (token) {
        const user = await this.services.auth.getCurrentUser()
        if (user) {
          this.currentUser = user
          this.updateUIForAuthentication(true)
        }
      }
    } catch (error) {
      console.log('Not authenticated')
      this.services.auth.removeToken()
      this.updateUIForAuthentication(false)
    }
  }

  async loadEntities () {
    try {
      // For now, we'll use the static entities from our config
      // In a real implementation, this might come from an API endpoint
      const entities = [
        { name: 'User', displayName: 'Users', icon: 'fas fa-users' },
        { name: 'Order', displayName: 'Orders', icon: 'fas fa-shopping-cart' }
      ]

      entities.forEach(entity => {
        this.entities.set(entity.name, entity)
      })

      this.eventBus.emit('entity:loaded', entities)
    } catch (error) {
      console.error('Failed to load entities:', error)
    }
  }

  buildNavigation () {
    const entityNav = document.getElementById('entity-nav')
    const entitySidebar = document.getElementById('entity-sidebar')

    if (!entityNav || !entitySidebar) return

    // Clear existing navigation
    entityNav.innerHTML = ''
    entitySidebar.innerHTML = ''

    // Add dashboard link to sidebar
    entitySidebar.innerHTML = `
      <a href="#" class="list-group-item list-group-item-action" data-page="dashboard">
        <i class="fas fa-tachometer-alt me-2"></i>Dashboard
      </a>
    `

    // Build navigation from entities
    this.entities.forEach(entity => {
      // Add to main navigation
      const navItem = document.createElement('li')
      navItem.className = 'nav-item'
      navItem.innerHTML = `
        <a class="nav-link" href="#" data-entity="${entity.name}">
          <i class="${entity.icon || 'fas fa-cube'} me-1"></i>
          ${entity.displayName}
        </a>
      `
      entityNav.appendChild(navItem)

      // Add to sidebar
      const sidebarItem = document.createElement('a')
      sidebarItem.className = 'list-group-item list-group-item-action'
      sidebarItem.setAttribute('data-entity', entity.name)
      sidebarItem.href = '#'
      sidebarItem.innerHTML = `
        <i class="${entity.icon || 'fas fa-cube'} me-2"></i>
        ${entity.displayName}
      `
      entitySidebar.appendChild(sidebarItem)
    })

    // Re-setup navigation event listeners
    this.setupNavigation()
  }

  handleLogin (user) {
    this.currentUser = user
    this.updateUIForAuthentication(true)
    this.services.websocket.connect(this.services.auth.getToken())
    this.router.navigateTo('dashboard')
    this.services.ui.showSuccess(`Welcome back, ${user.firstName}!`)
  }

  handleLogout () {
    this.currentUser = null
    this.updateUIForAuthentication(false)
    this.services.websocket.disconnect()
    this.router.navigateTo('login')
    this.services.ui.showInfo('You have been logged out')
  }

  updateUIForAuthentication (isAuthenticated) {
    const userMenu = document.getElementById('user-menu')
    const loginLink = document.getElementById('login-link')
    const userName = document.getElementById('user-name')

    if (isAuthenticated && this.currentUser) {
      userMenu.style.display = 'block'
      loginLink.style.display = 'none'
      userName.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`
    } else {
      userMenu.style.display = 'none'
      loginLink.style.display = 'block'
    }
  }

  updateConnectionStatus (status) {
    const connectionStatus = document.getElementById('connection-status')
    if (!connectionStatus) return

    connectionStatus.className = `text-muted ${status}`

    const statusText = {
      connecting: 'Connecting...',
      connected: 'Connected',
      disconnected: 'Disconnected'
    }

    connectionStatus.innerHTML = `
      <i class="fas fa-circle"></i>
      <small>${statusText[status] || 'Unknown'}</small>
    `
  }

  async handleEntityAction (action, entityType, entityId, methodName) {
    try {
      switch (action) {
        case 'view':
          this.router.navigateTo(`entity/${entityType}/${entityId}`)
          break

        case 'edit':
          this.services.entity.showEditForm(entityType, entityId)
          break

        case 'delete':
          await this.services.entity.confirmDelete(entityType, entityId)
          break

        case 'method':
          await this.services.entity.executeMethod(entityType, entityId, methodName)
          break

        default:
          console.warn('Unknown action:', action)
      }
    } catch (error) {
      console.error('Failed to handle entity action:', error)
      this.services.ui.showError('Failed to perform action')
    }
  }

  async handleEntityForm (form) {
    try {
      const formData = new FormData(form)
      const data = Object.fromEntries(formData.entries())
      const entityType = form.getAttribute('data-entity')
      const entityId = form.getAttribute('data-id')

      if (entityId) {
        await this.services.entity.updateEntity(entityType, entityId, data)
      } else {
        await this.services.entity.createEntity(entityType, data)
      }

      // Close modal and refresh
      const modal = bootstrap.Modal.getInstance(form.closest('.modal'))
      modal?.hide()
      this.refreshCurrentPage()
    } catch (error) {
      console.error('Failed to save entity:', error)
      this.services.ui.showError('Failed to save entity')
    }
  }

  async handleMethodForm (form) {
    try {
      const formData = new FormData(form)
      const data = Object.fromEntries(formData.entries())
      const entityType = form.getAttribute('data-entity')
      const entityId = form.getAttribute('data-id')
      const methodName = form.getAttribute('data-method')

      await this.services.entity.executeMethod(entityType, entityId, methodName, data)

      // Close modal and refresh
      const modal = bootstrap.Modal.getInstance(form.closest('.modal'))
      modal?.hide()
      this.refreshCurrentPage()
    } catch (error) {
      console.error('Failed to execute method:', error)
      this.services.ui.showError('Failed to execute method')
    }
  }

  showInitialPage () {
    const hash = window.location.hash.slice(1)
    if (hash) {
      this.router.navigateTo(hash)
    } else if (this.currentUser) {
      this.router.navigateTo('dashboard')
    } else {
      this.router.navigateTo('login')
    }
  }

  refreshCurrentPage () {
    if (this.currentPage) {
      this.router.navigateTo(this.currentPage, { replace: true })
    }
  }

  setCurrentPage (page) {
    this.currentPage = page
  }

  setCurrentEntity (entity) {
    this.currentEntity = entity

    // Update active navigation
    document.querySelectorAll('#entity-sidebar .list-group-item').forEach(item => {
      item.classList.remove('active')
    })

    const activeLink = document.querySelector(`[data-entity="${entity}"]`)
    if (activeLink && activeLink.closest('#entity-sidebar')) {
      activeLink.classList.add('active')
    }
  }
}

// Initialize the application
window.app = new App()

// Export for global access
export default window.app