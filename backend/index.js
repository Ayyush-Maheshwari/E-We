const mysql = require('mysql');
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 5500;

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
  }));

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "", 
    database: "ewe"
});

connection.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());



function insertData() {
    let sqlBike = "INSERT INTO bike (bike_no, model, availability, insurance_no, license_no, distance, images) VALUES ?";
    let valuesBike = [
        ['xx 5674 zz', 'Simpl-E', 'Available', 'Insurance001', 'License001', 1000, 'icon _Motor Scooter_'],
        ['xx 5793 zz', 'Simpl-E+', 'Available', 'Insurance002', 'License002', 2000, 'icon _Motor Scooter_'],
        ['xx 9092 zz', 'Sport-E', 'Available', 'Insurance003', 'License003', 3000, 'icon _Off-road Motorcycle_'],
        ['xx 9183 zz', 'Sport-E+', 'Available', 'Insurance004', 'License004', 4000, 'icon _Off-road Motorcycle_']
    ];

    let sqlCar = "INSERT INTO car (car_no, model, availability, insurance_no, license_no, distance, images) VALUES ?";
    let valuesCar = [
        ['xx 5574 zz', 'Coup-E', 'Available', 'Insurance001', 'License001', 1000,'icon _car sports_'],
        ['xx 5792 zz', 'Coup-E+', 'Available', 'Insurance002', 'License002', 2000,'icon _car sports_'],
        ['xx 8593 zz', 'Breez-E', 'Available', 'Insurance003', 'License003', 3000,'icon _car sports vehicle_'],
        ['xx 9123 zz', 'Breez-E+', 'Available', 'Insurance004', 'License004', 4000,'icon _car sports vehicle_']
    ];

    connection.query(sqlBike, [valuesBike], function(err, result) {
        if (err) throw err;
        console.log("Number of records inserted into bike table: " + result.affectedRows);
    });

    connection.query(sqlCar, [valuesCar], function(err, result) {
        if (err) throw err;
        console.log("Number of records inserted into car table: " + result.affectedRows);
    });
}

app.post('/insert-dates', (req, res) => {
    const { pickup_date, dropoff_date, vehicle_no, vehicle_type } = req.body;

    // Calculate duration in days
    const pickupDate = new Date(pickup_date);
    const dropoffDate = new Date(dropoff_date);
    const durationInMilliseconds = dropoffDate - pickupDate;
    const durationInDays = durationInMilliseconds / (1000 * 60 * 60 * 24);

    // Query to get the price per day based on the vehicle type
    const getPriceQuery = `SELECT price_day FROM ${vehicle_type} WHERE ${vehicle_type}_no = ?`;

    connection.query(getPriceQuery, [vehicle_no], (priceErr, priceResults) => {
        if (priceErr) {
            console.error('Error fetching price per day:', priceErr);
            return res.status(500).json({ error: 'Internal Server Error', message: priceErr.message });
        }

        if (priceResults.length === 0) {
            console.error('Vehicle not found or invalid:', vehicle_no);
            return res.status(404).json({ error: 'Not Found', message: 'Vehicle not found or invalid.' });
        }

        const pricePerDay = priceResults[0].price_day;
        const totalAmount = pricePerDay * durationInDays;

        // Define the table name based on the vehicle type
        let tableName = "";
        if (vehicle_type === "bike") {
            tableName = "bike";
        } else if (vehicle_type === "car") {
            tableName = "car";
        }

        // Update the availability of the selected vehicle
        const availabilityUpdateQuery = `UPDATE ${tableName} SET availability = 'Unavailable' WHERE ${tableName}_no = ?`;

        connection.beginTransaction(err => {
            if (err) {
                console.error('Error starting transaction:', err);
                res.status(500).json({ error: 'Internal Server Error', message: err.message });
                return;
            }

            connection.query(availabilityUpdateQuery, [vehicle_no], (availabilityUpdateErr, availabilityUpdateResult) => {
                if (availabilityUpdateErr) {
                    console.error('Error updating availability:', availabilityUpdateErr);
                    connection.rollback(() => {
                        console.error('Transaction rolled back.');
                        res.status(500).json({ error: 'Internal Server Error', message: availabilityUpdateErr.message });
                    });
                    return;
                }

                // Insert booking data into the bookings table
                const insertBookingQuery = 'INSERT INTO bookings (pickup_date, dropoff_date, duration, vehicle_no, vehicle_type, total) VALUES (?, ?, ?, ?, ?, ?)';

                connection.query(insertBookingQuery, [pickup_date, dropoff_date, durationInDays, vehicle_no, vehicle_type, totalAmount], (insertErr, insertResult) => {
                    if (insertErr) {
                        console.error('Error inserting booking data:', insertErr);
                        connection.rollback(() => {
                            console.error('Transaction rolled back.');
                            res.status(500).json({ error: 'Internal Server Error', message: insertErr.message });
                        });
                        return;
                    }

                    connection.commit(err => {
                        if (err) {
                            console.error('Error committing transaction:', err);
                            connection.rollback(() => {
                                console.error('Transaction rolled back.');
                                res.status(500).json({ error: 'Internal Server Error', message: err.message });
                            });
                            return;
                        }

                        console.log('Transaction committed successfully.');
                        // Include the availabilityUpdated flag in the response
                        res.status(201).json({ message: 'Data inserted successfully', availabilityUpdated: true });

                        // Set a timeout to make the vehicle available again after the temporary duration
                        const temporaryDuration = 60; // Temporary duration in seconds
                        const timeout = setTimeout(() => {
                            console.log('Timeout triggered. Resetting availability...');
                            const availabilityResetQuery = `UPDATE ${tableName} SET availability = 'Available' WHERE ${tableName}_no = ?`;
                            connection.query(availabilityResetQuery, [vehicle_no], (resetErr, resetResult) => {
                                if (resetErr) {
                                    console.error('Error resetting availability:', resetErr);
                                } else {
                                    console.log('Availability reset successfully.');
                                }
                            });
                        }, temporaryDuration * 1000); // Convert seconds to milliseconds

                        // If login is not done after clicking "book now", rollback availability after timeout
                        req.session.timeoutId = timeout;
                    });
                });
            });
        });
    });
});


