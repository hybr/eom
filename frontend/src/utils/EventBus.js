export class EventBus {
  constructor () {
    this.events = new Map()
  }

  on (event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }

    this.events.get(event).add(callback)
  }

  off (event, callback) {
    if (this.events.has(event)) {
      this.events.get(event).delete(callback)

      // Clean up empty event sets
      if (this.events.get(event).size === 0) {
        this.events.delete(event)
      }
    }
  }

  emit (event, data = null) {
    if (this.events.has(event)) {
      this.events.get(event).forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in event callback for ${event}:`, error)
        }
      })
    }
  }

  once (event, callback) {
    const onceCallback = (data) => {
      callback(data)
      this.off(event, onceCallback)
    }

    this.on(event, onceCallback)
  }

  clear (event = null) {
    if (event) {
      this.events.delete(event)
    } else {
      this.events.clear()
    }
  }

  listEvents () {
    return Array.from(this.events.keys())
  }

  getListeners (event) {
    return this.events.has(event) ? Array.from(this.events.get(event)) : []
  }
}