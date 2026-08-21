const attendeeIdInput = document.getElementById('attendeeId');
const checkInButton = document.getElementById('checkInButton');

const statusCard = document.getElementById('statusCard');
const statusIcon = document.getElementById('statusIcon');
const statusTitle = document.getElementById('statusTitle');
const statusMessage = document.getElementById('statusMessage');

function showStatus(icon, title, message) {
    statusCard.classList.remove('hidden');

    statusIcon.textContent = icon;
    statusTitle.textContent = title;
    statusMessage.textContent = message;
}

function clearStatus() {
    statusCard.classList.add('hidden');
}

async function checkIn() {
    const attendeeId = attendeeIdInput.value.trim().toUpperCase();

    if (!attendeeId) {
        showStatus(
            '!',
            'Attendee ID required',
            'Please enter or scan an attendee ID.'
        );
        attendeeIdInput.focus();
        return;
    }

    checkInButton.disabled = true;

    showStatus(
        '...',
        'Printing badge',
        'Your check-in has been accepted. Waiting for badge printing to complete.'
    );

    try {
        const response = await fetch('http://localhost:5000/api/check-in', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                attendeeId: attendeeId
            })
        });

        const result = await response.json();

        if (!response.ok) {
            showStatus(
                '!',
                'Check-In Unsuccessful',
                result.message
            );

            checkInButton.disabled = false;
            attendeeIdInput.focus();
            return;
        }

        // The server accepted the request but printing is still pending.
        if (result.status === 'PENDING') {
            await waitForPrintCompletion(attendeeId, result.name);
        }

    } catch (error) {
        console.error('Check-in error:', error);

        showStatus(
            '!',
            'Connection Error',
            'Unable to connect to the check-in server.'
        );

        checkInButton.disabled = false;
        attendeeIdInput.focus();
    }
}

async function waitForPrintCompletion(attendeeId, attendeeName) {
    const maxAttempts = 15;
    let attempts = 0;

    while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        attempts++;

        try {
            const response = await fetch(
                `http://localhost:5000/api/check-in-status/${attendeeId}`
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message);
            }

            if (result.status === 'CHECKED_IN') {
                showStatus(
                    '✓',
                    'Checked In',
                    `${attendeeName}'s badge was printed successfully.`
                );

                attendeeIdInput.value = '';
                checkInButton.disabled = false;
                attendeeIdInput.focus();
                return;
            }

            if (result.status === 'PRINT_FAILED') {
                showStatus(
                    '!',
                    'Badge Printing Failed',
                    'The badge could not be printed. Please try again.'
                );

                checkInButton.disabled = false;
                attendeeIdInput.focus();
                return;
            }

            // Still PENDING — continue polling.
            showStatus(
                '...',
                'Printing badge',
                'Please wait while the badge printer processes the request.'
            );

        } catch (error) {
            console.error('Status check error:', error);

            showStatus(
                '!',
                'Status Check Failed',
                'Unable to confirm the badge printing status.'
            );

            checkInButton.disabled = false;
            attendeeIdInput.focus();
            return;
        }
    }

    // Stop polling if the printer takes too long.
    showStatus(
        '!',
        'Printing Still Pending',
        'The badge printer is taking longer than expected. Please check again shortly.'
    );

    checkInButton.disabled = false;
    attendeeIdInput.focus();
}

checkInButton.addEventListener('click', checkIn);

attendeeIdInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        checkIn();
    }
});