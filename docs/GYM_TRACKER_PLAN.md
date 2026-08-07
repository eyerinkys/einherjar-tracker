# Gym Tracker — Final Project Plan

## Project Purpose

This project is a **private, mobile-first gym tracker** intended primarily for **two users**.

It is not meant to be a public fitness platform, social network, coaching marketplace, or generic workout app.

The core purpose is simple:

> Let each user define their workout split, log what they actually did in each session, automatically track progress and PRs, and receive useful AI-assisted progressive-overload guidance based on their real training history.

The app should remain focused, fast, and easy to use during an actual gym session.

---

# Core Product Loop

The main user flow is:

```text
Create/edit split
      ↓
Open today's workout
      ↓
See exercises
      ↓
See previous performance
      ↓
Enter today's weight + reps
      ↓
Save session
      ↓
Automatically update:
- workout history
- exercise history
- PRs
- progression status
- graphs
- analytics
- predicted next PR
- AI-assisted next-step guidance
```

This is the heart of the product.

Everything else is secondary.

---

# Final Tech Stack

## Application

- **Next.js**
- **React**
- **TypeScript**

Next.js handles both the frontend and backend logic.

There should NOT be a separate Go, Python, or other backend service.

---

## Styling

- **Tailwind CSS**
- **shadcn/ui**, used selectively

Do not let default component-library styling define the visual identity.

Avoid generic AI-generated dashboard design.

---

## Database

- **Neon PostgreSQL**

Used for:

- users
- workout splits
- exercises
- workout sessions
- workout sets
- bodyweight logs
- progress-photo metadata
- AI fitness profile/context
- derived or cached analytics where necessary

---

## Database Access

- **Drizzle ORM**
- **Drizzle Kit**

Use Drizzle for:

- schema definitions
- type-safe queries
- relationships
- migrations

Keep database structure understandable and relational.

---

## Authentication

- **Better Auth**

Each user has their own account and isolated data.

The authenticated server-side user ID must determine ownership.

Never trust a `userId` sent by the frontend.

---

## Runtime Validation

- **Zod**

Validate all user-controlled server input.

Examples:

- weight
- reps
- split edits
- workout logs
- bodyweight
- photo metadata
- AI profile data

TypeScript types alone are not runtime validation.

---

## AI

- **Groq API**

Groq is used for AI-assisted fitness guidance.

The AI must NOT be responsible for blindly calculating basic progression data.

The app should first calculate objective facts itself, then send structured context to Groq.

AI should assist with:

- probable next PR
- recommended next progression step
- progressive-overload guidance
- interpreting stalls
- interpreting regressions
- deciding when a load increase is sensible
- contextual explanation of training trends

---

## Photo Storage

- **Cloudflare R2**

Used for:

- progress photos

PostgreSQL stores only photo metadata.

Do not store images directly in PostgreSQL.

Prefer direct browser uploads using presigned R2 URLs.

---

## Charts

- **Recharts**

Used for:

- exercise progression
- estimated 1RM
- weight progression
- reps
- volume
- bodyweight
- useful trend analytics

Charts must communicate real information.

Do not add decorative charts.

---

## Deployment

- **Vercel**

---

## Package Manager

- **pnpm**

---

# Architecture

```text
iPhone / Desktop
       |
       v
   Next.js PWA
 --------------------------------
 React UI
 TypeScript
 Server Actions
 Route Handlers
 Better Auth
 Zod
 --------------------------------
        |               |
        |               |
        v               v
     Drizzle        Cloudflare R2
        |           Progress Photos
        v
 Neon PostgreSQL
        |
        v
 Structured fitness history
        |
        v
 Deterministic analysis
        |
        v
      Groq API
        |
        v
 AI guidance + predictions
```

Keep the architecture simple:

```text
1 Next.js repository
1 Neon Postgres database
1 R2 bucket
1 Groq integration
```

Do not introduce additional services without a concrete technical requirement.

---

# User Accounts

The app initially supports two users.

Each user has fully separate:

- workout split
- workout sessions
- exercise history
- PRs
- progressive-overload analysis
- AI training context
- bodyweight logs
- progress photos
- analytics

There is currently no need for:

- social feeds
- followers
- messaging
- leaderboards
- public profiles
- community features

