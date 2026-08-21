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
        'Please wait while the badge printer processes the request.'
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

        if (response.ok) {
            showStatus(
                '✓',
                'Checked In',
                `${result.name}'s badge was printed successfully.`
            );

            attendeeIdInput.value = '';
        } else {
            showStatus(
                '!',
                'Check-In Unsuccessful',
                result.message
            );
        }

    } catch (error) {
        console.error('Check-in error:', error);

        showStatus(
            '!',
            'Connection Error',
            'Unable to connect to the check-in server.'
        );

    } finally {
        checkInButton.disabled = false;
        attendeeIdInput.focus();
    }
}

checkInButton.addEventListener('click', checkIn);

attendeeIdInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        checkIn();
    }
});