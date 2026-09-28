const express = require("express");
const app = express();

app.use(express.json());

const { Client } = require('pg');

const databaseClient = new Client({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'danest_hotel',
  password: '0000', // Replace with your actual pgAdmin password
  port: 5432,
});


 // Function to create all hotel management tables if they do not exist
async function createHotelTables() {
    try {
        // 1. Room table
        await databaseClient.query(`
            CREATE TABLE IF NOT EXISTS rooms (
                id SERIAL PRIMARY KEY,
                room_number VARCHAR(10) UNIQUE NOT NULL,
                room_type VARCHAR(50) NOT NULL,
                price_per_night DECIMAL(10, 2) NOT NULL,
                status VARCHAR(20) DEFAULT 'Available'
            );
        `);
        console.log("🟢 Rooms table is ready to store data!");

        // 2. Guests table
        await databaseClient.query(`
            CREATE TABLE IF NOT EXISTS guests (
                id SERIAL PRIMARY KEY,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                email VARCHAR(150) UNIQUE NOT NULL,
                phone VARCHAR(20),
                nationality VARCHAR(80),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("🟢 Guests table created!");

        // 3. Bookings table
        await databaseClient.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                booking_code VARCHAR(30) UNIQUE NOT NULL,
                guest_id INTEGER REFERENCES guests(id),
                room_id INTEGER REFERENCES rooms(id),
                check_in DATE NOT NULL,
                check_out DATE NOT NULL,
                adults INTEGER DEFAULT 1,
                children INTEGER DEFAULT 0,
                total_amount DECIMAL(10,2),
                status VARCHAR(20) DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("🟢 Bookings table created!");

        // 4. Payments table
        await databaseClient.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                booking_id INTEGER REFERENCES bookings(id),
                transaction_ref VARCHAR(100),
                amount DECIMAL(10,2),
                payment_method VARCHAR(50),
                payment_status VARCHAR(20),
                paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("🟢 Payments table created!");

        // 5. Users table
        await databaseClient.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                fullname VARCHAR(120),
                email VARCHAR(150) UNIQUE,
                password VARCHAR(255),
                role VARCHAR(30)
            );
        `);
        console.log("🟢 Users table created!");
        console.log("✅ All hotel tables created or verified successfully!");

    } catch (err) {
        console.error('❌ Error creating tables:', err.message);
    }
}

// ==========================================
// 🏨 1. ROOM AVAILABILITY ENDPOINT
// ==========================================
app.get("/api/rooms/available", async (req, res) => {
    try {
        const { checkin, checkout } = req.query;

        const sql = `
          SELECT *
          FROM rooms
          WHERE id NOT IN (
            SELECT room_id
            FROM bookings
            WHERE status != 'Cancelled'
            AND check_in < $2
            AND check_out > $1
          )
          ORDER BY room_number;
        `;

        const result = await databaseClient.query(sql, [checkin, checkout]);
        res.json(result.rows);

    } catch (err) {
        console.error("❌ Error fetching available rooms:", err.message);
        res.status(500).json({ error: "Internal server error checking availability" });
    }
});

// ==========================================
// 🔌 2. SINGLE DATABASE & SERVER STARTUP BLOCK
// ==========================================
databaseClient.connect()
    .then(() => {
        console.log('🟢 Connected to Danest Hotels Database smoothly!');
        
        // This safely fires your table setup function
        createHotelTables(); 

        // Start your server only after a successful database connection
        app.listen(3000, () => {
            console.log("🚀 Server running perfectly on http://localhost:3000");
        });
    })
    .catch(err => {
        console.error('🔴 CONNECTION ERROR: Could not connect to PostgreSQL database.');
        console.error('👉 Reason:', err.message);
    });