---

# Feature 1 — Split Management

Each user must be able to create and maintain their own workout split.

A split contains workout days.

Example:

```text
Day A — Heavy Compounds
Day B — Pull + Arms
Day C — Legs + Shoulders
Day D — Upper
```

Each workout day contains ordered exercises.

Example:

```text
Pull + Arms

1. Romanian Deadlift
2. Lat Pulldown
3. Seated Cable Row
4. Dumbbell Lateral Raise
5. Dumbbell Curl
6. Hammer Curl
7. Skull Crushers
```

Users must be able to:

- create workout days
- rename workout days
- reorder workout days
- add exercises
- remove exercises
- reorder exercises
- edit target sets
- edit target rep ranges
- edit exercise-specific notes where useful

The split itself is persistent.

There is no separate "workout template system."

The user's split IS the workout structure.

---

# Feature 2 — Exercise Library

The app should contain a shared built-in exercise library.

Example fields:

```text
id
name
muscleGroup
equipment
category
```

Examples:

```text
Bench Press
Romanian Deadlift
Lat Pulldown
Seated Cable Row
Dumbbell Curl
Hammer Curl
Skull Crushers
Leg Press
Lateral Raise
```

Users may later be allowed to create custom exercises.

If custom exercises are implemented:

```text
createdByUserId
isCustom
```

should be included.

Built-in exercises do not belong to one particular user.

---

# Feature 3 — Workout Session Logging

This is the most important feature.

When a user opens one of their workout days, they should be able to log the current session.

For every exercise, show:

- exercise name
- target sets
- target rep range
- previous-session performance
- current session inputs

Example:

```text
Dumbbell Curl

Target:
3 × 10–12

Previous session:
Set 1: 5 kg × 12
Set 2: 5 kg × 12
Set 3: 5 kg × 10

Today:
Set 1: [weight] × [reps]
Set 2: [weight] × [reps]
Set 3: [weight] × [reps]
```

Users should be able to:

- enter weight for every set
- enter reps for every set
- add a set if needed
- remove a set
- edit a saved set
- save the completed workout
- add optional workout notes

The interface should minimize taps and typing.

---

# Feature 4 — Previous Performance

Previous performance must be visible while logging the current session.

The point is to make progressive overload easy without forcing the user to remember old numbers.

For each exercise, show the most recent previous session.

Example:

```text
Last time:
7.5 kg × 10
7.5 kg × 9
7.5 kg × 8
```

This should be immediately visible in the workout logger.

Do not hide it behind several menus.

---

# Feature 5 — Workout History

All completed sessions must remain available.

Users should be able to browse historical workouts by date.

Each history entry should show:

- workout day/name
- date
- exercises
- sets
- weights
- reps
- notes if present

Example:

```text
7 Aug 2026
Pull + Arms

Lat Pulldown
50 kg × 10
50 kg × 10
50 kg × 9

Seated Cable Row
45 kg × 12
45 kg × 11
45 kg × 10
```

History is not merely cosmetic.

It is the underlying data source for:

- PR calculations
- graphs
- progression analysis
- predictions
- AI guidance

---

# Feature 6 — Exercise History

Every exercise should have its own historical view.

Example:

```text
Dumbbell Curl

Session 1
5 kg — 12, 11, 10

Session 2
5 kg — 12, 12, 11

Session 3
5 kg — 12, 12, 12

Session 4
7.5 kg — 9, 8, 7
```

This history should drive all exercise-specific analytics.

---

# Feature 7 — Automatic PR Tracking

PRs must be detected automatically.

Users should NOT manually create PR entries.

Possible PR types include:

- highest successful weight
- highest reps at a specific weight
- estimated 1RM
- highest session volume for an exercise

Initial PR logic should remain understandable.

Do not build an unnecessarily complex scoring system.

---

# Feature 8 — Estimated 1RM

The app may calculate estimated one-rep max from recorded working sets.

A simple formula such as Epley may be used:

```text
estimated1RM = weight × (1 + reps / 30)
```

This is an estimate.

Do not present an estimated value as an actually performed one-rep max.

---

# Feature 9 — Automatic Progressive Overload Analysis

The application must automatically compare recent sessions.

