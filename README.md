# V4L Multi-Organization Web & Mobile App

A production-ready, multi-tenant (multi-organization) web and mobile application built with Vite, plain HTML/CSS/JavaScript (ES2022+), Capacitor for native mobile packaging, WebSocket for real-time events, and SQLite for local/dev persistence.

## 🚀 Features

### Core Functionality
- **Multi-tenant Architecture**: Support for multiple organizations with proper isolation
- **Authentication & Authorization**: JWT-based auth with role-based access control (RBAC)
- **Real-time Communication**: WebSocket integration for live notifications and updates
- **Responsive Design**: Mobile-first design that works on all devices
- **Dark/Light Theming**: Automatic OS preference detection with manual toggle
- **Offline Capability**: SQLite local storage with sync capabilities

### Entity Management
- **Person Management**: User profiles with credentials and authentication
- **Organization Management**: Multi-organization support with branding and settings
- **Member Management**: Role-based organization membership with permissions
- **Procedure Templates**: Graph-based workflow definitions with state machines
- **Project Instances**: Live workflow executions with task tracking

### Architecture
- **Entity-Component Pattern**: Clean separation of data models and UI components
- **Interaction Managers**: Business logic encapsulation with clear action patterns
- **Procedure Engine**: State machine-based workflow execution
- **Event-Driven Architecture**: WebSocket events for real-time updates

## 📁 Project Structure

```
/v4l-multi-org
├── package.json                 # Dependencies and scripts
├── vite.config.js              # Vite configuration
├── index.html                  # Main HTML entry point
├── reset-password.html         # Password reset page
├── verify-email.html           # Email verification page
├── capacitor.config.js         # Capacitor configuration (mobile)
├── src/
│   ├── main.js                 # Application entry point
│   ├── app.js                  # Main application class
│   ├── router.js               # Client-side routing
│   ├── entities/               # Data models
│   │   ├── Person.js           # Person entity with validation
│   │   ├── PersonCredential.js # Authentication credentials
│   │   ├── Organization.js     # Organization entity
│   │   ├── OrganizationMember.js # Membership with roles/permissions
│   │   └── ProcedureTemplate.js # Workflow templates
│   ├── services/               # Core services
│   │   ├── auth.js             # Authentication service
│   │   ├── db.js               # SQLite database service
│   │   └── websocket.js        # WebSocket client service
│   ├── ui/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── AuthComponent.js # Authentication forms
│   │   │   ├── TopNav.js       # Top navigation bar
│   │   │   ├── BottomNav.js    # Bottom navigation (mobile)
│   │   │   └── ThemeManager.js # Theme switching logic
│   │   ├── pages/              # Page components
│   │   │   └── Dashboard.js    # Main dashboard page
│   │   └── styles/             # CSS stylesheets
│   │       ├── variables.css   # CSS custom properties
│   │       ├── main.css        # Base styles
│   │       ├── components.css  # Component styles
│   │       ├── responsive.css  # Responsive design
│   │       └── auth.css        # Authentication styles
│   └── tests/                  # Unit tests (Jest)
├── server/                     # WebSocket server
│   └── index.js                # Express + WebSocket server
└── public/                     # Static assets
    └── assets/                 # Images, icons, etc.
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- For mobile development: Android Studio and/or Xcode

### Development Setup

1. **Clone and Install Dependencies**
   ```bash
   cd v4l-multi-org
   npm install
   ```

2. **Start Development Environment**
   ```bash
   # Start both web dev server and WebSocket server
   npm run dev

   # Or start individually:
   npm run server:dev  # WebSocket server on port 3001
   npx vite            # Web dev server on port 3000
   ```

3. **Access the Application**
   - Web: http://localhost:3000
   - WebSocket server info: http://localhost:3001/health

### Mobile Development Setup

1. **Install Capacitor CLI**
   ```bash
   npm install -g @capacitor/cli
   ```

2. **Initialize Capacitor**
   ```bash
   npx cap init
   ```

3. **Add Mobile Platforms**
   ```bash
   npx cap add android
   npx cap add ios
   ```

4. **Build and Sync**
   ```bash
   npm run cap:build  # Build web app and sync to mobile
   ```

5. **Open in IDE**
   ```bash
   npm run cap:open android  # Android Studio
   npm run cap:open ios      # Xcode
   ```

### Optional Development Tools

For a complete development environment, you can add testing and linting:

```bash
# Add testing dependencies
npm install --save-dev jest @babel/core @babel/preset-env babel-jest jest-environment-jsdom

