import { router } from './router.js'
import { initWebSocket } from './ws-client.js'
import './services/user-state.js' // Initialize user state management


// Initialize app
const app = document.getElementById('app')


// simple client-side navigation interception
function onLinkClick(e) {
    const a = e.target.closest('a[data-link]')
    if (!a) return
    e.preventDefault()
    history.pushState(null, '', a.getAttribute('href'))
    router(app)
}


document.addEventListener('click', onLinkClick)
window.addEventListener('popstate', () => router(app))


// Start websocket (shared across entities)
initWebSocket({ onMessage: msg => console.log('WS Message', msg) })


// initial route render
router(app)