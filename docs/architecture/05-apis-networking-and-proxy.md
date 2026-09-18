# External APIs, Networking & Cloud Architecture

> **Module 05: Cloud Infrastructure, PostgreSQL RLS & Offline Synchronization**  
> Backend Provider: `Supabase (PostgreSQL 15, PostgREST, GoTrue Auth, Realtime WSS)`

[← Previous: Hardware Sensors & Kinematics](./04-sensors-kinematics-and-native.md) | [Index](./index.md) | [Next: Cross-Cutting Concerns →](./06-cross-cutting-concerns.md)

---

## 1. Network & Backend Topology Diagram

The backend infrastructure is anchored by Supabase's hosted PostgreSQL engine. The client application connects via two distinct channels: an HTTPS RESTful gateway (PostgREST) for transactional batch mutations and an authenticated WebSocket pipeline for real-time change data capture.

```mermaid
flowchart TB
    subgraph ClientInstance ["Client Device Application Layer"]
        ZustandStore["useAppStore State"]
        SyncEngineGateway["SyncEngine Controller<br/>(syncEngine.ts)"]
        RealtimeManager["RealtimeSync Manager<br/>(realtimeSync.ts)"]
        AuthClient["Auth & Pairing Service<br/>(authService.ts)"]
    end

    subgraph SupabaseGateway ["Supabase Cloud Security Gateway"]
        direction TB
        KongAPIGateway["Kong API Gateway / Reverse Proxy<br/>(HTTPS & WSS Termination)"]
        GoTrueService["GoTrue Auth Service<br/>(JWT Signing & Verification)"]
    end

    subgraph DataEngine ["PostgreSQL 15 Relational Core"]
        direction TB
        PostgRESTAPI["PostgREST API Server<br/>(Automated REST to SQL Mapper)"]
        RLSLayer["Row-Level Security (RLS) Engine<br/>(Tenancy Isolation by family_id)"]
        PostgresTables[("PostgreSQL Tables<br/>• families<br/>• family_members<br/>• categories<br/>• expenses<br/>• expense_splits<br/>• settlements")]
        WALReplication["Write-Ahead Log (WAL) Logical Replication"]
        RealtimeServer["Supabase Realtime Engine<br/>(Phoenix Channels WebSocket Server)"]
    end

    SyncEngineGateway -->|"HTTPS Batch Upsert (Outbox)"| KongAPIGateway
    AuthClient -->|"HTTPS Sign-In / Token Pair"| KongAPIGateway
    KongAPIGateway --> GoTrueService
    KongAPIGateway --> PostgRESTAPI
    PostgRESTAPI --> RLSLayer
    RLSLayer --> PostgresTables
    PostgresTables --> WALReplication
    WALReplication --> RealtimeServer
    RealtimeServer -->|"WSS postgres_changes Broadcast"| KongAPIGateway
    KongAPIGateway -->|"WSS Push"| RealtimeManager
    RealtimeManager -->|"Reconcile Inbound Delta"| ZustandStore
    ZustandStore -->|"Emit Local Mutation"| SyncEngineGateway
```

---

## 2. Database Schema & Multi-Tenant RLS Policy Catalog

