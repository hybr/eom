# Entity-based Frontend (Vite + Vanilla JS)


This project is a template for building an entity-based frontend where each entity has its own page and module. It uses Vite for bundling, Jest for unit testing, and WebSocket for realtime updates.


## Key ideas
- `src/pages/*-page.js` — pages for entities (Person, Organization)
- `src/services/*-service.js` — thin wrappers that call the backend API
- `src/ws-client.js` — shared WebSocket client
- client-side router maps `/entity/:name` to modules


## To add a new entity
1. Create `src/pages/<entity>-page.js` with `render()` and `afterRender()` exported
2. Create `src/services/<entity>-service.js` for API calls
3. Add route to `src/router.js`
4. Add unit tests under `tests/<entity>.test.js`


npm init -y
npm install vite jest @babel/preset-env babel-jest --save-dev