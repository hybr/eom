export class ApiService {
  constructor () {
    this.baseURL = '/api'
  }

  // Helper method to properly pluralize entity names
  pluralize(entityType) {
    const name = entityType.toLowerCase()

    // Handle irregular plurals
    const irregulars = {
      'country': 'countries'
    }

    if (irregulars[name]) {
      return irregulars[name]
    }

    // Handle regular pluralization rules
    if (name.endsWith('y')) {
      return name.slice(0, -1) + 'ies'
    }

    // Default: just add 's'
    return name + 's'
  }

  async request (endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const token = localStorage.getItem('token')

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body)
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }))
        throw new Error(error.message || `HTTP ${response.status}`)
      }

      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        return await response.json()
      }

      return await response.text()
    } catch (error) {
      console.error('API Request failed:', error)
      throw error
    }
  }

  async get (endpoint, params = {}) {
    const searchParams = new URLSearchParams(params)
    const url = searchParams.toString() ? `${endpoint}?${searchParams}` : endpoint
    return this.request(url, { method: 'GET' })
  }

  async post (endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: data
    })
  }

  async put (endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data
    })
  }

  async patch (endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: data
    })
  }

  async delete (endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    })
  }

  // Entity-specific methods
  async getEntities (entityType, params = {}) {
    return this.get(`/${this.pluralize(entityType)}`, params)
  }

  async getEntity (entityType, id) {
    return this.get(`/${this.pluralize(entityType)}/${id}`)
  }

  async createEntity (entityType, data) {
    return this.post(`/${this.pluralize(entityType)}`, data)
  }

  async updateEntity (entityType, id, data) {
    return this.put(`/${this.pluralize(entityType)}/${id}`, data)
  }

  async deleteEntity (entityType, id) {
    return this.delete(`/${this.pluralize(entityType)}/${id}`)
  }

  async executeMethod (entityType, id, method, params = {}) {
    return this.post(`/${this.pluralize(entityType)}/${id}/action/${method}`, params)
  }

  // Authentication methods
  async login (credentials) {
    return this.post('/auth/login', credentials)
  }

  async register (userData) {
    return this.post('/auth/register', userData)
  }

  async logout () {
    return this.post('/auth/logout')
  }

  async getCurrentUser () {
    return this.get('/auth/me')
  }

  async updateProfile (data) {
    return this.patch('/auth/me', data)
  }

  async changePassword (data) {
    return this.patch('/auth/change-password', data)
  }

  async refreshToken (refreshToken) {
    return this.post('/auth/refresh', { refreshToken })
  }
}