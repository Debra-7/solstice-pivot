const http = require('http');

const {
    getNextPrintJob,
    getQueueLength
} = require('./queue');

// Start a background worker that continuously checks
// for pending badge printing jobs.
function startPrinterWorker() {
    console.log('Printer worker started');

    setInterval(() => {
        // Do nothing when there are no jobs waiting.
        if (getQueueLength() === 0) {
            return;
        }

        // Process the oldest job first.
        const job = getNextPrintJob();

        console.log(
            `Processing print job ${job.jobId} for ${job.name}`
        );

        // Simulate the external printer taking time
        // to complete the badge printing operation.
        setTimeout(() => {
    // Simulate the result of the external printer.
    const printSucceeded = Math.random() >= 0.2;
    if (printSucceeded) {
        console.log(
            `Badge printed successfully for ${job.name}`
        );

        sendPrintWebhook(job, 'PRINTED');
    } else {
        console.log(
            `Badge printing failed for ${job.name}`
        );

        sendPrintWebhook(job, 'PRINT_FAILED');
    }
}, 3000);

    }, 500);
}

// Send an HTTP webhook to the check-in server to confirm
// that the badge printing job has completed.
function sendPrintWebhook(job, status) {
    const webhookData = JSON.stringify({
        jobId: job.jobId,
        attendeeId: job.attendeeId,
        status
    });

    const request = http.request(
        {
            hostname: 'localhost',
            port: 5000,
            path: '/webhook/print-complete',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(webhookData)
            }
        },
        (response) => {
            console.log(
                `Webhook sent for job ${job.jobId}. ` +
                `Server responded with ${response.statusCode}`
            );
        }
    );

    // Log network errors so failed webhook deliveries
    // can be identified during testing.
    request.on('error', (error) => {
        console.error(
            `Failed to send webhook for job ${job.jobId}:`,
            error.message
        );
    });

    request.write(webhookData);
    request.end();
}

module.exports = {
    startPrinterWorker
};