const attendeeIdInput = document.getElementById('attendeeId');
const checkInButton = document.getElementById('checkInButton');
const statusMessage = document.getElementById('status');

checkInButton.addEventListener('click', async () => {
    const attendeeId = attendeeIdInput.value.trim();

    if (!attendeeId) {
        statusMessage.textContent = 'Please enter an attendee ID.';
        return;
    }

    statusMessage.textContent = 'Printing badge...';
    checkInButton.disabled = true;

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

        if (response.ok) {
            statusMessage.textContent =
                `${result.name} is Checked In. Badge printed successfully.`;
        } else {
            statusMessage.textContent = result.message;
        }

    } catch (error) {
        console.error('Check-in error:', error);
        statusMessage.textContent =
            'Unable to connect to the check-in server.';
    } finally {
        checkInButton.disabled = false;
    }
});