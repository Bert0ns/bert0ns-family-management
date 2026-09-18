# C4 Architecture Model: Context & Container Topology

> **Module 01: Structural Decomposition & Container Architecture**  
> System: `Bert0n's Family Expense Management` | Standard: `C4 Model (Level 1 Context & Level 2 Containers)`

[← Previous: Index](./index.md) | [Index](./index.md) | [Next: Screens & Navigation →](./02-screens-and-navigation.md)

---

## 1. Executive Context & Architectural Boundaries

The **Family Expense Management System** operates as a hybrid client-cloud architecture. Its primary design imperative is **local-first autonomy**: the client application retains full operational capability without an active internet connection. Cloud infrastructure provided by Supabase serves as a synchronization and collaboration gateway rather than a mandatory runtime dependency.

---

## 2. C4 Level 1: System Context Diagram

The System Context diagram illustrates the system boundaries, primary human actors, external services, and data flow vectors.

```mermaid
flowchart TB
    subgraph HouseholdActors ["Household Users"]
        FamilyAdmin["Family Administrator<br/>[Person]<br/>Creates family, configures budgets, manages members"]
        FamilyMemberUser["Family Member<br/>[Person]<br/>Logs daily expenses, uploads JSON reports, settles debts"]
    end

    subgraph SystemBoundary ["Bert0n's Family Expense Management System"]
        AppInstance["Family Expense Management Application<br/>[React Native / Expo 57 / Web PWA]<br/>Local-first, client-side financial analytics & expense tracking"]
    end

    subgraph ExternalSystems ["External Cloud Infrastructure & Local Tools"]
        SupabaseAuth["Supabase Auth Service<br/>[External SaaS]<br/>GoTrue JWT authentication & family pairing tokens"]
        SupabaseDatabase[("Supabase PostgreSQL Database<br/>[External Database]<br/>Multi-tenant ledger storage with Row-Level Security")]
        SupabaseRealtime["Supabase Realtime Service<br/>[External WebSocket Server]<br/>Live change broadcast across family devices"]
        ExpoPushService["Expo Push Service<br/>[External SaaS]<br/>Apple APNs and Google FCM push notification delivery"]
        LocalAIModel["Local / Private LLM<br/>[User-Controlled AI Tool]<br/>Processes bank statements via client-generated prompt templates"]
    end

    FamilyAdmin -->|"Configures family group, categories, and invites members"| AppInstance
    FamilyMemberUser -->|"Records expenses, views visual analytics, exports data"| AppInstance

    AppInstance -->|"Authenticates & verifies pairing codes via HTTPS"| SupabaseAuth
    AppInstance -->|"Flushes outbox queue & executes SQL queries via PostgREST"| SupabaseDatabase
    SupabaseRealtime -->|"Pushes Postgres change events via WSS"| AppInstance
    AppInstance -->|"Submits device push tokens via HTTPS"| ExpoPushService
    AppInstance -.->|"User copies generated prompt without sending financial records"| LocalAIModel
```

### Context Boundary Descriptions

1. **Family Administrator & Members:**  
   Users interact with the application via mobile devices (iOS, Android) or desktop browsers (PWA). All members of a family share visibility into the family ledger, but administrative privileges (invitation management, category modifications) can be restricted via role policies (`ADMIN`, `MEMBER`, `VIEWER`).
2. **Local-First Client Instance:**  
   The primary computing engine is the client application itself. Financial math, chart aggregations, JSON parsing, and deduplication heuristics occur locally on the user's processor.
3. **Supabase Cloud Infrastructure:**  
   Provides relational persistence, role-based authorization via Row-Level Security (RLS), and sub-100ms multi-device event broadcasts through PostgreSQL replication channels.
4. **Local / Private LLM Ecosystem:**  
   Instead of uploading sensitive family statements to cloud AI APIs, the application provides an offline statement prompt generator. Users execute the prompt on their own local LLM (e.g. Ollama, Claude, ChatGPT web interface) and paste the sanitized JSON into the app.

