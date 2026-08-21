# Day 4 Pivot Journal

## Objective

Refactor the Solstice Events check-in prototype from a synchronous
badge-printing flow to an asynchronous, message-driven flow.

The Day 3 implementation is preserved on the `main` branch.
Day 4 development is being completed on the `day4-pivot` branch.

## Day 4 - Initial Architecture

The original Day 3 flow waited for the printer to complete before
returning a successful check-in response.

The Day 4 design introduces:

- A print job queue
- A printer worker
- A PENDING check-in state
- A print-completion webhook
- Job identifiers for tracking print requests

## Design Decision: In-Process Queue

An in-process JavaScript queue was selected for this prototype
because Docker/RabbitMQ could not be reliably configured in the
development environment.

The queue is implemented as a separate module in `server/queue.js`.

### Trade-off

An in-process queue is not durable and would not be appropriate
for a production system. A production implementation could use
RabbitMQ, Redis/BullMQ, or a managed cloud queue.

The purpose of this prototype is to demonstrate the asynchronous
message-driven architecture and the handling of delayed completion.

## Day 4 Implementation

### Queue

`server/queue.js` stores print jobs until the printer worker
processes them.

### Printer Worker

`server/printer-worker.js` consumes queued jobs and simulates
an external printer taking three seconds to complete the job.

After printing completes, the worker sends an HTTP POST request
to the print-completion webhook.

### Webhook

`POST /webhook/print-complete` receives the print completion
notification and changes an attendee from `PENDING` to
`CHECKED_IN`.

## Important Architectural Principle

The printer worker does not directly change the attendee's
check-in state.

The server changes the state only after receiving the
print-completion webhook.

This keeps the printer processing separate from the check-in
business logic.

## Testing Checkpoint

The initial Day 4 asynchronous flow was tested successfully.

### Tests Completed

- Valid attendee returned `202 Accepted` with `PENDING` status.
- Print jobs were added to the queue.
- The printer worker processed queued jobs.
- The worker sent a print-completion webhook.
- The webhook changed the attendee state from `PENDING` to `CHECKED_IN`.
- Duplicate check-in attempts returned `409 Conflict`.
- Invalid attendee IDs returned `404 Not Found`.
- The check-in request returned before the simulated three-second
  printing process completed.

### Result

The Day 4 prototype successfully demonstrates the intended
asynchronous check-in flow without waiting synchronously for
badge printing.

## Job Correlation and Webhook Validation

The prototype was strengthened to associate each generated print
job ID with its attendee ID.

The print-completion webhook now verifies:

1. The job ID exists.
2. The job belongs to the attendee specified in the webhook.
3. The attendee is currently in the PENDING state.

Completed jobs are removed from the in-memory job tracking object
after successful processing.

### Validation Tests

- Normal queued print flow: passed.
- Unknown/fake job ID: rejected with `404 Print job not found`.
- Duplicate check-in: rejected with `409 Conflict`.
- Invalid attendee: rejected with `404 Attendee not found`.

A real-job/wrong-attendee test was identified as an additional
correlation test but was not completed manually because the
prototype's simulated three-second print window made the timing
awkward for manual testing.

## Failure Handling Decision

The asynchronous flow must distinguish successful printing from
failed printing.

The server will only transition an attendee from `PENDING` to
`CHECKED_IN` after receiving a valid `PRINTED` completion webhook.

If the printer reports a failure, the attendee will be moved to
a `PRINT_FAILED` state and will not be considered checked in.

### Reason

A successful API request only confirms that the check-in request
was accepted. It does not prove that the physical badge was
successfully printed.

Separating request acceptance from print completion prevents an
attendee from being incorrectly marked as checked in when the
printer operation fails.

### Prototype Limitation

The prototype will simulate printer failures rather than
communicating with a physical printer.

A production implementation would require persistent job storage,
retry policies, failure monitoring, and potentially a dead-letter
queue for jobs that repeatedly fail.

## Failure Handling Test

The printer worker was temporarily configured to force a simulated
printing failure in order to test the failure path deterministically.

The test confirmed that:

- A check-in request initially entered the `PENDING` state.
- The simulated printer reported `PRINT_FAILED`.
- The server changed the attendee state to `PRINT_FAILED`.
- The attendee was not incorrectly marked as `CHECKED_IN`.
- A subsequent check-in request for the same attendee was accepted.
- The retry generated a new print job ID and returned the attendee
  to the `PENDING` state.

The printer simulation was then restored to its normal probabilistic
success/failure behavior.

## End-to-End UI Validation

The kiosk UI was updated to support the asynchronous printing model.

When a check-in request is accepted, the UI now displays a pending
"Printing badge" state instead of immediately displaying "Checked In".

The UI periodically checks the attendee's check-in status through the
server while the printer worker processes the job.

### Successful Flow

A successful test confirmed that:

1. The attendee check-in request was accepted with `PENDING` status.
2. The UI displayed the pending printing state.
3. The printer worker processed the queued job.
4. The printer completion webhook was received.
5. The attendee transitioned to `CHECKED_IN`.
6. The UI then displayed "Checked In".

### Duplicate Scan Test

A second check-in attempt for an attendee who was already
`CHECKED_IN` was rejected. No second print job was created.

### Failure and Retry Test

A deterministic printer failure was temporarily enabled during testing.

The test confirmed that:

1. The check-in request entered `PENDING`.
2. The printer worker reported `PRINT_FAILED`.
3. The server changed the attendee state to `PRINT_FAILED`.
4. The UI displayed a badge printing failure message.
5. A subsequent check-in request was accepted as a retry.
6. The retry generated a new print job.

The printer simulation was restored to its normal success/failure
behavior after testing.

## Pivot Outcome

The Day 3 synchronous printer flow was replaced on the `day4-pivot`
branch with an asynchronous queue-based workflow.

The new design separates check-in request acceptance from physical
badge printing. An attendee is only considered checked in after the
server receives a valid successful print completion webhook.