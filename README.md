# Entity-Oriented Microservices (EOM)

A complete entity-based website framework that auto-generates CRUD operations, forms, and APIs from JSON configurations.

## 🚀 Features

- ✅ **Declarative Entity Definition** - Define entities with JSON/YAML configurations
- ✅ **Auto-Generated CRUD APIs** - REST endpoints created automatically
- ✅ **Dynamic Frontend Forms** - UI forms generated from entity schemas
- ✅ **Custom Method Actions** - Define custom behaviors (activate, approve, etc.)
- ✅ **Real-time Updates** - WebSocket integration for live data
- ✅ **Role-Based Access Control** - Fine-grained permissions per entity/action
- ✅ **Data Validation** - Frontend and backend validation from schema
- ✅ **Relationship Support** - 1:1, 1:N, N:M relationships
- ✅ **Database Migrations** - Auto-generated from entity configurations
- ✅ **Responsive UI** - Bootstrap-based responsive design

## 🏗️ Architecture

```
├── entities/           # JSON entity definitions
├── src/
│   ├── gateway/       # API gateway and routing
│   ├── services/      # Entity services and business logic
│   └── shared/        # Shared utilities (auth, db, validation)
├── frontend/          # Frontend SPA application
├── migrations/        # Database migration files
└── scripts/           # Utility scripts
```

## 🚀 Quick Start

### 1. Installation
```bash
git clone <repository>
cd eom
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Database Setup
```bash
# Create initial migrations (users table)
node scripts/migrate.js --init

# Generate migrations from entities
node scripts/migrate.js --generate

# Run migrations
npm run migrate

# Seed sample data
npm run seed
```

### 4. Start Development
```bash
# Start both backend and frontend
npm run dev

# Or start individually:
npm run dev:backend  # Backend on port 3000
npm run dev:frontend # Frontend on port 5173
```

## 📝 Entity Configuration

Entities are defined as JSON files in the `entities/` directory:

```json
{
  "name": "Product",
  "displayName": "Product",
  "description": "Product catalog entity",
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "displayName": "Product Name",
      "ui": { "widget": "text" }
    },
    "price": {
      "type": "number",
      "required": true,
      "min": 0,
      "displayName": "Price"
    },
    "status": {
      "type": "string",
      "enum": ["active", "inactive"],
      "default": "active"
    }
  },
  "methods": {
    "activate": {
      "action": "custom",
      "displayName": "Activate Product",
      "permissions": ["admin", "manager"],
      "ui": {
        "button": {
          "text": "Activate",
          "class": "btn-success",
          "icon": "fas fa-check"
        }
      }
    }
  },
  "permissions": {
    "create": ["admin", "manager"],
    "read": ["admin", "manager", "user"],
    "update": ["admin", "manager"],
    "delete": ["admin"]
  }
}
```

## 🔧 Usage

### Creating New Entities

1. **Define the entity** in `entities/EntityName.json`
2. **Generate migration**: `node scripts/generate-entity.js EntityName`
3. **Run migration**: `npm run migrate`
4. **Restart server** - Routes are auto-discovered

### API Endpoints

Each entity automatically gets:

```
GET    /api/entitys          # List all
GET    /api/entitys/:id      # Get by ID
POST   /api/entitys          # Create new
PUT    /api/entitys/:id      # Update
DELETE /api/entitys/:id      # Delete
POST   /api/entitys/:id/action/:method  # Custom methods
```

### Authentication

```bash
# Register new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@example.com","password":"password123","firstName":"John","lastName":"Doe"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```

### Frontend

The frontend automatically:
- Discovers entities from the backend
- Generates list/detail/form views
- Creates action buttons for methods
- Handles real-time updates via WebSocket

Visit http://localhost:5173 after starting the dev server.

## 📊 Default Credentials

```
Admin User:
- Email: admin@example.com
- Password: admin123

Manager User:
- Email: manager@example.com
- Password: password123

Regular User:
- Email: user1@example.com
- Password: password123
```

## 🗄️ Database

- **Development**: SQLite database in `data/eom.db`
- **Migrations**: Knex.js-based migration system
- **Seeding**: Automatic sample data generation

## 🔒 Security

- JWT-based authentication
- Role-based authorization
- CORS protection
- Request rate limiting
- Input validation and sanitization

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 🐳 Deployment

```bash
# Build for production
npm run build

# Docker deployment
npm run docker:build
npm run docker:up

# Manual deployment
NODE_ENV=production npm start
```

## 📚 Entity Schema Reference

### Attribute Types
- `string`, `email`, `url` - Text fields
- `number`, `integer` - Numeric fields
- `boolean` - True/false values
- `date`, `datetime` - Date/time fields
- `text` - Large text areas
- `json` - JSON objects

### UI Widgets
- `text`, `email`, `url`, `password`
- `textarea` - Multi-line text
- `select` - Dropdown (with enum values)
- `checkbox`, `radio` - Boolean/choice inputs
- `date`, `datetime` - Date pickers

### Method Actions
- `create`, `update`, `delete` - Standard CRUD
- `custom` - Custom business logic

### Relationship Types
- `oneToOne` - 1:1 relationship
- `oneToMany` - 1:N relationship
- `manyToOne` - N:1 relationship
- `manyToMany` - N:M relationship (with junction table)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ using Node.js, Express, SQLite, Bootstrap, and WebSockets**