app.get('/bookings', (req, res) => {
    const userEmail = currentUserEmail; // Retrieve email from the variable
    if (!userEmail) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User not logged in.' });
    }

    const query = 'SELECT * FROM bookings WHERE email = ?';
    connection.query(query, [userEmail], (err, bookings) => {
        if (err) {
            console.error("Error fetching bookings data:", err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.json(bookings);
            console.log("Bookings data:", bookings);
        }
    });
});

let currentUserEmail = null;

app.post('/login', (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    if (!email || !password) {
        return res.status(400).json({ error: 'Bad Request', message: 'Email and password are required.' });
    }

    const loginQuery = "SELECT * FROM login WHERE email = ?";
    const updateEmailQuery = "UPDATE BOOKINGS SET email = ? WHERE email is NULL and id = (SELECT MAX(id) FROM BOOKINGS)";

    connection.query(loginQuery, [email], (err, results) => {
        if (err) {
            console.error('Error executing login query:', err);
            return res.status(500).json({ error: 'Internal Server Error', message: err.message });
        }

        if (results.length === 0) {
            // No user found with the provided email
            return res.status(404).json({ error: 'Not Found', message: 'User not found. Please check your credentials.' });
        }

        const user = results[0];
        if (user.password !== password) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Incorrect password.' });
        }

        // Update the currentUserEmail variable with the email of the latest person who logs in
        currentUserEmail = email;

        // Execute the query to update the email in the last inserted row of the BOOKINGS table
        connection.query(updateEmailQuery, [email], (updateErr, updateResult) => {
            if (updateErr) {
                console.error('Error updating email in BOOKINGS table:', updateErr);
                return res.status(500).json({ error: 'Internal Server Error', message: updateErr.message });
            }

            res.status(200).json({ message: 'Login successful', user: user });
        });
    });
});


app.post('/signup', (req, res) => {
    const pname = req.body.name;
    const ppass = req.body.password;
    const pemail = req.body.email;
    const plicence_no = req.body.licence_no; // Add this line to capture license number

    connection.query('INSERT INTO login (name, email, password, licence_no) VALUES (?, ?, ?, ?)', [pname, pemail, ppass, plicence_no], (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error occurred');
        } else {
            console.log('User signed up successfully');
            res.status(201).send(data);
        }
    });
});

app.get('/bikedata', (req, res) => {
    const query = 'SELECT * FROM bike';
    connection.query(query, (err, data) => {
        if (err) {
            console.error("Error fetching bike data:", err);
            res.status(201).json({ error: 'Internal Server Error' });
        } else {
            res.json(data);
            console.log("Bike data:", data);
        }
    });
});

app.get('/cardata', (req, res) => {
    const query = 'SELECT * FROM car';
    connection.query(query, (err, cardata) => {
        if (err) {
            console.error("Error fetching car data:", err);
            res.status(201).json({ error: 'Internal Server Error' });
        } else {
            res.json(cardata);
            console.log("Car data:", cardata);
        }
    });
});

app.listen(port, () => {
    console.log("Server is running on port", port);
});


// Call the insertData function to insert data when necessary
// insertData();