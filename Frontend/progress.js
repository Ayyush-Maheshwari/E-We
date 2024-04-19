document.addEventListener('DOMContentLoaded', function() {
    const progressValue = document.querySelector('.progress-value');
    let storedWidth = localStorage.getItem('progressWidth');

    // Initialize progress bar width from localStorage
    if (storedWidth) {
        progressValue.style.width = storedWidth;
    } else {
        // Ensure the initial width is set to 0% if not already set
        progressValue.style.width = '0%';
    }

    // Function to increase progress value
    function increaseProgress() {
        // Get the current width of progress-value as a percentage
        const currentWidthPercentage = parseFloat(progressValue.style.width);
        // Increase the width by exactly 1%
        const newWidthPercentage = currentWidthPercentage + 2;
        // Limit the maximum width to 100%
        progressValue.style.width = Math.min(newWidthPercentage, 100) + '%';

        // Store updated width in localStorage
        localStorage.setItem('progressWidth', progressValue.style.width);
    }

    // Event listener for the find rides button (submitbtn in home.html)
    // const findRidesButton = document.getElementById('submitbtn');
    // if (findRidesButton) {
    //     findRidesButton.addEventListener('click', function() {
    //         increaseProgress(); // Call the function to increase progress value
    //     });
    // }

    // Event listener for the bookbtn button in car.html
    const bookButton = document.getElementById('submitbtn');
    if (bookButton) {
        bookButton.addEventListener('click', function() {
            increaseProgress(); // Call the function to increase progress value
        });
    }
});
// localStorage.clear()
