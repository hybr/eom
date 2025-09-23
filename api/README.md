# EOM API Server

Express.js + SQLite backend API for the Entity-based Frontend.

## Setup

```bash
cd api
npm install
npm start
```

## Development

```bash
npm run dev  # Auto-restart on file changes
```

## API Endpoints

### Persons
- `GET /api/persons` - List all persons
- `POST /api/persons` - Create new person
  - Body: `{ "first_name": "John", "last_name": "Doe" }`

### Organizations
- `GET /api/organizations` - List all organizations
- `POST /api/organizations` - Create new organization
  - Body: `{ "name": "Acme Corp" }`

### Health Check
- `GET /api/health` - Server status

## WebSocket

Connect to `ws://localhost:3000/ws` for real-time updates.

### Message Types
- `welcome` - Connection established
- `person_created` - New person added
- `organization_created` - New organization added

## Database

SQLite database automatically created at `api/database.sqlite` with:
- `persons` table (id, first_name, last_name, created_at, updated_at)
- `organizations` table (id, name, created_at, updated_at)