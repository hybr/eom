import { EventBus } from './EventBus.js'

export class Router {
  constructor () {
    this.routes = new Map()
    this.currentRoute = null
    this.eventBus = new EventBus()

    // Define routes
    this.defineRoutes()

    // Listen for browser navigation
    window.addEventListener('popstate', this.handlePopState.bind(this))
  }

  defineRoutes () {
    this.routes.set('', this.showDashboard.bind(this))
    this.routes.set('dashboard', this.showDashboard.bind(this))
    this.routes.set('login', this.showLogin.bind(this))
    this.routes.set('register', this.showRegister.bind(this))
    this.routes.set('profile', this.showProfile.bind(this))
    this.routes.set('entity/:type', this.showEntityList.bind(this))
    this.routes.set('entity/:type/:id', this.showEntityDetail.bind(this))
  }

  init () {
    // Initial route handling
    this.handleRoute()
  }

  navigateTo (path, options = {}) {
    if (options.replace) {
      window.history.replaceState({}, '', `#${path}`)
    } else {
      window.history.pushState({}, '', `#${path}`)
    }

    this.handleRoute()
  }

  handlePopState () {
    this.handleRoute()
  }

  handleRoute () {
    const hash = window.location.hash.slice(1) || 'dashboard'
    const [route, ...params] = hash.split('/')

    // Set current route in app
    if (window.app) {
      window.app.setCurrentPage(hash)
    }

    // Find and execute route handler
    const handler = this.findRouteHandler(hash)
    if (handler) {
      handler(params)
    } else {
      this.showNotFound()
    }
  }

  findRouteHandler (path) {
    // Exact match first
    if (this.routes.has(path)) {
      return this.routes.get(path)
    }

    // Pattern matching for parameterized routes
    for (const [pattern, handler] of this.routes.entries()) {
      if (pattern.includes(':')) {
        const match = this.matchRoute(pattern, path)
        if (match) {
          return (params) => handler(match.params)
        }
      }
    }

    return null
  }

  matchRoute (pattern, path) {
    const patternParts = pattern.split('/')
    const pathParts = path.split('/')

    if (patternParts.length !== pathParts.length) {
      return null
    }

    const params = {}
    let match = true

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i]
      const pathPart = pathParts[i]

