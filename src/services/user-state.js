import { authService } from './auth-service.js'

class UserStateManager {
    constructor() {
        this.isInitialized = false
        this.setupAuthListener()
    }

    setupAuthListener() {
        authService.onAuthChange((user) => {
            this.updateNavigation(user)
            this.updatePageAccess(user)
        })
    }

    updateNavigation(user) {
        const nav = document.querySelector('nav')
        if (!nav) return

        // Get current navigation links
        const existingLinks = Array.from(nav.children)

        if (user) {
            // User is signed in - show authenticated navigation
            this.showAuthenticatedNav(nav, user, existingLinks)
        } else {
            // User is not signed in - show public navigation
            this.showPublicNav(nav, existingLinks)
        }
    }

    showAuthenticatedNav(nav, user, existingLinks) {
        // Remove sign in/sign up links if they exist
        const signInLink = nav.querySelector('a[href="/signin"]')
        const signUpLink = nav.querySelector('a[href="/signup"]')

        if (signInLink) signInLink.remove()
        if (signUpLink) signUpLink.remove()

        // Add user menu if it doesn't exist
        let userMenu = nav.querySelector('.user-menu')
        if (!userMenu) {
            userMenu = this.createUserMenu(user)
            nav.appendChild(userMenu)
        } else {
            // Update existing user menu
            this.updateUserMenu(userMenu, user)
        }
    }

    showPublicNav(nav, existingLinks) {
        // Remove user menu if it exists
        const userMenu = nav.querySelector('.user-menu')
        if (userMenu) userMenu.remove()

        // Add sign in/sign up links if they don't exist
        const signInLink = nav.querySelector('a[href="/signin"]')
        const signUpLink = nav.querySelector('a[href="/signup"]')

        if (!signInLink) {
            const signInEl = document.createElement('a')
            signInEl.href = '/signin'
            signInEl.textContent = 'Sign In'
            signInEl.setAttribute('data-link', '')
            nav.insertBefore(signInEl, nav.children[2]) // After Sign Up
        }

        if (!signUpLink) {
            const signUpEl = document.createElement('a')
            signUpEl.href = '/signup'
            signUpEl.textContent = 'Sign Up'
            signUpEl.setAttribute('data-link', '')
            nav.insertBefore(signUpEl, nav.children[1]) // After Home
        }
    }

    createUserMenu(user) {
        const userMenu = document.createElement('div')
        userMenu.className = 'user-menu'

        userMenu.innerHTML = `
            <div class="user-info">
                <span class="user-name">${user.full_name || user.username}</span>
                <div class="user-dropdown">
                    <button class="user-menu-toggle" aria-label="User menu">
                        <span class="user-avatar">${this.getInitials(user.full_name || user.username)}</span>
                        <span class="dropdown-arrow">▼</span>
                    </button>
                    <div class="user-dropdown-content">
                        <div class="user-details">
                            <div class="user-full-name">${user.full_name || user.username}</div>
                            <div class="user-email">${user.email || 'No email'}</div>
                        </div>
                        <div class="dropdown-divider"></div>
                        <a href="/profile" data-link>Profile</a>
                        <a href="/settings" data-link>Settings</a>
                        ${user.must_change_password ? '<a href="/change-password" data-link class="urgent">Change Password</a>' : ''}
                        <div class="dropdown-divider"></div>
                        <button class="signout-btn">Sign Out</button>
                    </div>
                </div>
            </div>
        `

        // Add user menu styles
        const style = document.createElement('style')
        style.textContent = `
            .user-menu { position: relative; margin-left: auto; }
            .user-info { display: flex; align-items: center; }
            .user-name { margin-right: 8px; font-weight: 600; color: var(--accent); }
            .user-menu-toggle { background: none; border: none; cursor: pointer; display: flex; align-items: center; padding: 6px; border-radius: 6px; transition: background-color 0.2s; }
            .user-menu-toggle:hover { background-color: #f3f4f6; }
            .user-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 12px; margin-right: 6px; }
            .dropdown-arrow { font-size: 10px; color: #666; transition: transform 0.2s; }
            .user-dropdown.open .dropdown-arrow { transform: rotate(180deg); }
            .user-dropdown-content { position: absolute; right: 0; top: 100%; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); min-width: 200px; z-index: 1000; opacity: 0; visibility: hidden; transform: translateY(-8px); transition: all 0.2s; }
            .user-dropdown.open .user-dropdown-content { opacity: 1; visibility: visible; transform: translateY(0); }
            .user-details { padding: 12px; background: #f8fafc; border-radius: 8px 8px 0 0; }
            .user-full-name { font-weight: 600; color: #1f2937; }
            .user-email { font-size: 12px; color: #6b7280; margin-top: 2px; }
            .dropdown-divider { height: 1px; background: #e5e7eb; margin: 4px 0; }
            .user-dropdown-content a, .user-dropdown-content button { display: block; width: 100%; text-align: left; padding: 8px 12px; color: #374151; text-decoration: none; background: none; border: none; cursor: pointer; transition: background-color 0.2s; }
            .user-dropdown-content a:hover, .user-dropdown-content button:hover { background-color: #f3f4f6; }
            .user-dropdown-content a.urgent { color: #dc2626; font-weight: 600; }
            .signout-btn { color: #dc2626 !important; font-weight: 600; }
        `

        if (!document.querySelector('style[data-user-menu]')) {
            style.setAttribute('data-user-menu', 'true')
            document.head.appendChild(style)
        }

        // Setup dropdown functionality
        const toggle = userMenu.querySelector('.user-menu-toggle')
        const dropdown = userMenu.querySelector('.user-dropdown')
        const signoutBtn = userMenu.querySelector('.signout-btn')

        toggle.addEventListener('click', (e) => {
            e.stopPropagation()
            dropdown.classList.toggle('open')
        })

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            dropdown.classList.remove('open')
        })

        // Handle sign out
        signoutBtn.addEventListener('click', async () => {
            await authService.signOut()
            window.location.href = '/'
        })

        return userMenu
    }

    updateUserMenu(userMenu, user) {
        const userName = userMenu.querySelector('.user-name')
        const userFullName = userMenu.querySelector('.user-full-name')
        const userEmail = userMenu.querySelector('.user-email')
        const userAvatar = userMenu.querySelector('.user-avatar')

        if (userName) userName.textContent = user.full_name || user.username
        if (userFullName) userFullName.textContent = user.full_name || user.username
        if (userEmail) userEmail.textContent = user.email || 'No email'
        if (userAvatar) userAvatar.textContent = this.getInitials(user.full_name || user.username)
    }

    updatePageAccess(user) {
        // Add authentication checks for protected pages
        const currentPath = window.location.pathname

        const protectedPaths = ['/profile', '/settings', '/change-password']
        const authPaths = ['/signin', '/signup']

        if (protectedPaths.some(path => currentPath.startsWith(path)) && !user) {
            // Redirect to sign in if accessing protected page without auth
            window.location.href = '/signin'
        } else if (authPaths.some(path => currentPath.startsWith(path)) && user) {
            // Redirect authenticated users away from auth pages
            window.location.href = '/'
        }
    }

    getInitials(name) {
        if (!name) return '?'
        return name.split(' ')
            .map(part => part.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('')
    }

    // Initialize on page load
    async initialize() {
        if (this.isInitialized) return

        // Check authentication status
        await authService.checkAuth()
        this.isInitialized = true
    }
}

// Create singleton instance
export const userState = new UserStateManager()

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => userState.initialize())
} else {
    userState.initialize()
}