# Add linting dependencies
npm install --save-dev eslint

# Add Capacitor for mobile development
npm install --save-dev @capacitor/cli @capacitor/core @capacitor/android @capacitor/ios
```

## 🏗️ Architecture Overview

### Entity System

The application uses a class-based entity system where each entity represents a data model with:

- **Schema Definition**: Database table structure with columns, indexes, and foreign keys
- **Validation**: Built-in validation methods for data integrity
- **JSON Serialization**: Methods for converting to/from JSON for storage and API
- **Business Logic**: Domain-specific methods (e.g., `getFullName()`, `hasPermission()`)

Example Entity:
```javascript
// src/entities/Person.js
export default class Person {
    constructor({ first_name, last_name, primary_email_address, ... }) {
        // Initialize properties
    }

    static schema() {
        return {
            table: 'persons',
            columns: { /* column definitions */ },
            indexes: [ /* index definitions */ ]
        };
    }

    validate() {
        // Return array of validation errors
    }

    getFullName() {
        return `${this.first_name} ${this.last_name}`;
    }
}
```

### Database Layer

SQLite-based persistence with:

- **Migrations**: Versioned database schema changes
- **Generic CRUD**: Common database operations for all entities
- **Entity-specific Methods**: Custom queries for complex operations
- **Local Storage**: Browser localStorage for web, native SQLite for mobile

```javascript
// Usage example
const db = new DatabaseService();
await db.init();

const person = new Person({ first_name: 'John', last_name: 'Doe' });
await db.createPerson(person);
```

### Authentication & Authorization

JWT-based authentication with:

- **Sign Up/Sign In**: Email/password authentication
- **Password Management**: Secure hashing, reset tokens, account locking
- **RBAC**: Role-based permissions at organization level
- **Session Management**: Persistent sessions with token validation

Roles and Permissions:
```javascript
const roles = {
    CREATOR: 'creator',     // Organization creator (all permissions)
    ADMIN: 'admin',         // Full organization management
    MANAGER: 'manager',     // Project and team management
    WORKER: 'worker',       // Task execution
    VIEWER: 'viewer'        // Read-only access
};
```

### Real-time Communication

WebSocket integration for:

- **Live Notifications**: Instant updates for organization members
- **Workflow Events**: Real-time procedure and task status updates
- **Chat/Messaging**: Communication between team members
- **Presence**: Online/offline status tracking

```javascript
// WebSocket usage
const ws = new WebSocketService();
await ws.connect(authToken);

ws.subscribe(`org:${organizationId}`);
ws.on('workflow:nodeCompleted', (event) => {
    // Handle workflow event
});
```

### UI Architecture

Component-based UI with:

- **Routing**: Client-side routing with parameter support
- **Theming**: CSS custom properties with dark/light mode
- **Responsive Design**: Mobile-first approach with breakpoints
- **Event-driven Updates**: Components listen to application events

```javascript
// Page component example
export default class Dashboard {
    async render(container) {
        container.innerHTML = this.getHTML();
        this.setupEventListeners();
    }
}
```

## 🔧 Configuration

### Environment Variables

Create `.env` file for configuration:

```env
# WebSocket server
WS_PORT=3001
WS_HOST=localhost

# Database
DB_NAME=v4l_multi_org.db

# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h

# Development
NODE_ENV=development
```

### Capacitor Configuration

```javascript
// capacitor.config.js
export default {
    appId: 'com.v4l.multiorg',
    appName: 'V4L Multi-Org',
    webDir: 'dist',
    bundledWebRuntime: false,
    plugins: {
        CapacitorSQLite: {
            iosIsEncryption: false,
            iosKeychainPrefix: 'v4l-multiorg',
            androidIsEncryption: false,
        }
    }
};
```

## 📚 API Documentation

### Authentication Endpoints

The authentication service provides these methods:

```javascript
// Sign up new user
const result = await auth.signUp({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'SecurePass123',
    organizationName: 'My Company' // Optional
});

// Sign in existing user
const result = await auth.signIn({
    email: 'john@example.com',
    password: 'SecurePass123'
});

// Password management
await auth.forgotPassword('john@example.com');
await auth.resetPassword(token, newPassword);
await auth.changePassword(currentPassword, newPassword);
```

### Database API

Generic CRUD operations:

```javascript
// Create
await db.create('persons', personData);

