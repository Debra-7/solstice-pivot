const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

//Queue and worker replace the Day 3 synchronous printer call
const { addPrintJob } = require('./queue');
const { startPrinterWorker } = require('./printer-worker');
const attendees = require('./data/attendees.json');

const app = express();
const PORT = 5000;

const checkInStatus = {};

// Track queued print jobs so webhook responses can be
// matched to the correct attendee and print request.
const printJobs = {};

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.post('/api/check-in', (req, res) => {
    const { attendeeId } = req.body;

    // Find the attendee
    const attendee = attendees.find(
        (person) => person.id === attendeeId
    );

    if (!attendee) {
        return res.status(404).json({
            success: false,
            message: 'Attendee not found'
        });
    }

    // Prevent duplicate check-in requests while a badge is still
    // being printed as well as after the attendee has been checked in
    if (
        checkInStatus[attendeeId] === 'PENDING' ||
        checkInStatus[attendeeId] === 'CHECKED_IN'
    ) {
        return res.status(409).json({
            success: false,
            message: 'Attendee is already being checked in or has already checked in'
        });
    }


    //Create a unique identifier so the print request can be
    //tracked independently from the attendee.
    const jobId = crypto.randomUUID();

    const printJob = {
        jobId,
        attendeeId: attendee.id,
        name: attendee.name
    };

    // Store the relationship between the print job and attendee
// so the completion webhook can verify the job later.
    printJobs[jobId] = {
        attendeeId: attendee.id
};

    // Mark the attendee as pending before adding the job
    //This prevents another scan from creating a duplicate job
    checkInStatus[attendeeId] = 'PENDING';

    console.log(
        `Check-in request received for ${attendee.name}`
    );

    // Add the print request to the queue instead of waiting
    // synchronously for the printer to finish
    addPrintJob(printJob);

    // Return immediately. The attendee will become CHECKED_IN
    //only after the printer sends a completion webhook
    return res.status(202).json({
        success: true,
        attendeeId: attendee.id,
        name: attendee.name,
        jobId,
        status: 'PENDING',
        message: 'Check-in accepted and badge printing is pending'
    });
});

app.post('/webhook/print-complete', (req, res) => {
    const { jobId, attendeeId, status } = req.body;

    console.log(
        `Received print webhook for job ${jobId}`
    );

    if (!jobId || !attendeeId || !status) {
        return res.status(400).json({
            success: false,
            message: 'Invalid webhook payload'
        });
    }

    if (status !== 'PRINTED') {
        return res.status(400).json({
            success: false,
            message: 'Unsupported print status'
        });
    }

    // Find the print job associated with the webhook.
const printJob = printJobs[jobId];

if (!printJob) {
    return res.status(404).json({
        success: false,
        message: 'Print job not found'
    });
}

// Make sure the job belongs to the attendee in the webhook.
if (printJob.attendeeId !== attendeeId) {
    return res.status(409).json({
        success: false,
        message: 'Print job does not match attendee'
    });
}

// Only accept completion for an attendee whose check-in
// is currently waiting for the printer.
if (checkInStatus[attendeeId] !== 'PENDING') {
    return res.status(409).json({
        success: false,
        message: 'Attendee is not awaiting print completion'
    });
}

    // The attendee is only marked CHECKED_IN after the server
    //receives confirmation that printing actually completed.
    checkInStatus[attendeeId] = 'CHECKED_IN';

    // Remove the completed job from memory because it has
    // already been successfully processed.
    delete printJobs[jobId];
    
    console.log(
        `Attendee ${attendeeId} is now CHECKED_IN`
    );

    return res.json({
        success: true,
        attendeeId,
        jobId,
        status: 'CHECKED_IN',
        message: 'Print completion confirmed'
    });
});

//Start the background printer worker after the HTTP server
//has started listening for webhook requests.
app.listen(PORT, () => {
    console.log(`Solstice server running on http://localhost:${PORT}`);

    startPrinterWorker();

});

