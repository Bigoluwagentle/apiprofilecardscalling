# Profiles API — HNGi14 Stage 2

A demographic intelligence query engine. Stores inferred profiles and exposes advanced filtering, sorting, pagination, and natural language search.

---

## Tech Stack

- **Node.js** (v18+) + **Express**
- **SQLite** via `better-sqlite3`

---

## Setup

```bash
npm install
npm start
```

Default port is `3000`. Set `PORT` env variable to override.

---

## Seeding the Database

Place `profiles.json` in the project root, then run:

```bash
npm run seed
```

Re-running seed is safe — existing names are skipped (`INSERT OR IGNORE`).

---

## Endpoints

### GET `/api/profiles`

Returns profiles with filtering, sorting, and pagination.

**Filters (all optional, all combinable):**

| Parameter | Type | Example |
|---|---|---|
| `gender` | string | `male` / `female` |
| `age_group` | string | `child` / `teenager` / `adult` / `senior` |
| `country_id` | string | `NG`, `KE` |
| `min_age` | number | `25` |
| `max_age` | number | `40` |
| `min_gender_probability` | float | `0.8` |
| `min_country_probability` | float | `0.5` |

**Sorting:**
- `sort_by`: `age` | `created_at` | `gender_probability` (default: `created_at`)
- `order`: `asc` | `desc` (default: `asc`)

**Pagination:**
- `page`: default `1`
- `limit`: default `10`, max `50`

**Example:**
```
/api/profiles?gender=male&country_id=NG&min_age=25&sort_by=age&order=desc&page=1&limit=10
```

**Response:**
```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 84,
  "data": [...]
}
```

---

### GET `/api/profiles/search?q=`

Natural language query endpoint.

**Example:**
```
/api/profiles/search?q=young males from nigeria
/api/profiles/search?q=female seniors above 60
/api/profiles/search?q=adults from kenya
```

Supports `page` and `limit` query params.

---

### POST `/api/profiles`

Creates a new profile by calling Genderize, Agify, and Nationalize APIs.

**Body:** `{ "name": "john" }`

Returns `201` on creation, `200` if name already exists.

---

### GET `/api/profiles/:id`

Returns a single profile by UUID.

---

### DELETE `/api/profiles/:id`

Deletes a profile. Returns `204 No Content`.

---

## Natural Language Parsing

### Approach

The parser is fully rule-based — no AI or LLMs are used. It works by scanning the lowercase query string for known keywords and patterns using regular expressions, then maps them to structured database filters.

### Supported Keywords & Mappings

**Gender:**
| Query contains | Filter |
|---|---|
| `male` (without `female`) | `gender = male` |
| `female` (without `male`) | `gender = female` |
| `male and female` / `both` | no gender filter |

**Age groups:**
| Keyword | Filter |
|---|---|
| `child`, `children`, `kids` | `age_group = child` |
| `teenager`, `teen` | `age_group = teenager` |
| `adult` | `age_group = adult` |
| `senior`, `elderly`, `old people` | `age_group = senior` |

**Special age keyword:**
| Keyword | Filter |
|---|---|
| `young` | `min_age = 16, max_age = 24` (not a stored age_group) |

**Age ranges:**
| Pattern | Filter |
|---|---|
| `above 30` / `over 30` / `older than 30` | `min_age = 30` |
| `below 25` / `under 25` / `younger than 25` | `max_age = 25` |
| `between 20 and 40` | `min_age = 20, max_age = 40` |

**Countries** (via `from` or `in` preposition):
- Supports all African countries plus common world countries
- Maps country name → ISO 2-letter code
- Examples: `nigeria → NG`, `kenya → KE`, `tanzania → TZ`, `ghana → GH`

### How The Logic Works

1. Lowercase and trim the query
2. Test gender patterns — only set gender if exactly one gender word is found
3. Test age group keywords — set `age_group` filter if matched
4. If `young` is found and no age_group was set, apply the 16–24 range
5. Test explicit age range patterns (`above`, `below`, `between`)
6. Scan for country prepositions (`from X`, `in X`), then fall back to scanning all known country names
7. If zero filters were extracted → return `"Unable to interpret query"`

---

## Limitations

- **Ambiguous gender:** queries like `"males and females"` produce no gender filter (intentional)
- **`young` is age-only:** it maps to 16–24 and does not set `age_group`. This means `"young adults"` sets both `age_group=adult` AND `min_age=16, max_age=24` which may conflict — the `age_group` keyword takes priority
- **One country per query:** only the first matched country is used
- **No negation:** `"not from nigeria"` is not supported
- **No OR logic:** `"from nigeria or ghana"` is not supported — only the first country matches
- **Spelling errors:** `"nigerria"` or `"femal"` will not match
- **Country aliases:** only common English names are supported; local names (e.g. `"Naija"`) are not
- **Age group + explicit age conflict:** if both `age_group=teenager` and `min_age=25` are parsed, both filters apply to the SQL query, which may return 0 results
- **No free-form number words:** `"thirty"` is not parsed; only digits work (`"30"`)

---

## Error Responses

```json
{ "status": "error", "message": "..." }
```

| Code | Reason |
|---|---|
| 400 | Missing or empty parameter |
| 404 | Profile not found |
| 422 | Invalid parameter type |
| 502 | External API returned invalid data |
| 500 | Internal server error |