// Read
const person = await db.findById('persons', personId);
const persons = await db.findMany('persons', { organization_id: orgId });

// Update
await db.update('persons', personId, updates);

// Delete
await db.delete('persons', personId);

// Custom queries
const results = await db.query('SELECT * FROM persons WHERE email = ?', [email]);
```

### WebSocket Events

#### Client to Server:
- `subscribe` - Subscribe to topic
- `unsubscribe` - Unsubscribe from topic
- `notification` - Send notification
- `chat:message` - Send chat message
- `workflow:*` - Workflow events

#### Server to Client:
- `notification` - Receive notification
- `workflow:nodeStarted` - Workflow node started
- `workflow:nodeCompleted` - Workflow node completed
- `workflow:instanceStarted` - New workflow instance
- `chat:message` - New chat message

## 🧪 Testing

### Unit Tests

Tests are written using Jest and cover:

- **Entity Validation**: Test entity validation rules
- **Database Operations**: Test CRUD operations
- **Authentication**: Test auth flows and security
- **Business Logic**: Test interaction managers and procedures

Example test:
```javascript
// src/tests/entities/Person.test.js
import Person from '../entities/Person.js';

describe('Person Entity', () => {
    test('should validate required fields', () => {
        const person = new Person({});
        const errors = person.validate();

        expect(errors).toContain('First name is required');
        expect(errors).toContain('Last name is required');
    });

    test('should generate full name correctly', () => {
        const person = new Person({
            first_name: 'John',
            last_name: 'Doe'
        });

        expect(person.getFullName()).toBe('John Doe');
    });
});
```

### Test Setup

```bash
# Run all tests
npm test

# Run specific test file
npm test Person.test.js

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm test -- --coverage
```

## 📱 Mobile Development

### Building for Mobile

1. **Build web assets**:
   ```bash
   npm run build
   ```

2. **Sync to mobile platforms**:
   ```bash
   npx cap sync
   ```

3. **Open in native IDE**:
   ```bash
   npx cap open android
   npx cap open ios
   ```

### Mobile-specific Features

- **SQLite Integration**: Native SQLite database via Capacitor plugin
- **Push Notifications**: Via Capacitor push notification plugin
- **Camera/File Access**: Device capabilities through Capacitor
- **App Store Distribution**: Build signed APK/IPA for stores

### Platform Considerations

**Android:**
- Minimum SDK: 24 (Android 7.0)
- Target SDK: Latest stable
- Required permissions: Internet, Camera (optional)

**iOS:**
- Minimum iOS: 13.0
- Required capabilities: Network access
- App Store compliance: Follows iOS design guidelines

## 🚀 Deployment

### Web Deployment

1. **Build production assets**:
   ```bash
   npm run build
   ```

2. **Deploy to hosting service** (Netlify, Vercel, etc.):
   ```bash
   # Example for Netlify
   netlify deploy --prod --dir=dist
   ```

### Server Deployment

1. **Prepare server**:
   ```bash
   # Install dependencies
   npm ci --production

   # Set environment variables
   export NODE_ENV=production
   export PORT=3001
   ```

2. **Start server**:
   ```bash
   npm run server:prod
   ```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

EXPOSE 3000 3001
CMD ["npm", "start"]
```

## 🔐 Security Considerations

### Authentication Security
- Passwords hashed with salt
- JWT tokens with expiration
- Account lockout after failed attempts
- Secure password reset flows

### Data Security
- Input validation on all entities
- SQL injection prevention with parameterized queries
- XSS prevention with proper escaping
- CSRF protection with proper headers

### Authorization
- Role-based access control (RBAC)
- Organization-level data isolation
- Permission checks on all operations
- Secure WebSocket authentication

## 🏗️ Extending the Application

### Adding New Entities

1. Create entity class in `src/entities/`
2. Add schema definition with tables and indexes
3. Add database migration for new tables
4. Create UI components for entity management

### Adding New Pages

1. Create page component in `src/ui/pages/`
2. Add route in `src/router.js`
3. Update navigation components if needed

### Adding New Features

1. Define interaction patterns in interaction managers
2. Add necessary database schema changes
3. Implement UI components
4. Add WebSocket events if real-time updates needed
5. Write tests for new functionality

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For questions and support:
- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the test files for usage examples

---

**Built with ❤️ for modern web and mobile development**