It should calculate objective progression indicators such as:

- weight increase
- rep increase
- total rep increase
- estimated 1RM increase
- volume increase
- repeated identical performance
- performance decline

The application can classify an exercise using states such as:

```text
PROGRESSING
READY_TO_INCREASE_LOAD
ADAPTING_TO_NEW_LOAD
STALLED
REGRESSING
INSUFFICIENT_DATA
```

These states should first be determined by deterministic TypeScript/database logic.

Do not ask the AI to invent whether progression occurred when the numbers already answer that question.

---

# Feature 10 — AI-Assisted Progressive Overload Guidance

Groq should receive the computed progression state plus relevant context.

The AI should recommend the next logical action.

Examples:

```text
Keep 7.5 kg next session and aim for one additional total rep.
```

```text
You reached the top of your 8–10 rep range for all sets.
Try the next available weight next session.
```

```text
Performance has remained unchanged for four sessions.
Stay at the same load for now and aim to improve one set before increasing weight.
```

```text
Your reps dropped after increasing the load, but remain inside the target range.
Stay at the current weight while adapting.
```

Recommendations should be short, practical, and based on actual logged data.

---

# Feature 11 — Probable Next PR

The application should predict a realistic probable next PR.

This must be clearly labelled as a prediction.

Example:

```text
Current:
7.5 kg × 10

Probable next PR:
7.5 kg × 12
or
10 kg × 7–8
```

Prediction inputs can include:

- recent weight trend
- rep trend
- estimated 1RM trend
- target rep range
- current progression status
- available weight increments
- number of recent sessions
- consistency

The final prediction should be AI-assisted.

The AI must receive already-calculated structured metrics rather than raw unfiltered history alone.

---

# Feature 12 — Persistent AI Training Context

The AI should behave as if it understands the user's personal training situation.

This should NOT be implemented by fine-tuning a model on the user.

Instead, maintain a structured training profile in the database.

Possible fields:

```text
userId
trainingExperience
primaryGoal
preferredProgressionMethod
availableWeightIncrements
generalTrainingNotes
updatedAt
```

The system can also automatically provide:

- current split
- target set/rep ranges
- recent exercise history
- current PR
- estimated 1RM trend
- progression state
- recent bodyweight trend

This context should be included only when relevant to the AI request.

Do not dump the user's entire database into every prompt.

---

# AI Context Example

A Groq request may receive context similar to:

```text
USER PROFILE
Goal: muscle gain
Experience: beginner

EXERCISE
Dumbbell Curl

TARGET
3 sets
10–12 reps

AVAILABLE LOADS
5 kg
7.5 kg
10 kg

RECENT HISTORY
Session 1: 5 kg — 12, 11, 10
Session 2: 5 kg — 12, 12, 11
Session 3: 5 kg — 12, 12, 12

COMPUTED METRICS
Progression state: READY_TO_INCREASE_LOAD
Rep improvement: +3 total reps
Current estimated 1RM: ...
Recent estimated 1RM trend: increasing

TASK
Return:
- recommended next load
- recommended target reps
- probable next PR
- concise explanation
- confidence
```

---

# Feature 13 — Structured AI Output

Groq responses should preferably use structured JSON.

Example:

```json
{
  "status": "ready_to_increase_load",
  "nextWeight": 7.5,
  "targetRepMin": 8,
  "targetRepMax": 10,
  "probableNextPR": {
    "weight": 7.5,
    "reps": 8
  },
  "confidence": "medium",
  "guidance": "Increase to 7.5 kg next session and aim for controlled sets inside the 8–10 rep range."
}
```

The frontend should render this structured result cleanly.

Do not rely on arbitrary AI prose as application state.

---

# AI Design Principle

Use this rule:

> Math determines what happened. AI helps decide what to do next.

The app itself should calculate:

- current PRs
- weight changes
- rep changes
- volume
- estimated 1RM
- progression trends
- stalls

Groq should interpret these facts and provide higher-level guidance.

---

# Feature 14 — Exercise Progress Graphs

Each exercise should have useful charts.

Possible charts:

- working weight over time
- total reps over time
- estimated 1RM over time
- volume over time

The charts should make progression easy to understand.

Recorded performance and AI predictions must be visually distinguishable.

