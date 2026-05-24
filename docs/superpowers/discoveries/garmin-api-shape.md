# Garmin Connect Workout API Shape Discovery

**Status:** Best-effort from community libraries. Pending live DevTools verification (Step 2).
**Last updated:** 2026-05-24

---

## Sources Examined

| Repo | Language | Status |
|------|----------|--------|
| [mkuthan/garmin-workouts](https://github.com/mkuthan/garmin-workouts) | Python | Accessible — `garminworkouts/garmin/garminclient.py`, `garminworkouts/models/workout.py` |
| [Pythe1337N/garmin-connect](https://github.com/Pythe1337N/garmin-connect) | TypeScript | Accessible — `src/garmin/UrlClass.ts`, `src/garmin/GarminConnect.ts`, `src/garmin/workouts/templates/RunningTemplate.ts` |
| [ThomasRondof/GarminWorkoutAItoJSON](https://github.com/ThomasRondof/GarminWorkoutAItoJSON) | JavaScript | Accessible — `GarminGenJSON.html` (single-file app, most complete shape) |
| [fulippo/share-your-garmin-workout](https://github.com/fulippo/share-your-garmin-workout) | JS Chrome extension | Accessible — `share-your-workout.js` (real browser context; best source for headers) |

Note: `mkuthan/garmin-workouts` moved its package to `garminworkouts/` (not `garmin_workouts/`). The original path cited in the task plan returned 404 but the correct path was found.

---

## 1. Endpoint URL

### POST (create workout)

| Library | Endpoint |
|---------|----------|
| mkuthan/garmin-workouts | `https://connect.garmin.com/proxy/workout-service/workout` |
| Pythe1337N/garmin-connect | `https://connectapi.garmin.com/workout-service/workout` |
| ThomasRondof/GarminWorkoutAItoJSON | Not hardcoded (generates JSON only, no POST) |
| fulippo/share-your-garmin-workout | `/gc-api/workout-service/workout` (relative, from page context) |

**Conflict noted:** mkuthan uses `/proxy/workout-service/workout` (legacy path via the old `connect.garmin.com/modern/proxy` gateway), while Pythe1337N uses `https://connectapi.garmin.com/workout-service/workout` (the newer direct API domain). fulippo uses `/gc-api/workout-service/workout` which resolves to `https://connect.garmin.com/gc-api/workout-service/workout`.

**Recommendation for content-script (page context):** Use the relative path `/gc-api/workout-service/workout` as fulippo does — it runs in the same browser session and avoids CORS by staying on the same origin. Confirm during live capture.

### GET (fetch single workout)

- fulippo: `/gc-api/workout-service/workout/{id}`
- mkuthan: `{connect_url}/proxy/workout-service/workout/{id}`
- Pythe1337N: `https://connectapi.garmin.com/workout-service/workout/{id}`

### GET (list workouts)

- mkuthan: `/proxy/workout-service/workouts`
- Pythe1337N: `https://connectapi.garmin.com/workout-service/workouts`

**Sources:**
- mkuthan: [`garminworkouts/garmin/garminclient.py` lines 8, 33–38, 47–52, 60–65](https://github.com/mkuthan/garmin-workouts/blob/main/garminworkouts/garmin/garminclient.py)
- Pythe1337N: [`src/garmin/UrlClass.ts` lines 81–89](https://github.com/Pythe1337N/garmin-connect/blob/main/src/garmin/UrlClass.ts)
- fulippo: [`share-your-workout.js` — `GarminShare.getWorkoutEndpoint` and `GarminImport.addWorkoutEndpoint`](https://github.com/fulippo/share-your-garmin-workout/blob/main/share-your-workout.js)

---

## 2. HTTP Method and Required Headers

### Method
- **POST** to create a workout
- **PUT** to update an existing workout
- **DELETE** to remove a workout

### Headers — from community libraries

#### mkuthan/garmin-workouts (`garminclient.py` line 10)
```python
_REQUIRED_HEADERS = {"Referer": "https://connect.garmin.com/modern/workouts", "nk": "NT"}
```
Note: mkuthan uses lowercase `"nk"` but Garmin's own UI uses uppercase `"NK"`. The value is `"NT"` in both cases.

#### fulippo/share-your-garmin-workout (`share-your-workout.js` — `GarminImport.ajaxRequest`)
```javascript
xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
xhr.setRequestHeader("Accept", "application/json, text/javascript, */*; q=0.01");
xhr.setRequestHeader("accept-language", navigator.language || "en-US");
xhr.setRequestHeader("cache-control", "no-cache");
xhr.setRequestHeader("connect-csrf-token", csrfToken);  // from <meta name="csrf-token">
xhr.setRequestHeader("x-requested-with", "XMLHttpRequest");
xhr.withCredentials = true;
```

#### fulippo GET headers (`GarminShare.ajaxRequest`)
```javascript
xhr.setRequestHeader("accept", "*/*");
xhr.setRequestHeader("accept-language", navigator.language || "en-US");
xhr.setRequestHeader("cache-control", "no-cache");
xhr.setRequestHeader("connect-csrf-token", csrfToken);
xhr.setRequestHeader("x-requested-with", "XMLHttpRequest");
xhr.withCredentials = true;
```

### Header analysis for our content-script `fetch`

| Header | Source | Auto with `credentials: 'include'`? | Must set explicitly? |
|--------|--------|--------------------------------------|----------------------|
| `Cookie` | Browser | YES (via `credentials: 'include'`) | No |
| `Authorization` | Browser (if set by page) | Possibly, depends on page | Verify in DevTools |
| `Content-Type: application/json; charset=UTF-8` | Library | No | **YES** |
| `NK: NT` | mkuthan (also known as `nk: NT`) | No | **YES** — verify casing |
| `connect-csrf-token` | fulippo | No | **YES** — read from `<meta name="csrf-token">` on page |
| `x-requested-with: XMLHttpRequest` | fulippo | No | **YES** |
| `Referer` | mkuthan | Partially (browser sets it automatically from same-origin) | Verify; may be set automatically |
| `accept-language` | fulippo | No | Recommended |

**CSRF token acquisition:** Read from DOM before each request:
```typescript
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
```

**Note on `NK` / `nk`:** mkuthan sets `nk: NT` (lowercase). Other sources mention `NK: NT` (uppercase). The exact casing of the header name that Garmin's server requires must be confirmed during live capture (Step 2).

---

## 3. Top-Level JSON Shape

Synthesised from ThomasRondof (`GarminGenJSON.html`) and mkuthan (`workout.py`) — these are the most complete sources.

```jsonc
{
  "workoutId": null,            // null on create; Garmin assigns the ID
  "ownerId": null,              // null on create; OR user's userProfilePk (see §7)
  "workoutName": "5K Easy Run",
  "description": "Easy aerobic run",
  "sportType": {
    "sportTypeId": 1,
    "sportTypeKey": "running",
    "displayOrder": 1
  },
  "subSportType": "GENERIC",    // ThomasRondof includes this; mkuthan omits it
  "trainingPlanId": null,
  "workoutSegments": [
    {
      "segmentOrder": 1,
      "sportType": {
        "sportTypeId": 1,
        "sportTypeKey": "running",
        "displayOrder": 1
      },
      "poolLengthUnit": null,
      "poolLength": null,
      "avgTrainingSpeed": null,
      "estimatedDurationInSecs": null,
      "estimatedDistanceInMeters": null,
      "estimatedDistanceUnit": null,
      "estimateType": null,
      "description": null,
      "workoutSteps": [ /* see §4 */ ]
    }
  ],
  // Fields present in ThomasRondof template but likely optional for create:
  "author": null,               // omit or null on create
  "updatedDate": null,          // Garmin sets on save
  "createdDate": null,          // Garmin sets on save
  "shared": false,
  "locale": null,
  "workoutProvider": null,
  "workoutSourceId": null,
  "uploadTimestamp": null,
  "atpPlanId": null,
  "consumer": null,
  "consumerName": null,
  "workoutNameI18nKey": null,
  "descriptionI18nKey": null,
  "estimateType": null,
  "workoutThumbnailUrl": null,
  "isSessionTransitionEnabled": null
}
```

**Fields to omit on create (fulippo strips these before POST):**
`workoutId`, `ownerId`, `updatedDate`, `createdDate`, `author`, `estimatedDurationInSecs`, `estimatedDistanceInMeters`

**Sources:**
- ThomasRondof: `GarminGenJSON.html` — `garminTemplate` constant
- mkuthan: `garminworkouts/models/workout.py` — `create_workout()` method
- fulippo: `share-your-workout.js` — `GarminImport.deleteProps` and `createWorkoutPayload()`

---

## 4. Workout Step Types (`stepType`)

**Confirmed from ThomasRondof `GarminGenJSON.html` — `stepTypeMap` constant:**

| Key | `stepTypeId` | `displayOrder` |
|-----|-------------|----------------|
| `warmup` | 1 | 1 |
| `cooldown` | 2 | 2 |
| `interval` | 3 | 3 |
| `recovery` | 4 | 4 |
| `rest` | 5 | 5 |
| `repeat` | 6 | 6 |
| `main` | 8 | 8 |

**Also confirmed by mkuthan (`workout.py`):**
- `interval` → `stepTypeId: 3`
- `repeat` → `stepTypeId: 6`

**Also confirmed by Pythe1337N (`RunningTemplate.ts`):**
- `interval` → `stepTypeId: 3`

**Note:** `main` (id=8) appears only in ThomasRondof and is used for swimming. Standard running workouts use warmup/interval/recovery/cooldown.

**Step type 7 is absent** in all community libraries — no "active recovery" or "other" type found. Confirm with live capture.

---

## 5. `endCondition` Types

**From ThomasRondof `GarminGenJSON.html` — `conditionTypeMap`:**

| Key | `conditionTypeId` | `conditionTypeKey` | `displayOrder` |
|-----|------------------|--------------------|----------------|
| `lap` | 1 | `lap.button` | 1 |
| `time` | 2 | `time` | 2 |
| `distance` | 3 | `distance` | 3 |
| `iterations` | 7 | `iterations` | 7 |

- `endConditionValue`: seconds for `time`, metres for `distance`, count for `iterations`, `null` for `lap.button`
- `displayable`: `true` for executable steps, `false` for repeat groups (ThomasRondof)

**Also confirmed by mkuthan (`workout.py` — `_end_condition()`):**
- `time` → `conditionTypeId: 2`
- `lap.button` → `conditionTypeId: 1`

**Source:** ThomasRondof `GarminGenJSON.html` — `conditionTypeMap` constant; mkuthan `garminworkouts/models/workout.py` lines ~140–145

---

## 6. `targetType` (workout target types)

**From ThomasRondof `GarminGenJSON.html` — `TARGET_TYPE_MAPPING`:**

| Key | `workoutTargetTypeId` | `workoutTargetTypeKey` | `displayOrder` |
|-----|-----------------------|------------------------|----------------|
| `no target` | 1 | `no.target` | 1 |
| `power` | 2 | `power.zone` | 2 |
| `cadence` | 3 | `cadence.zone` | 3 |
| `heart rate` | 4 | `heart.rate.zone` | 4 |
| `speed` | 5 | `speed.zone` | 5 |
| `pace` | 6 | `pace.zone` | 6 |
| `swim css offset` | 17 | `swim.css.offset` | 17 |
| `swim instruction` | 18 | `swim.instruction` | 18 |

**Also confirmed by mkuthan (`workout.py`):**
- `no.target` → `workoutTargetTypeId: 1`
- `power.zone` → `workoutTargetTypeId: 2`

**Pace target values:** stored as **metres per second** (m/s).
Conversion: `1000 / (minPerKm * 60)` — e.g. 5:00/km = `1000 / 300 = 3.333 m/s`
(Source: ThomasRondof `GarminGenJSON.html` — pace target parsing block)

`targetValueOne` = slower bound (lower m/s), `targetValueTwo` = faster bound (higher m/s)

**Zone targets:** when using a zone number (HR zone 1–5, power zone 1–7), set `zoneNumber` to the zone integer and leave `targetValueOne`/`targetValueTwo` as `null`.

---

## 7. Executable Step Full Structure

```jsonc
{
  "type": "ExecutableStepDTO",
  "stepId": 1,            // sequential integer; null on create in some libraries
  "stepOrder": 1,         // 1-based ordering within segment
  "childStepId": null,    // null for top-level steps; set to parent's childStepId for nested
  "description": null,
  "stepType": {
    "stepTypeId": 3,
    "stepTypeKey": "interval",
    "displayOrder": 3
  },
  "endCondition": {
    "conditionTypeId": 2,
    "conditionTypeKey": "time",
    "displayOrder": 2,
    "displayable": true
  },
  "endConditionValue": 1200,     // seconds (time), metres (distance), null (lap.button)
  "preferredEndConditionUnit": null,  // OR { "unitId": 1, "unitKey": "meter", "factor": 100 } for distance
  "endConditionCompare": null,
  "endConditionZone": null,
  "targetType": {
    "workoutTargetTypeId": 6,
    "workoutTargetTypeKey": "pace.zone",
    "displayOrder": 6
  },
  "targetValueOne": 3.333,   // m/s (slower bound for pace)
  "targetValueTwo": 3.704,   // m/s (faster bound for pace)
  "zoneNumber": null,        // integer zone number OR null if using raw values
  "secondaryTargetType": null,
  "secondaryTargetValueOne": null,
  "secondaryTargetValueTwo": null,
  "secondaryZoneNumber": null,
  "targetValueUnit": null,
  "secondaryTargetValueUnit": null
}
```

**Source:** ThomasRondof `GarminGenJSON.html` — `parseExecutableStep()` return object; Pythe1337N `RunningTemplate.ts` — `IWorkoutStep` interface

---

## 8. Repeat Group Structure (`RepeatGroupDTO`)

```jsonc
{
  "type": "RepeatGroupDTO",
  "stepId": 2,
  "stepOrder": 2,
  "stepType": {
    "stepTypeId": 6,
    "stepTypeKey": "repeat",
    "displayOrder": 6
  },
  "childStepId": 1,          // references the first nested step's group
  "numberOfIterations": 4,
  "endConditionValue": 4,    // same as numberOfIterations
  "endCondition": {
    "conditionTypeId": 7,
    "conditionTypeKey": "iterations",
    "displayOrder": 7,
    "displayable": false
  },
  "preferredEndConditionUnit": null,
  "endConditionCompare": null,
  "skipLastRestStep": null,
  "smartRepeat": false,
  "workoutSteps": [
    /* nested ExecutableStepDTOs with stepOrder starting at 1 */
  ]
}
```

**Nesting rules (from ThomasRondof and mkuthan):**
- `workoutSteps` inside a `RepeatGroupDTO` use their own `stepOrder` starting at 1
- `childStepId` on the repeat group references the child step ID group; mkuthan increments a counter for this
- `smartRepeat: false` — always false in community libraries

**Sources:**
- ThomasRondof: `GarminGenJSON.html` — `parseSteps()` function, `repeatGroup` object construction
- mkuthan: `garminworkouts/models/workout.py` — `_repeat_step()` method

---

## 9. Sport Type IDs

**From ThomasRondof `GarminGenJSON.html` — `SPORT_TYPE_MAPPING`:**

| Key | `sportTypeId` | `sportTypeKey` | `displayOrder` |
|-----|--------------|----------------|----------------|
| `running` | 1 | `running` | 1 |
| `cycling` | 2 | `cycling` | 2 |
| `swimming` | 4 | `swimming` | 5 |
| `strength_training` | 5 | `strength_training` | 9 |
| `cardio_training` | 6 | `cardio_training` | 8 |

**Note:** Sport ID 3 (likely walking) is not shown in the community libraries examined.

---

## 10. `userProfilePk` / `ownerId`

The `author` object and `ownerId` field reference the logged-in user's profile PK. ThomasRondof's template hardcodes a placeholder value (`118310919`) in `author.userProfilePk` and `ownerId`. The fulippo extension strips both `ownerId` and `author` before POST, implying Garmin assigns these server-side.

**Recommendation:** Set `ownerId: null` and omit `author` when POSTing. Garmin will populate based on the authenticated session.

**If `ownerId` is required:** It appears to be obtainable from:
- The page's JavaScript state (Garmin SPA likely exposes user profile in a global)
- A GET to `https://connectapi.garmin.com/userprofile-service/socialProfile` which returns `displayName`, `profileId`, etc.

**TO BE VERIFIED** during live capture whether the POST succeeds with `ownerId: null`.

---

## 11. Verified Shape (TO BE CAPTURED)

_This section is empty until the user completes Step 2 (live DevTools capture)._

---

## 12. User Verification Steps (Step 2 — DEFERRED)

The following must be completed by the user before the smoke test (Task 19). This unblocks confirming exact endpoint, headers, and JSON shape.

```
1. Log into https://connect.garmin.com.

2. Open DevTools → Network tab. Filter for "workout-service" or "workout".

3. Create a small workout manually using the UI:
   - Sport: Running
   - Steps: 1× Warmup 5 min (lap button or time), 1× Interval 1 km @ pace, 1× Cooldown 5 min
   - Click Save.

4. Find the POST request to /workout-service/workout (or similar) in the Network tab.
   Capture:
   a. The full URL (including origin — is it /gc-api/, /proxy/, connectapi.garmin.com, etc.)
   b. All request headers — especially:
      - NK or nk (value should be "NT")
      - connect-csrf-token or X-CSRF
      - x-requested-with
      - Authorization (is it a Bearer token or cookie-based?)
      - Content-Type
   c. The full JSON request body (right-click → Copy → Copy request body or similar)
   d. The HTTP response status and the response body (this contains the created workout with its assigned workoutId)

5. Update this document under "Verified shape (captured YYYY-MM-DD)":
   - Confirm or correct the endpoint URL.
   - Confirm or correct the header list in §3 (Headers).
   - Note any fields in the request body that differ from the placeholder fixture.

6. Save the captured request body verbatim as:
   tests/fixtures/garmin-workout-canonical.json
   (replacing the placeholder file already committed)

7. If the POST was to connectapi.garmin.com (a different origin from connect.garmin.com),
   verify that a same-origin fetch from the content-script still works, or determine
   whether a background service-worker fetch is needed to avoid CORS.
```

---

## 13. Open Questions for Live Capture

1. **Endpoint origin conflict:** Does the working POST from a browser session go to `/gc-api/workout-service/workout` (same origin, fulippo), `/proxy/workout-service/workout` (mkuthan), or `https://connectapi.garmin.com/workout-service/workout` (Pythe1337N)? The correct one determines whether a content-script same-origin fetch works.

2. **NK header casing:** Is the header `NK: NT` or `nk: NT`? mkuthan uses lowercase. Browser `XMLHttpRequest` normalises header names; `fetch` preserves casing. Garmin's server may be case-sensitive.

3. **CSRF token header name:** Is it `connect-csrf-token` (fulippo) or something else? Is the token read from `<meta name="csrf-token">` or from a cookie?

4. **`ownerId` required?** Does the POST succeed with `ownerId: null`, or does it need the logged-in user's profile PK?

5. **`stepId` on create:** Should `stepId` be `null`, an auto-incremented integer, or omitted entirely? fulippo nulls out all `stepId` fields before POST. ThomasRondof assigns sequential integers starting from 1.