      if (patternPart.startsWith(':')) {
        // Parameter
        const paramName = patternPart.slice(1)
        params[paramName] = pathPart
      } else if (patternPart !== pathPart) {
        // Exact match required
        match = false
        break
      }
    }

    return match ? { params } : null
  }

  async showDashboard () {
    const pageContent = document.getElementById('page-content')
    if (!pageContent) return

    // Check authentication
    if (!window.app?.currentUser) {
      this.navigateTo('login')
      return
    }

    try {
      const dashboardHtml = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h1>Dashboard</h1>
          <small class="text-muted">Welcome back, ${window.app.currentUser.firstName}!</small>
        </div>

        <div class="row">
          <div class="col-md-6 col-lg-3 mb-4">
            <div class="card dashboard-card h-100">
              <div class="card-body text-center">
                <i class="fas fa-users fa-3x text-primary mb-3"></i>
                <h5 class="card-title">Users</h5>
                <p class="card-text dashboard-stat" id="users-count">-</p>
                <a href="#entity/user" class="btn btn-primary btn-sm">Manage Users</a>
              </div>
            </div>
          </div>

          <div class="col-md-6 col-lg-3 mb-4">
            <div class="card dashboard-card h-100">
              <div class="card-body text-center">
                <i class="fas fa-shopping-cart fa-3x text-success mb-3"></i>
                <h5 class="card-title">Orders</h5>
                <p class="card-text dashboard-stat" id="orders-count">-</p>
                <a href="#entity/order" class="btn btn-success btn-sm">Manage Orders</a>
              </div>
            </div>
          </div>

          <div class="col-md-6 col-lg-3 mb-4">
            <div class="card dashboard-card h-100">
              <div class="card-body text-center">
                <i class="fas fa-chart-line fa-3x text-info mb-3"></i>
                <h5 class="card-title">Analytics</h5>
                <p class="card-text">View reports and insights</p>
                <button class="btn btn-info btn-sm" disabled>Coming Soon</button>
              </div>
            </div>
          </div>

          <div class="col-md-6 col-lg-3 mb-4">
            <div class="card dashboard-card h-100">
              <div class="card-body text-center">
                <i class="fas fa-cog fa-3x text-warning mb-3"></i>
                <h5 class="card-title">Settings</h5>
                <p class="card-text">System configuration</p>
                <button class="btn btn-warning btn-sm" disabled>Coming Soon</button>
              </div>
            </div>
          </div>
        </div>

        <div class="row mt-4">
          <div class="col-12">
            <div class="card">
              <div class="card-header">
                <h5 class="mb-0">Recent Activity</h5>
              </div>
              <div class="card-body">
                <div class="text-center text-muted py-4">
                  <i class="fas fa-clock fa-2x mb-2"></i>
                  <p>Recent activity will appear here</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `

      pageContent.innerHTML = dashboardHtml

      // Load dashboard stats
      this.loadDashboardStats()

    } catch (error) {
      console.error('Failed to show dashboard:', error)
      pageContent.innerHTML = '<div class="alert alert-danger">Failed to load dashboard</div>'
    }
  }

  async loadDashboardStats () {
    try {
      // Load user count
      const userResponse = await window.app.services.api.getEntities('user', { limit: 1 })
      const usersCount = document.getElementById('users-count')
      if (usersCount && userResponse.pagination) {
        usersCount.textContent = userResponse.pagination.total
      }

      // Load order count
      const orderResponse = await window.app.services.api.getEntities('order', { limit: 1 })
      const ordersCount = document.getElementById('orders-count')
      if (ordersCount && orderResponse.pagination) {
        ordersCount.textContent = orderResponse.pagination.total
      }
    } catch (error) {
      console.error('Failed to load dashboard stats:', error)
    }
  }

  showLogin () {
    const pageContent = document.getElementById('page-content')
    if (!pageContent) return

    const loginHtml = `
      <div class="row justify-content-center">
        <div class="col-md-6 col-lg-4">
          <div class="card">
            <div class="card-header text-center">
              <h4>Login</h4>
            </div>
            <div class="card-body">
              <form id="login-form">
                <div class="mb-3">
                  <label for="email" class="form-label">Email or Username</label>
                  <input type="text" class="form-control" id="email" name="email" required>
                </div>
                <div class="mb-3">
                  <label for="password" class="form-label">Password</label>
                  <input type="password" class="form-control" id="password" name="password" required>
                </div>
                <div class="d-grid">
                  <button type="submit" class="btn btn-primary">Login</button>
                </div>
              </form>
            </div>
            <div class="card-footer text-center">
              <small>
                Don't have an account?
                <a href="#register" class="text-decoration-none">Register here</a>
              </small>
            </div>
          </div>
        </div>
      </div>
    `

    pageContent.innerHTML = loginHtml

    // Handle form submission
    const loginForm = document.getElementById('login-form')
    loginForm.addEventListener('submit', this.handleLogin.bind(this))
  }

  showRegister () {
    const pageContent = document.getElementById('page-content')
    if (!pageContent) return

    const registerHtml = `
      <div class="row justify-content-center">
        <div class="col-md-8 col-lg-6">
          <div class="card">
            <div class="card-header text-center">
              <h4>Register</h4>
            </div>
            <div class="card-body">
              <form id="register-form">
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label for="firstName" class="form-label">First Name</label>
                    <input type="text" class="form-control" id="firstName" name="firstName" required>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label for="lastName" class="form-label">Last Name</label>
                    <input type="text" class="form-control" id="lastName" name="lastName" required>
                  </div>
                </div>
                <div class="mb-3">
                  <label for="username" class="form-label">Username</label>
                  <input type="text" class="form-control" id="username" name="username" required>
                </div>
                <div class="mb-3">
                  <label for="email" class="form-label">Email</label>
                  <input type="email" class="form-control" id="email" name="email" required>
                </div>
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label for="password" class="form-label">Password</label>
                    <input type="password" class="form-control" id="password" name="password" required>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label for="confirmPassword" class="form-label">Confirm Password</label>
                    <input type="password" class="form-control" id="confirmPassword" name="confirmPassword" required>
                  </div>
                </div>
                <div class="d-grid">
                  <button type="submit" class="btn btn-primary">Register</button>
                </div>
              </form>
            </div>
            <div class="card-footer text-center">
              <small>
                Already have an account?
                <a href="#login" class="text-decoration-none">Login here</a>
              </small>
            </div>
          </div>
        </div>
      </div>
    `

    pageContent.innerHTML = registerHtml

    // Handle form submission
    const registerForm = document.getElementById('register-form')
    registerForm.addEventListener('submit', this.handleRegister.bind(this))
  }

  async showEntityList (params) {
    const entityType = params.type
    if (!entityType || !window.app) return

    window.app.setCurrentEntity(entityType)

    try {
      const entityConfig = await window.app.services.entity.loadEntityConfig(entityType)
      const entitiesData = await window.app.services.entity.getEntities(entityType)

      const pageContent = document.getElementById('page-content')
      if (!pageContent) return

      const entityHtml = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h1>${entityConfig.displayName}</h1>
          <button class="btn btn-primary" id="create-${entityType.toLowerCase()}-btn">
            <i class="fas fa-plus me-2"></i>Create ${entityConfig.displayName}
          </button>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="row align-items-center">
              <div class="col-md-6">
                <h5 class="mb-0">${entityConfig.displayName} List</h5>
              </div>
              <div class="col-md-6">
                <div class="input-group">
                  <input type="text" class="form-control" placeholder="Search..." id="search-input">
                  <button class="btn btn-outline-secondary" type="button" id="search-btn">
                    <i class="fas fa-search"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="card-body p-0">
            ${window.app.services.entity.generateEntityTable(entityConfig, entitiesData.data)}
          </div>
        </div>
      `

      pageContent.innerHTML = entityHtml

      // Setup event listeners
      const createBtn = document.getElementById(`create-${entityType.toLowerCase()}-btn`)
      if (createBtn) {
        createBtn.addEventListener('click', () => {
          window.app.services.entity.showCreateForm(entityType)
        })
      }

      // Subscribe to real-time updates
      if (window.app.services.websocket.isConnected()) {
        window.app.services.websocket.subscribeToEntity(entityType)
      }

    } catch (error) {
      console.error('Failed to show entity list:', error)
      const pageContent = document.getElementById('page-content')
      pageContent.innerHTML = '<div class="alert alert-danger">Failed to load entity data</div>'
    }
  }

  async showEntityDetail (params) {
    const entityType = params.type
    const entityId = params.id

    if (!entityType || !entityId || !window.app) return

    try {
      const [entityConfig, entityData] = await Promise.all([
        window.app.services.entity.loadEntityConfig(entityType),
        window.app.services.entity.getEntity(entityType, entityId)
      ])

      const pageContent = document.getElementById('page-content')
      if (!pageContent) return

      const detailHtml = `
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb">
            <li class="breadcrumb-item"><a href="#dashboard">Home</a></li>
            <li class="breadcrumb-item"><a href="#entity/${entityType.toLowerCase()}">${entityConfig.displayName}</a></li>
            <li class="breadcrumb-item active">Details</li>
          </ol>
        </nav>

        <div class="d-flex justify-content-between align-items-center mb-4">
          <h1>${entityConfig.displayName} Details</h1>
          <div class="btn-group">
            <button class="btn btn-secondary" data-action="edit" data-entity="${entityType}" data-id="${entityId}">
              <i class="fas fa-edit me-2"></i>Edit
            </button>
            <button class="btn btn-danger" data-action="delete" data-entity="${entityType}" data-id="${entityId}">
              <i class="fas fa-trash me-2"></i>Delete
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            ${this.generateEntityDetailView(entityConfig, entityData)}
          </div>
        </div>
      `

      pageContent.innerHTML = detailHtml

      // Subscribe to real-time updates for this specific record
      if (window.app.services.websocket.isConnected()) {
        window.app.services.websocket.subscribeToRecord(entityType, entityId)
      }

    } catch (error) {
      console.error('Failed to show entity detail:', error)
      const pageContent = document.getElementById('page-content')
      pageContent.innerHTML = '<div class="alert alert-danger">Failed to load entity details</div>'
    }
  }

  generateEntityDetailView (entityConfig, data) {
    const sections = entityConfig.ui?.detailView?.sections || [
      { title: 'Information', fields: Object.keys(entityConfig.attributes) }
    ]

    let detailHtml = ''

    sections.forEach(section => {
      detailHtml += `
        <h5 class="border-bottom pb-2 mb-3">${section.title}</h5>
        <div class="row mb-4">
      `

      section.fields.forEach(fieldName => {
        const attrConfig = entityConfig.attributes[fieldName]
        if (!attrConfig || attrConfig.ui?.hidden) return

        const displayName = attrConfig.displayName || fieldName
        const value = window.app.services.entity.formatCellValue(data[fieldName], attrConfig)

        detailHtml += `
          <div class="col-md-6 mb-2">
            <strong>${displayName}:</strong>
            <span class="ms-2">${value}</span>
          </div>
        `
      })

      detailHtml += '</div>'
    })

    return detailHtml
  }

  showProfile () {
    // TODO: Implement profile page
    const pageContent = document.getElementById('page-content')
    pageContent.innerHTML = '<div class="alert alert-info">Profile page coming soon...</div>'
  }

  showNotFound () {
    const pageContent = document.getElementById('page-content')
    if (!pageContent) return

    pageContent.innerHTML = `
      <div class="text-center py-5">
        <i class="fas fa-exclamation-triangle fa-5x text-warning mb-4"></i>
        <h1>Page Not Found</h1>
        <p class="lead">The page you're looking for doesn't exist.</p>
        <a href="#dashboard" class="btn btn-primary">Go to Dashboard</a>
      </div>
    `
  }

  async handleLogin (event) {
    event.preventDefault()

    const formData = new FormData(event.target)
    const credentials = {
      email: formData.get('email'),
      password: formData.get('password')
    }

    try {
      const user = await window.app.services.auth.login(credentials)
      this.navigateTo('dashboard')
    } catch (error) {
      window.app.services.ui.showError(error.message || 'Login failed')
    }
  }

  async handleRegister (event) {
    event.preventDefault()

    const formData = new FormData(event.target)
    const userData = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      username: formData.get('username'),
      email: formData.get('email'),
      password: formData.get('password')
    }

    const confirmPassword = formData.get('confirmPassword')

    if (userData.password !== confirmPassword) {
      window.app.services.ui.showError('Passwords do not match')
      return
    }

    try {
      const user = await window.app.services.auth.register(userData)
      this.navigateTo('dashboard')
    } catch (error) {
      window.app.services.ui.showError(error.message || 'Registration failed')
    }
  }
}