Predictions should never appear as if they actually happened.

---

# Feature 15 — Analytics Dashboard

The app should provide a concise overview of meaningful training trends.

Examples:

```text
Exercises progressing: 8
Exercises stalled: 2
Recent PRs: 4
Exercises ready for load increase: 3
```

Potential sections:

- recent PRs
- progressing exercises
- stalled exercises
- exercises ready for increased load
- strongest recent improvements
- estimated strength trends
- bodyweight trend

Do not invent arbitrary fitness scores unless there is an explicit documented formula.

Avoid meaningless gamification.

---

# Feature 16 — Bodyweight Tracking

Users can log bodyweight.

Fields:

```text
id
userId
date
weight
createdAt
```

Features:

- enter bodyweight
- view previous entries
- view graph
- current weight
- starting weight
- net change
- recent trend

Potential future improvement:

- 7-day moving average

Do NOT add body measurements.

---

# Feature 17 — Progress Photos

Users should be able to store progress photos.

Features:

- upload photo
- attach date
- optional tag
- optional note
- chronological gallery
- compare selected photos side by side

Possible tags:

```text
front
side
back
relaxed
flexed
```

Actual image files belong in Cloudflare R2.

Postgres stores metadata only.

Suggested metadata:

```text
progress_photos

id
userId
storageKey
date
tag
notes
createdAt
```

---

# Photo Upload Architecture

Prefer direct upload:

```text
Browser
   |
   | request upload permission
   v
Next.js
   |
   | generate short-lived presigned URL
   v
Cloudflare R2

Browser -----------------> R2
        direct upload
```

Do not send large image files through the Next.js server unless necessary.

Photos should be compressed/resized before or during upload where practical so full-resolution phone photos do not waste storage unnecessarily.

---

# Suggested Database Model

## Authentication

Better Auth-managed tables.

Typical concepts:

```text
users
sessions
accounts
verification
```

---

## Workout Split

```text
split_days
- id
- userId
- name
- order
- createdAt
- updatedAt
```

```text
split_exercises
- id
- splitDayId
- exerciseId
- order
- targetSets
- targetRepMin
- targetRepMax
- notes nullable
```

---

## Exercise Library

```text
exercises
- id
- name
- muscleGroup
- equipment
- category
- createdByUserId nullable
- isCustom
- createdAt
- updatedAt
```

---

## Workout Sessions

```text
workout_sessions
- id
- userId
- splitDayId nullable
- name
- startedAt
- completedAt
- notes nullable
- createdAt
```

---

## Session Exercises

```text
session_exercises
- id
- sessionId
- exerciseId
- order
- targetRepMin nullable
- targetRepMax nullable
```

---

## Workout Sets

```text
workout_sets
- id
- sessionExerciseId
- setNumber
- weight
- reps
- createdAt
```

---

## Bodyweight

```text
bodyweight_logs
- id
- userId
- date
- weight
- createdAt
```

---

## Progress Photos

```text
progress_photos
- id
- userId
- storageKey
- date
- tag nullable
- notes nullable
- createdAt
```

---

## AI Training Profile

```text
training_profiles
- userId
- trainingExperience nullable
- primaryGoal nullable
- preferredProgressionMethod nullable
- availableWeightIncrements nullable
- generalTrainingNotes nullable
- updatedAt
```

The exact representation of available weights/increments can be refined later.

---

# PR Storage Strategy

Initially, prefer deriving PRs from historical workout data.

Do not duplicate values unnecessarily.

If performance later becomes an issue, PR results can be cached.

The source of truth must remain actual recorded workout sets.

---

# Progressive Overload Strategy

The system should support progression methods based on context.

A common default can be double progression:

```text
Example target:
3 × 8–10

Session A:
50 × 8
50 × 8
50 × 8

Session B:
50 × 9
50 × 8
50 × 8

Session C:
50 × 10
50 × 10
50 × 10

Next likely step:
increase load
```

However, AI recommendations should consider:

- the exercise
- available load increments
- recent performance
- target range
- training history
- the user's stated goal

Do not hardcode one progression strategy for every exercise forever.

---

# Server Actions vs Route Handlers

Prefer **Server Actions** for normal application mutations.

Examples:

