# Technical Requirement Document (TRD)
## Time-Off Microservice – ReadyOn

---

## Document Version History

### Version Control

| Version | Date | Author | Description | Status |
|---------|------|--------|-------------|--------|
| 0.1 | 29-04-2026 | Ameer Hamza | Final version with complete system design, test strategy, and deployment plan | Final |

---

## Objective

The objective of this system is to design a Time-Off Microservice for ReadyOn that allows employees to request leave and ensures accurate tracking of leave balances. The system must stay synchronized with an external Human Capital Management (HCM) system, which acts as the source of truth for all employee balance data.

The service should support real-time leave requests, maintain consistency between systems, and handle updates from both user actions and external HCM changes such as balance refreshes or policy updates.

It must ensure that employees always see correct balances and that all leave operations remain valid even in cases of system delays or failures.

---

## Scope

This system is responsible for managing employee time-off requests and maintaining accurate leave balances in coordination with an external Human Capital Management (HCM) system. It provides backend APIs that allow employees to create and view leave requests, while ensuring that all balance data remains synchronized with HCM through both real-time and batch mechanisms.

The service handles core operations such as leave request creation, approval and rejection workflows, balance retrieval per employee and location, and synchronization of balance data from HCM. It also performs validation of requests against available balances to ensure consistency and correctness.

The system is strictly limited to leave management and integration logic. It does not cover areas such as payroll processing, employee onboarding or profile management beyond identifiers required for leave tracking, frontend/UI development, or any internal implementation details of the HCM system itself.

---

## Functional Requirements

**FR-1: Create Time-Off Request**  
The system shall allow an employee to submit a time-off request for a specified date range and location.

**FR-2: Validate Leave Balance (Pre-check)**  
The system shall validate the requested time-off against the employee's available balance before submission using the HCM real-time API.

**FR-3: Handle Invalid Requests**  
The system shall reject requests that:
* exceed available balance
* contain invalid employee or location combinations
* fail HCM validation

**FR-4: Request Lifecycle Management**  
The system shall maintain the lifecycle of a request with the following states:
* PENDING
* APPROVED
* REJECTED

**FR-5: Manager Approval Workflow**  
The system shall allow managers to approve or reject pending time-off requests.

**FR-6: Balance Update on Approval**  
Upon approval of a request, the system shall:
* update the employee's leave balance
* synchronize the update with the HCM system

**FR-7: Fetch Leave Balance**  
The system shall provide an API to retrieve the current leave balance for an employee, segmented by location.

**FR-8: Real-Time HCM Integration**  
The system shall integrate with HCM real-time APIs to:
* validate leave requests
* update balances upon approval

**FR-9: Batch Synchronization**  
The system shall support ingestion of batch balance updates from HCM and reconcile local data accordingly.

**FR-10: External Balance Updates Handling**  
The system shall correctly handle externally triggered balance changes (e.g., work anniversary updates) received via batch synchronization.

---

## Non-Functional Requirements

**NFR-1: Performance (Latency)**  
The system shall respond to balance retrieval and time-off request APIs within 200–500 milliseconds under normal operating conditions.

**NFR-2: Consistency Model**  
The system shall maintain eventual consistency between ReadyOn and the HCM system.

**NFR-3: Real-Time Validation Consistency**  
The system shall use real-time HCM APIs to validate time-off requests before processing them.

**NFR-4: Batch Reconciliation Consistency**  
The system shall periodically reconcile local balances with HCM using batch synchronization.

**NFR-5: Fault Tolerance**  
The system shall handle HCM failures without causing inconsistent state in the local system.

**NFR-6: Idempotency**  
All write operations shall be idempotent to prevent duplicate processing and inconsistent data.

**NFR-7: Concurrency Control**  
The system shall correctly handle concurrent requests without causing race conditions or data corruption.

**NFR-8: Data Integrity**  
The system shall ensure that leave balances remain accurate and do not become negative under any condition.

---

## Challenges & Risks

**Challenge 1: Balance Synchronization Complexity**  
**Problem:** HCM is the source of truth, but ReadyOn needs low-latency balance queries. Keeping systems in sync is difficult when both can change independently.  
**Risk:** Stale data leading to incorrect approvals or rejections.  
**Mitigation:** Implement defensive dual-check (local cache + real-time HCM validation), periodic batch sync to reconcile differences, and version tracking on balance records.

**Challenge 2: HCM Unreliability**  
**Problem:** HCM may be slow, unavailable, or return incorrect data (e.g., silently succeed on insufficient balance).  
**Risk:** System downtime or data corruption.  
**Mitigation:** Local balance check as first line of defense, timeout and retry logic for HCM calls, rollback mechanism for partial failures, and graceful degradation when HCM is down.