The complete relational schema is declared in [`src/data/supabase_schema.sql`](file:///home/berto/bert0ns-family-management/src/data/supabase_schema.sql#L1-L220). Multi-tenancy is enforced strictly at the database engine level via PostgreSQL Row-Level Security (RLS).

### 2.1 Entity Relationship Catalog

| Table Name       | Primary Key | Foreign Keys                                                       | Indexing & Constraints                   | Purpose & Lifecycle                                                     |
| :--------------- | :---------- | :----------------------------------------------------------------- | :--------------------------------------- | :---------------------------------------------------------------------- |
| `families`       | `id (UUID)` | None                                                               | `invite_code (UNIQUE)`                   | Root household container; defines shared currency (`€`).                |
| `family_members` | `id (UUID)` | `family_id` → `families.id`, `user_id` → `auth.users.id`           | `role IN ('ADMIN', 'MEMBER', 'VIEWER')`  | Household member profiles with custom display names and color codes.    |
| `categories`     | `id (UUID)` | `family_id` → `families.id`                                        | `family_id, name`                        | Expense categories with icons and color tags.                           |
| `budgets`        | `id (UUID)` | `family_id` → `families.id`, `category_id` → `categories.id`       | `UNIQUE(family_id, category_id, period)` | Monthly spending ceilings per category and temporal period (`YYYY-MM`). |
| `expenses`       | `id (UUID)` | `family_id`, `paid_by_member_id`, `category_id`, `import_batch_id` | `INDEX(family_id, transaction_date)`     | Core expense ledger; records amount, merchant, date, and notes.         |
| `expense_splits` | `id (UUID)` | `expense_id` → `expenses.id`, `member_id` → `family_members.id`    | `CASCADE DELETE` on expense deletion     | Cent-exact share allocations among family members.                      |
| `settlements`    | `id (UUID)` | `family_id`, `from_member_id`, `to_member_id`                      | `amount > 0`                             | Historical debt payment transfers between members.                      |
| `import_batches` | `id (UUID)` | `family_id`, `imported_by_member_id`                               | None                                     | Audit log of batch JSON import operations.                              |
| `push_tokens`    | `id (UUID)` | `user_id` → `auth.users.id`                                        | `UNIQUE(user_id, token)`                 | Native Expo push tokens for remote notification dispatch.               |

### 2.2 Row-Level Security (RLS) Policy Specifications

To prevent cross-tenant data access, all tables enforce RLS policies verifying that the requesting authenticated user belongs to the referenced `family_id`.

```sql
-- Family isolation policy helper
CREATE OR REPLACE FUNCTION public.is_member_of_family(target_family_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_id = target_family_id
      AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enforce on expenses table
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Expenses viewable only by family members"
ON public.expenses FOR SELECT
USING (public.is_member_of_family(family_id));

CREATE POLICY "Expenses insertable only by family members"
ON public.expenses FOR INSERT
WITH CHECK (public.is_member_of_family(family_id));
```

---

## 3. Offline-First Synchronization Architecture

The synchronization engine ([`src/services/syncEngine.ts`](file:///home/berto/bert0ns-family-management/src/services/syncEngine.ts#L1-L240)) implements an asynchronous outbox queue pattern backed by AsyncStorage.

```mermaid
flowchart TB
    subgraph MutationInterception ["Local Mutation Pipeline"]
        StoreAction["User Executes Store Mutation<br/>(addExpense, updateExpense, deleteExpense)"]
        StoreAction --> GenerateLocalRecord["Commit to Zustand In-Memory State Immediately"]
        GenerateLocalRecord --> PersistLocal["Persist to @bert0ns_family_storage"]
        GenerateLocalRecord --> CreateOutboxItem["Construct OutboxMutation<br/>{ id, entity, operation, payload, retry_count: 0 }"]
        CreateOutboxItem --> AppendQueue["Append to @bert0ns_sync_outbox in AsyncStorage"]
    end

    subgraph SyncTrigger ["Trigger Engine"]
        AppendQueue --> EvaluationGate{"Evaluate Flush Trigger"}
        NetworkReconnect["Network Online Event (NetInfo)"] --> EvaluationGate
        AppForeground["App Transition to Active State"] --> EvaluationGate
        ManualPull["User Pull-to-Refresh Gesture"] --> EvaluationGate
    end

    subgraph DrainProcess ["Outbox Drain Loop (syncEngine.flushOutbox)"]
        EvaluationGate --> CheckConfig{"Supabase Configured & Online?"}
        CheckConfig -->|No| SetOfflineState["Set SyncStatus: 'offline'"]
        CheckConfig -->|Yes| SetSyncingState["Set SyncStatus: 'syncing'"]

        SetSyncingState --> ReadOutbox["Fetch pending OutboxMutation[]"]
        ReadOutbox --> IterateItems["Process Items in FIFO Sequence"]

        IterateItems --> ExecuteHTTP{"Execute PostgREST Request"}
        ExecuteHTTP -->|200 OK / 201 Created| RemoveFromQueue["Remove Mutation from Outbox Queue"]
        ExecuteHTTP -->|Conflict / 409| ResolveConflict["Apply Last-Write-Wins (Compare updated_at)"]
        ExecuteHTTP -->|Network Error| IncrementRetry["Increment retry_count & Retain in Outbox"]

        RemoveFromQueue --> NextItem{"More Outbox Items?"}
        IncrementRetry --> AbortDrain["Abort Batch & Schedule Exponential Backoff"]

        NextItem -->|Yes| IterateItems
        NextItem -->|No| UpdateTimestamp["Record @bert0ns_last_sync_timestamp"]
        UpdateTimestamp --> SetSyncedState["Set SyncStatus: 'synced'"]
    end
```

---

## 4. Authentication & Family Pairing Sequence Diagram

The following sequence diagram models the end-to-end flow of user authentication, family creation, and peer device invitation pairing via GoTrue.

```mermaid
sequenceDiagram
    autonumber
    actor AdminUser as Admin Device
    actor MemberUser as Member Device
    participant AuthClient as authService.ts
    participant SupabaseAuth as Supabase GoTrue
    participant Postgres as PostgreSQL DB

    AdminUser->>AuthClient: createFamilyAndAccount(email, password, familyName)
    AuthClient->>SupabaseAuth: signUp(email, password)
    SupabaseAuth-->>AuthClient: AuthSession { user_id, access_token }
    AuthClient->>Postgres: INSERT into families (name, invite_code)
    Postgres-->>AuthClient: Family { id, invite_code: "FAM-9821" }
    AuthClient->>Postgres: INSERT into family_members (family_id, user_id, role: 'ADMIN')
    Postgres-->>AuthClient: FamilyMember { id, role: 'ADMIN' }
    AuthClient-->>AdminUser: Family Created & Pairing Code Generated

    Note over AdminUser,MemberUser: Admin shares pairing code "FAM-9821" via QR or messaging

    MemberUser->>AuthClient: joinFamilyByInviteCode(inviteCode, displayName)
    AuthClient->>Postgres: SELECT * FROM families WHERE invite_code = 'FAM-9821'
    Postgres-->>AuthClient: Family Record Found { id: "fam_abc" }
    AuthClient->>Postgres: INSERT into family_members (family_id, display_name, role: 'MEMBER')
    Postgres-->>AuthClient: FamilyMember Created
    AuthClient->>Postgres: SELECT * FROM expenses WHERE family_id = 'fam_abc'
    Postgres-->>AuthClient: Complete Family Ledger Snapshot
    AuthClient-->>MemberUser: Hydrate useAppStore & Mount Dashboard
```

---

## 5. Real-Time Live Sync & Conflict Resolution Sequence Diagram

When two family members modify the ledger simultaneously, updates are broadcast over WebSockets and reconciled using Last-Write-Wins (LWW).

```mermaid
sequenceDiagram
    autonumber
    actor DeviceA as Device A (Payer)
    participant CloudDB as Supabase PostgreSQL
    participant RealtimeHub as Supabase Realtime WSS
    actor DeviceB as Device B (Partner)
    participant StoreB as Device B useAppStore

    DeviceA->>CloudDB: POST /rest/v1/expenses (amount: 45.00, updated_at: T1)
    CloudDB->>CloudDB: Commit transaction & write WAL entry
    CloudDB->>RealtimeHub: Logical replication trigger: public.expenses
    RealtimeHub-->>DeviceB: WSS Broadcast event: INSERT / UPDATE { new: Expense, old: ... }
    DeviceB->>StoreB: realtimeSync.on('postgres_changes')
    StoreB->>StoreB: reconcileRemoteExpenses([incomingExpense])

    alt Incoming updated_at > Local updated_at
        StoreB->>StoreB: Overwrite local record with remote payload
    else Local updated_at >= Incoming updated_at
        StoreB->>StoreB: Retain local optimistic state (Local mutation takes precedence)
    end

    StoreB-->>DeviceB: Trigger UI re-render (Zero re-fetch overhead)
```

---

## 6. Privacy-First AI Statement Extraction Pipeline

To maintain the **Zero Cloud AI Guarantee**, the system decouples prompt engineering from language model execution.

```mermaid
flowchart TB
    subgraph AppSandbox ["Client Application (src/services/aiPromptGenerator.ts)"]
        UserConfig["User Selects AI Extraction in Import Tab"]
        ReadCategories["Fetch Active Household Categories (categories.ts)"]
        ReadMembers["Fetch Family Member Names (optional)"]

        UserConfig --> ReadCategories
        UserConfig --> ReadMembers

        ReadCategories --> BuildPrompt["generateBankStatementPrompt(options)"]
        ReadMembers --> BuildPrompt

        BuildPrompt --> InjectSchemaRules["Embed Strict JSON Schema Rules<br/>• date: YYYY-MM-DD<br/>• merchant: string<br/>• amount: positive number<br/>• currency: 'EUR'"]
        InjectSchemaRules --> RenderPromptCard["Display Formatted Prompt in AiPromptCard"]
        RenderPromptCard --> CopyCTA["User Taps 'Copy Prompt to Clipboard'"]
    end

    subgraph UserControlledAI ["User-Controlled External Environment"]
        CopyCTA --> LocalLLM["User Pastes Prompt into Local LLM (e.g. Ollama, Claude, ChatGPT)"]
        LocalLLM --> ProcessPDF["User provides bank statement text / PDF to LLM"]
        ProcessPDF --> LLMOutput["LLM Outputs Clean JSON adhering to schema"]
    end

    subgraph ReIngestion ["Application Ingestion"]
        LLMOutput --> PasteModal["User Pastes JSON into PasteJsonModal"]
        PasteModal --> ZodValidate["reportValidator.validate(json)"]
        ZodValidate --> CommitLedger["Commit to useAppStore (Zero Data Leakage)"]
    end
```

---

## 7. Architectural Gaps & Technical Debt

1. **Missing Exponential Retry Backoff:** When network requests fail in [`syncEngine.ts`](file:///home/berto/bert0ns-family-management/src/services/syncEngine.ts#L120-L160), failed mutations are retried immediately on the next trigger rather than utilizing randomized exponential backoff with jitter.
2. **WebSocket Heartbeat Reconnection:** If a client enters deep background execution on iOS, the WebSocket connection silently terminates; upon returning to foreground, reconnection depends on user interaction rather than automatic app lifecycle hooks.
3. **Soft Delete Tombstones:** Expenses deleted remotely are removed immediately without retaining tombstone records, which can cause resurrected items if an offline device flushes an outdated update.

---

[← Previous: Hardware Sensors & Kinematics](./04-sensors-kinematics-and-native.md) | [Index](./index.md) | [Next: Cross-Cutting Concerns →](./06-cross-cutting-concerns.md)
