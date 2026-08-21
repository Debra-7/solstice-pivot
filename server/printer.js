function printBadge(attendee) {
    return new Promise((resolve) => {
        console.log(`Printer received badge request for ${attendee.name}`);

        setTimeout(() => {
            console.log(`Badge printed successfully for ${attendee.name}`);

            resolve({
                success: true,
                message: `Badge printed successfully for ${attendee.name}`
            });
        }, 3000);
    });
}

module.exports = {
    printBadge
};