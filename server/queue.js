// In-memory queue used to hold badge printing jobs.
// This keeps the check-in API separate from the printing process.
const printQueue = [];

// Add a new badge printing job to the queue.
function addPrintJob(job) {
    printQueue.push(job);

    console.log(`Print job ${job.jobId} added to queue`);

    return job;
}

// Remove and return the oldest job in the queue.
// This implements FIFO (First In, First Out) processing.
function getNextPrintJob() {
    return printQueue.shift();
}

// Return the number of jobs currently waiting to be processed.
function getQueueLength() {
    return printQueue.length;
}

module.exports = {
    addPrintJob,
    getNextPrintJob,
    getQueueLength
};