```text
createSplitDay
updateSplitDay
addExerciseToSplit
saveWorkout
updateWorkoutSet
logBodyweight
deleteBodyweightEntry
```

Use **Route Handlers** when a real HTTP endpoint is useful.

Examples:

```text
/api/auth/*
/api/photos/presign
/api/ai/progression
/api/ai/pr-prediction
```

AI requests may also be implemented through Server Actions if that remains simpler.

Do not create API routes purely because a traditional REST architecture diagram looks impressive.

---

# Security Requirements

Even with only two users, security rules are mandatory.

1. Never trust a frontend-provided `userId`.
2. Determine user identity from the authenticated session.
3. Scope all private reads by authenticated user ID.
4. Scope all updates/deletes by authenticated user ID.
5. Validate all user input server-side.
6. Never expose Neon credentials in client code.
7. Never expose R2 secret credentials in client code.
8. Never expose the Groq API key to the browser.
9. AI endpoints must retrieve user-owned history server-side.
10. Check object ownership before returning photo URLs or metadata.
11. Treat route parameters and IDs as untrusted.
12. Store secrets only in server-side environment variables.

---

# Mobile-First UX

The app will primarily be used on a phone during gym sessions.

Therefore:

- use large tap targets
- keep numeric input fast
- minimize navigation
- keep previous performance visible
- avoid unnecessary modals
- avoid full-page reloads
- make saving a set fast
- keep the active workout easy to resume
- prioritize one-handed use where practical

The workout logger is more important than the dashboard.

---

# PWA

The application should be built as a responsive PWA.

Primary environments:

- iPhone Safari
- Android browsers
- desktop browsers

The app should be installable to the home screen where supported.

Offline synchronization is NOT currently required.

---

# Analytics Philosophy

Only calculate metrics that provide actual training value.

Good:

```text
+2 reps since last session
+5 kg over 6 weeks
estimated 1RM trending upward
stalled for 4 sessions
ready to increase load
```

Bad:

```text
Training Score: 94
Beast Mode: 87%
Consistency Power: 9.3
```

unless there is a real, documented formula and a genuine reason to show it.

---

# AI Guidance Philosophy

AI responses should be:

- concise
- evidence-based
- specific
- grounded in the user's logged data
- honest about uncertainty

Avoid generic fitness chatbot responses.

Bad:

```text
Stay consistent and keep pushing!
```

Good:

```text
You completed 12 reps on all three sets at 5 kg for the first time.
Your target range is 10–12, so try 7.5 kg next session and aim for 8–10 controlled reps.
```

If data is insufficient, the AI should state that.

Do not fabricate certainty.

---

# What Is NOT In Scope

Do not implement unless explicitly requested later:

- body measurements
- nutrition tracking
- calorie tracking
- meal planning
- social feed
- messaging
- leaderboards
- public profiles
- friend competitions
- workout sharing
- rest timers
- Apple Health
- Health Connect
- wearable integration
- offline sync
- coaching marketplace
- exercise video library
- complicated gamification
- subscriptions
- payments
- multiple organizations
- admin dashboards
- public APIs
- microservices
- separate backend service

---

# Development Philosophy

This project will use substantial AI-assisted development.

Generated code still needs to be:

- understandable
- type-safe
- maintainable
- secure
- consistent
- minimal
- aligned with this document

Do not add new libraries or services without a real reason.

Do not replace the selected stack because another framework is fashionable.

Prefer simple explicit code.

A useful mental model:

```text
authenticate
    ↓
validate
    ↓
load user-owned data
    ↓
calculate deterministic metrics
    ↓
optionally call AI
    ↓
save / return result
```

---

# Suggested Repository Structure