---

## 3. C4 Level 2: Container Topology Diagram

The Container diagram decomposes the application into its logical runtimes, presentation modules, state management containers, local storage engines, and backend cloud nodes.

```mermaid
flowchart TB
    subgraph ClientContainer ["Client Application Container (Expo SDK 57 / React Native 0.86)"]
        direction TB

        subgraph PresentationLayer ["1. Presentation & Routing Layer"]
            RouterEntry["Expo Router Engine<br/>(File-based routing, Stack & Tabs)"]
            DashboardModule["Dashboard Module<br/>(KPI Cards, Member Ring, Mini Trend)"]
            LedgerModule["Ledger & Search Module<br/>(Filters, Search, Transaction Items)"]
            AnalyticsModule["Analytics Module<br/>(Category Pie, Spending Velocity, Heatmap)"]
            ImportModule["Import & Export Center<br/>(Dropzone, Zod Validator, CSV Stream)"]
            ModalsModule["Modal Dialog Registry<br/>(SplitCalculator, AuthModal, PairingModal)"]
        end

        subgraph StateLayer ["2. Reactive State & Domain Logic Layer"]
            StoreState["Zustand Store Engine (useAppStore)<br/>(Centralized immutable state, mutation listeners)"]
            SplitService["Split & Settlement Calculator<br/>(Cent-exact division, greedy debt reduction)"]
            AnalyticsService["Analytics Calculation Engine<br/>(Burn rate, velocity curves, MoM metrics)"]
            DeduplicationService["Duplicate Transaction Detector<br/>(Token normalization, temporal matching)"]
            ValidationService["Report Validator<br/>(Zod schema enforcement)"]
        end

        subgraph NativePlatformLayer ["3. Native Hardware & Platform Services Layer"]
            NotificationBridge["Expo Notifications Engine<br/>(Local reminders, badge counters, push tokens)"]
            FileSystemBridge["Expo FileSystem & Sharing<br/>(RFC 4180 CSV export, JSON backup dumps)"]
            HapticsBridge["Expo Haptics Engine<br/>(Tactile validation & confirmation taps)"]
        end

        subgraph PersistenceLayer ["4. Local Sandboxed Storage Layer"]
            AsyncStorageRuntime["AsyncStorage Runtime<br/>(@bert0ns_family_storage)"]
            OutboxQueueStorage["Outbox Mutation Queue<br/>(@bert0ns_sync_outbox)"]
            LastSyncStorage["Sync Timestamp Store<br/>(@bert0ns_last_sync_timestamp)"]
        end

        subgraph SyncGatewayLayer ["5. Integration & Cloud Synchronization Gateway"]
            SyncEngineCore["SyncEngine Controller<br/>(Offline detection, outbox queue flushing)"]
            RealtimeSyncManager["RealtimeSync Manager<br/>(Supabase WSS postgres_changes dispatcher)"]
            AuthServiceClient["Auth & Pairing Service<br/>(Family token verification, session lifecycle)"]
        end
    end

    subgraph SupabaseCloud ["Cloud Infrastructure Container (Supabase Backend)"]
        direction TB
        PostgRESTGateway["Supabase PostgREST API<br/>(HTTPS / RESTful data layer with JWT verification)"]
        GoTrueAuthService["GoTrue Authentication Engine<br/>(Identity provider, refresh tokens)"]
        PostgresRDBMS[("PostgreSQL 15 Relational Database<br/>(families, expenses, splits, budgets tables with RLS)")]
        RealtimeEngine["Realtime WebSocket Service<br/>(WAL logical replication broadcaster)"]
    end

    %% Wiring presentation to state
    RouterEntry --> PresentationLayer
    PresentationLayer -->|"Dispatches Actions / Reads Selectors"| StoreState
    PresentationLayer -->|"Invokes Visual Calculation"| AnalyticsService
    PresentationLayer -->|"Triggers Vibration"| HapticsBridge

    %% Wiring state to domain & native
    StoreState -->|"Executes Debt Math"| SplitService
    StoreState -->|"Dispatches Notifications"| NotificationBridge
    StoreState -->|"Emits StoreMutationEvent"| SyncEngineCore

    %% Storage connections
    StoreState -->|"Persist Middleware"| AsyncStorageRuntime
    SyncEngineCore -->|"Enqueue / Drain Outbox"| OutboxQueueStorage
    SyncEngineCore -->|"Reads / Updates"| LastSyncStorage
    ImportModule -->|"Streams to File"| FileSystemBridge

    %% Cloud synchronization
    AuthServiceClient -->|"Sign In / Pair"| GoTrueAuthService
    SyncEngineCore -->|"HTTPS Batch Upsert"| PostgRESTGateway
    PostgRESTGateway --> PostgresRDBMS
    PostgresRDBMS --> RealtimeEngine
    RealtimeEngine -->|"WSS Change Stream"| RealtimeSyncManager
    RealtimeSyncManager -->|"Reconcile Remote Changes"| StoreState
```

