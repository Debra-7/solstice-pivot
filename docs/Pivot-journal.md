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