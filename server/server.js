const express = require('express');
const cors = require('cors');
const path = require('path');

const { printBadge } = require('./printer');
const attendees = require('./data/attendees.json');

const app = express();
const PORT = 5000;

const checkInStatus = {};

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.post('/api/check-in', async (req, res) => {
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

    // Check whether the attendee has already been checked in
    if (checkInStatus[attendeeId] === 'CHECKED_IN') {
        return res.status(409).json({
            success: false,
            message: 'Attendee is already checked in'
        });
    }

    console.log(`Starting check-in for ${attendee.name}`);

    // Synchronously wait for the printer to finish
    const printResult = await printBadge(attendee);

    if (!printResult.success) {
        return res.status(500).json({
            success: false,
            message: 'Badge printing failed'
        });
    }

    // Only mark the attendee checked in after printing succeeds
    checkInStatus[attendeeId] = 'CHECKED_IN';

    return res.json({
        success: true,
        attendeeId: attendee.id,
        name: attendee.name,
        status: 'CHECKED_IN',
        message: 'Attendee checked in successfully'
    });
});

app.listen(PORT, () => {
    console.log(`Solstice server running on http://localhost:${PORT}`);
});