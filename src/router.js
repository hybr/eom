// Lightweight router mapping path to entity module
const routes = [
    { path: /^\/$/, component: () => import('./pages/home.js') },
    { path: /^\/signup\/?$/, component: () => import('./pages/signup-page.js') },
    { path: /^\/signin\/?$/, component: () => import('./pages/signin-page.js') },
    { path: /^\/entity\/person\/?$/, component: () => import('./pages/person-page.js') },
    { path: /^\/entity\/organization\/?$/, component: () => import('./pages/organization-page.js') },
    { path: /^\/entity\/person-credential\/?$/, component: () => import('./pages/person-credential-page.js') },
    { path: /^\/entity\/continent\/?$/, component: () => import('./pages/continent-page.js') },
    { path: /^\/entity\/country\/?$/, component: () => import('./pages/country-page.js') },
    { path: /^\/entity\/organization-legal-type\/?$/, component: () => import('./pages/organization-legal-type-page.js') }
]

export async function router(appElement) {
    const path = location.pathname
    for (const r of routes) {
        if (r.path.test(path)) {
            const mod = await r.component()
            appElement.innerHTML = ''
            appElement.appendChild(mod.render())
            if (mod.afterRender) mod.afterRender()
            return
        }
    }
    // fallback 404
    appElement.innerHTML = '<div class="card"><h2>404 - Not found</h2></div>'
}