---

## 4. Container Responsibilities & Communication Contracts

### 4.1 Presentation & Routing Layer

- **Technology:** [Expo Router ^57.0.21](file:///home/berto/bert0ns-family-management/package.json#L21), React Native 0.86.3, React 19.2.3.
- **Responsibilities:** Renders the responsive UI shell across mobile screens and desktop viewports. Mounts the tab hierarchy (`/(tabs)`) and modal stack routes (`/expense/add`).
- **Communication Contract:** Consumes selectors from [`useAppStore`](file:///home/berto/bert0ns-family-management/src/services/store.ts#L152) and invokes pure functional calculation engines for chart visualizations.

### 4.2 Reactive State & Domain Logic Layer

- **Technology:** [Zustand ^5.0.15](file:///home/berto/bert0ns-family-management/package.json#L31), TypeScript ~6.0.3.
- **Responsibilities:** Maintains single-source-of-truth state for expenses, family members, categories, active filters, and outbox synchronization events.
- **Communication Contract:** Dispatches immutable state transitions, executes listeners registered via [`registerStoreMutationListener`](file:///home/berto/bert0ns-family-management/src/services/store.ts#L112-L125), and persists changes through AsyncStorage.

### 4.3 Integration & Synchronization Layer

- **Technology:** [`@supabase/supabase-js ^2.114.0`](file:///home/berto/bert0ns-family-management/package.json#L10).
- **Responsibilities:** Manages the offline-first queue ([`syncEngine`](file:///home/berto/bert0ns-family-management/src/services/syncEngine.ts#L36)), executes conflict resolution using Last-Write-Wins timestamps, and maintains the active WebSocket channel ([`realtimeSync`](file:///home/berto/bert0ns-family-management/src/services/realtimeSync.ts#L10)).
- **Communication Contract:** Communicates with Supabase using HTTPS REST (PostgREST) and WebSocket WSS (Supabase Realtime).

### 4.4 Local Sandboxed Storage Container

- **Technology:** [`@react-native-async-storage/async-storage 2.2.0`](file:///home/berto/bert0ns-family-management/package.json#L8), `expo-file-system`.
- **Responsibilities:** Persists local serialized state snapshots across app lifecycles, maintaining outbox mutation queues and temporary export files.
- **Communication Contract:** Asynchronous key-value I/O via native Android SQLite/SharedPreferences and iOS SQLite/NSUserDefaults bridges.

### 4.5 Cloud Backend Container (Supabase)

- **Technology:** PostgreSQL 15, GoTrue Auth, Realtime Server.
- **Responsibilities:** Provides centralized persistence for multi-device households, enforces Row-Level Security policies keyed to `family_id`, and emits change events to connected clients.
- **Communication Contract:** RFC 7519 JWT Bearer tokens passed via standard Authorization headers over TLS 1.3.

---

[← Previous: Index](./index.md) | [Index](./index.md) | [Next: Screens & Navigation →](./02-screens-and-navigation.md)