```text
gym-tracker/
|
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   │
│   ├── (app)/
│   │   ├── dashboard/
│   │   ├── split/
│   │   ├── workout/
│   │   ├── history/
│   │   ├── exercises/
│   │   ├── progress/
│   │   ├── bodyweight/
│   │   ├── photos/
│   │   └── settings/
│   │
│   └── api/
│       ├── auth/
│       ├── ai/
│       └── photos/
│
├── actions/
│   ├── split.ts
│   ├── workouts.ts
│   ├── bodyweight.ts
│   └── photos.ts
│
├── components/
│   ├── split/
│   ├── workout/
│   ├── history/
│   ├── progress/
│   ├── photos/
│   ├── layout/
│   └── ui/
│
├── db/
│   ├── schema/
│   │   ├── auth.ts
│   │   ├── exercises.ts
│   │   ├── split.ts
│   │   ├── workouts.ts
│   │   ├── bodyweight.ts
│   │   ├── photos.ts
│   │   └── training-profile.ts
│   │
│   ├── queries/
│   └── index.ts
│
├── lib/
│   ├── auth.ts
│   ├── r2.ts
│   ├── groq.ts
│   ├── progression/
│   ├── analytics/
│   └── validation/
│
├── drizzle/
│   └── migrations/
│
└── package.json
```

This is guidance.

Do not create empty abstraction layers simply to match this structure.

---

# Build Order

## Phase 1 — Foundation

1. Create Next.js TypeScript project
2. Configure pnpm
3. Configure Tailwind
4. Configure Neon
5. Configure Drizzle
6. Configure Better Auth
7. Create initial schema
8. Confirm user isolation

---

## Phase 2 — Split

1. Create exercise library
2. Create split days
3. Add exercises to split
4. Reorder exercises
5. Edit target sets and rep ranges
6. Build mobile-first split editor

---

## Phase 3 — Workout Logging

1. Open workout day
2. Display exercises
3. Display previous performance
4. Enter weight + reps
5. Save workout session
6. Edit sets
7. Complete session
8. Preserve full historical data

This is the most important phase.

---

## Phase 4 — History + PRs

1. Workout history
2. Exercise history
3. Automatic PR calculation
4. Estimated 1RM
5. Basic progression state

---

## Phase 5 — Progressive Overload

1. Calculate rep changes
2. Calculate load changes
3. Calculate volume changes
4. Detect stalls
5. Detect regressions
6. Detect load-increase readiness
7. Generate deterministic progression state

---

## Phase 6 — Groq AI

1. Configure Groq server-side
2. Build structured training context
3. Add AI progression guidance
4. Add probable next-PR prediction
5. Use structured responses
6. Add clear uncertainty/confidence handling
7. Prevent unnecessary AI calls

---

## Phase 7 — Graphs + Analytics

1. Exercise progression charts
2. Estimated 1RM chart
3. Volume/reps/weight trends
4. Dashboard summaries
5. PR feed
6. stalled/progressing/ready-to-increase sections

---

## Phase 8 — Bodyweight

1. Bodyweight logging
2. History
3. Graph
4. starting/current/change statistics
5. trend calculation

---

## Phase 9 — Photos

1. Configure Cloudflare R2
2. Add presigned upload flow
3. Add compression/resizing
4. Store metadata
5. Build gallery
6. Build side-by-side comparison

---

## Phase 10 — Refinement

Improve:

- workout logging speed
- mobile usability
- error handling
- loading states
- accessibility
- PWA behavior
- AI prompt quality
- analytics clarity
- security checks

---

# Product Priority Order

When making decisions, prioritize:

```text
1. Workout logging speed
2. Data correctness
3. User isolation/security
4. Previous-performance visibility
5. Automatic progression analysis
6. Useful AI guidance
7. Workout history
8. Progress graphs
9. Bodyweight
10. Progress photos
11. Visual polish
```

---

# Final Stack Summary

```text
Frontend:
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui selectively
- Recharts

Backend:
- Next.js Server Actions
- Next.js Route Handlers where useful
- Zod

Authentication:
- Better Auth

Database:
- Neon PostgreSQL
- Drizzle ORM
- Drizzle Kit

AI:
- Groq API
- Structured per-user training context
- Deterministic metrics before AI interpretation

Storage:
- Cloudflare R2
- Presigned uploads

Deployment:
- Vercel

Application Format:
- Responsive PWA

Package Manager:
- pnpm
```

---

# Source of Truth

This document defines the current intended scope and architecture of the project.

Do not expand the product beyond this plan unless explicitly instructed.

The core product is:

> A fast, personal gym tracker where users manage their split, log weight and reps, review workout history, automatically track PRs and progressive overload, receive AI-assisted guidance and next-PR predictions, track bodyweight, and store progress photos.