**Challenge 3: Race Conditions**  
**Problem:** Two concurrent approval requests for the same employee could both succeed if balance checks aren't atomic.  
**Risk:** Over-allocation of leave days.  
**Mitigation:** Optimistic locking with version field on balance records, database-level unique constraints, and transaction isolation for critical operations.

---

## System Architecture

### 6.1 High-Level Architecture

The system follows a three-tier architecture with clear separation of concerns:

```
Client Layer → API Layer (NestJS Controllers) → Business Logic Layer (Services) → Data Access Layer (Repositories) → Database (SQLite) → External Integration (HCM System)
```

The service maintains a local balance cache in SQLite for fast queries while treating HCM as the authoritative source of truth. All approval operations validate against both local cache and HCM in real-time. Batch synchronization runs periodically to reconcile any drift between systems.

---

## Data Models

### 7.1 Entities

**Employee Entity**
- `id`: UUID (Primary Key)
- `name`: string
- `email`: string (Unique)
- `role`: enum (EMPLOYEE, MANAGER)
- `createdAt`: timestamp
- `updatedAt`: timestamp

**Balance Entity**
- `employeeId`: UUID (Foreign Key, Composite Primary Key)
- `locationId`: string (Composite Primary Key)
- `availableDays`: number
- `usedDays`: number
- `version`: number (for optimistic locking)
- `hcmSyncedAt`: timestamp
- `updatedAt`: timestamp

**TimeOffRequest Entity**
- `id`: UUID (Primary Key)
- `employeeId`: UUID (Foreign Key)
- `locationId`: string
- `startDate`: date
- `endDate`: date
- `days`: number
- `status`: enum (PENDING, APPROVED, REJECTED, CANCELLED)
- `idempotencyKey`: string (Unique)
- `createdAt`: timestamp
- `updatedAt`: timestamp

### 7.2 Relationships

**Employee to Balance: One-to-Many**  
An employee can have multiple balance records, one for each location. The composite key (employeeId, locationId) ensures uniqueness per employee-location combination.

**Employee to TimeOffRequest: One-to-Many**  
An employee can create multiple time-off requests over time. Each request is linked to the employee via employeeId foreign key.

**Balance to TimeOffRequest: Implicit**  
Requests reference both employeeId and locationId, which together identify the relevant balance record. When a request is approved, the corresponding balance is decremented.

---

## Data Synchronization Strategy

### 9.1 Real-Time Sync

Triggered during the approval workflow to ensure strong consistency for critical operations.

**Flow:**
1. Check local balance (fast, defensive validation)
2. Query HCM for current balance (source of truth)
3. If sufficient, deduct from HCM first
4. Update local balance
5. If local update fails, rollback HCM deduction

**Advantages:** Always validates against source of truth, prevents over-allocation  
**Disadvantages:** Adds latency to approval flow, dependent on HCM availability

### 9.2 Batch Sync

Triggered on schedule (e.g., hourly).

**Flow:**
1. Fetch all balances from HCM batch endpoint
2. For each balance, upsert into local database
3. Update hcmSyncedAt timestamp
4. Log sync results (success/failure counts)

**Advantages:** Reconciles any drift, handles bulk updates efficiently, can run during low-traffic periods  
**Disadvantages:** Eventual consistency with lag between HCM update and local sync

### 9.3 Conflict Resolution

When local balance differs from HCM balance, HCM always wins as the source of truth. Batch sync overwrites local balance with HCM data. No merge logic is needed. Local usedDays is recalculated based on approved requests in the system.

---

## Design Decisions & Alternatives

**1. Hybrid Synchronization Approach**  
**Decision:** Use both real-time validation and batch reconciliation.  
**Alternative:** Pure real-time sync would be simpler but fails during HCM downtime. Pure batch sync would be more resilient but provides stale data. Hybrid approach balances accuracy with availability.

**2. Cache-First Balance Retrieval**  
**Decision:** Store balances locally and sync periodically, showing last sync timestamp to users.  
**Alternative:** Always fetch from HCM in real-time. Rejected due to latency and HCM availability concerns. Local cache provides fast reads while batch sync ensures eventual consistency.

**3. Optimistic Locking for Concurrency**  
**Decision:** Use database version field to detect concurrent modifications.  
**Alternative:** Pessimistic locking would prevent conflicts but reduces throughput. Optimistic approach allows higher concurrency with retry logic for rare conflicts.

---

## Suggested Approach

The solution uses hybrid synchronization: real-time validation during time-off requests and periodic batch reconciliation to handle external HCM balance updates.

The architecture follows three layers: controllers for HTTP handling, services for business logic and HCM integration, and repositories for data persistence. Balance data is cached locally with timestamps for fast reads.

For resilience, the system implements idempotency keys, retry logic for HCM calls, and optimistic locking to prevent race conditions during concurrent requests.
