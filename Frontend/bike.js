document.addEventListener('DOMContentLoaded', function() {
    // Check if the page needs to be refreshed
    if (localStorage.getItem('refreshPage') === 'true') {
        localStorage.removeItem('refreshPage'); // Remove the flag to prevent repeated refreshing
        setTimeout(function() {
            window.location.reload(); // Refresh the page after a delay
        }, 1000); // 1000 milliseconds = 1 second
    }

    // Set flag for availability update
    let availabilityUpdated = false;

    // Fetch bike data from your Express server
    const fetchBikeData = () => {
        const bikeContainer = document.getElementById('bikeContainer');
        fetch('http://localhost:5500/bikedata')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                data.forEach(bike => {
                    const bikeButton = document.createElement('button');
                    bikeButton.classList.add('bike');
                    bikeButton.type = 'button';

                    const bikeImage = document.createElement('img');
                    bikeImage.src = `./${bike.images}.png`;
                    bikeButton.appendChild(bikeImage);

                    const bikeDetailsList = document.createElement('ul');

                    const bikeNo = document.createElement('li');
                    bikeNo.textContent = `Bike No: ${bike.bike_no}`;
                    bikeDetailsList.appendChild(bikeNo);

                    const model = document.createElement('li');
                    model.textContent = `Model: ${bike.model}`;
                    bikeDetailsList.appendChild(model);

                    const price = document.createElement('li');
                    price.textContent = `Price: ₹${bike.price_day}/day`;
                    bikeDetailsList.appendChild(price);

                    const availability = document.createElement('li');
                    availability.textContent = `Availability: ${bike.availability}`;
                    bikeDetailsList.appendChild(availability);

                    bikeButton.appendChild(bikeDetailsList);

                    bikeButton.addEventListener('click', function() {
                        document.querySelectorAll('.bike').forEach(function(btn) {
                            btn.classList.remove('active');
                        });
                        this.classList.add('active');
                    });

                    bikeContainer.appendChild(bikeButton);
                });
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            });
    };

    fetchBikeData();

    document.getElementById('book').addEventListener('click', function() {
        const rideData = JSON.parse(localStorage.getItem('rideData'));
    
        if (rideData) {
            const selectedVehicle = document.querySelector('.active');
            const selectedVehicleNo = selectedVehicle.querySelector('li:first-child').textContent.split(':')[1].trim();
            const selectedVehicleType = selectedVehicle.classList.contains('bike') ? 'bike' : 'car';
            const availability = selectedVehicle.querySelector('li:last-child').textContent.split(':')[1].trim();
    
            if (availability === 'Available') {
                rideData.vehicle_no = selectedVehicleNo;
                rideData.vehicle_type = selectedVehicleType;
    
                fetch('http://localhost:5500/insert-dates', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(rideData)
                })
                .then(response => {
                    if (response.ok) {
                        selectedVehicle.querySelector('li:last-child').textContent = 'Availability: Unavailable';
                        window.location.href = 'login.html';
                        console.log("Booking confirmed");
    
                        // Set flag to true after availability updates
                        availabilityUpdated = true;
                       
                    } else {
                        throw new Error('Failed to insert dates.');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    if (error.message === 'Failed to insert dates.') {
                        alert("Failed to insert dates. Please try again.");
                    } else {
                        alert("There was an error processing your booking. Please try again later.");
                    }
                });
            } else {
                alert("This ride is currently unavailable and cannot be booked.");
            }
        } else {
            alert("No ride data found. Please select your ride details first.");
        }
    });

    
    // Reload the page after 60 seconds if availability has updated
    setInterval(() => {
        if (availabilityUpdated = true) {
            window.location.reload();
        }
    }, 60000); // 60 seconds in milliseconds
});
