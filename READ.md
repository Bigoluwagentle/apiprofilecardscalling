# Profiles API

HNGi14 Stage 1 Backend Assessment

Accepts a name, calls three external APIs (Genderize, Agify, Nationalize), classifies the result, stores it, and exposes endpoints to manage profiles.

---

## Tech Stack

- **Node.js** (v18+) + **Express**
- **SQLite** via `better-sqlite3` (zero-config, file-based)
- No external auth required

---

## Setup

```bash
npm install
npm start
```

The server starts on port `3000` by default. Set the `PORT` environment variable to override.

---

## Endpoints

### POST `/api/profiles`
Creates a profile for the given name. If the name already exists, returns the existing record.

**Request body:**
```json
{ "name": "ella" }
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "id": "...",
    "name": "ella",
    "gender": "female",
    "gender_probability": 0.99,
    "sample_size": 1234,
    "age": 46,
    "age_group": "adult",
    "country_id": "DK",
    "country_probability": 0.12,
    "created_at": "2026-04-15T10:00:00.000Z"
  }
}
```

**Response (200) — if name already exists:**
```json
{
  "status": "success",
  "message": "Profile already exists",
  "data": { "...existing profile..." }
}
```

---

### GET `/api/profiles`
Returns all profiles. Supports optional query filters (case-insensitive):

- `gender` — e.g. `?gender=male`
- `country_id` — e.g. `?country_id=NG`
- `age_group` — e.g. `?age_group=adult`

**Response (200):**
```json
{
  "status": "success",
  "count": 1,
  "data": [{ "...profile..." }]
}
```

---

### GET `/api/profiles/:id`
Returns a single profile by UUID.

---

### DELETE `/api/profiles/:id`
Deletes a profile. Returns `204 No Content`.

---

## Age Group Classification

| Range | Group     |
|-------|-----------|
| 0–12  | child     |
| 13–19 | teenager  |
| 20–59 | adult     |
| 60+   | senior    |

---

## Error Responses

```json
{ "status": "error", "message": "..." }
```

| Code | Reason                              |
|------|-------------------------------------|
| 400  | Missing or empty name               |
| 404  | Profile not found                   |
| 422  | Invalid type for name               |
| 502  | External API returned invalid data  |
| 500  | Internal server error               |

---

## Deploying to Railway

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Set `PORT` environment variable if needed (Railway sets it automatically)
4. Your base URL will be something like `https://yourapp.up.railway.app`
