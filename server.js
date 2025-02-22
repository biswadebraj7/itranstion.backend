

const express = require("express");
const cors = require("cors");
const mysql = require("mysql");
const multer = require("multer");
const jwt = require('jsonwebtoken');
const fs = require("fs");
require("dotenv").config()

const PORT = 4000;
const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // JSON parsing for non-file routes

// Ensure 'public/image' directory exists
const uploadDir = "./public/image";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Database Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "mainCourse",
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.message);
  } else {
    console.log("Connected to MySQL database");
  }
});

app.post("/jwt", (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1h",
  });
  res.send({ token });
});


// Middleware to Verify Token


const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1]; // Extract token from headers

    if (!token) {
        return res.status(401).json({ message: "Unauthorized - No token provided" });
    }

    jwt.verify(token, "your_secret_key", (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Forbidden - Invalid token" });
        }
        req.user = decoded; // Attach decoded token data to request
        next();
    });
};
// Middleware to Verify Admin 
const verifyAdmin = (req, res, next) => {
  const email = req.decoded.email;
  const sql = "SELECT role FROM user WHERE email = ?";
  db.query(sql, [email], (err, result) => {
    if (err || result.length === 0 || result[0].role !== "admin") {
      return res.status(403).send({ message: "Forbidden access" });
    }
    next();
  });
};
app.get("/users", verifyToken,  (req, res) => {
  const sql = "SELECT id, name, email, role FROM user";
  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error fetching users", error: err });
    }
    res.json(result);
  });
});



// Multer Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});

const upload = multer({ storage: storage });
app.get('/create-table', (req, res) => {
  const sql = `
    CREATE TABLE IF NOT EXISTS user (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(100) NOT NULL,
      image VARCHAR(255) NOT NULL,  -- Ensure this column exists
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error('Error creating table:', err);
      return res.status(500).json({ error: "Error creating table", details: err.sqlMessage });
    }
    res.json({ message: "Users table created successfully" });
  });
});

app.get("/api/user", (req, res)=>{
  const sql= ` SELECT * FROM user`;
  db.query(sql,(err, result)=>{
    if(err){
       return res.status(500).json({error:" Error donot show data from table"})
    } else{
      res.json(result)
    }
  })
})
// Insert User Data Route
app.post("/api/user", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const query = "INSERT INTO user (name, email, password, image) VALUES (?, ?, ?, ?)";
  const values = [
    req.body.name,
    req.body.email,
    req.body.password,
    req.file.filename, // Fixed filename issue
  ];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error("Error inserting user: ", err);
      res.status(500).json({ message: "Error registering user", error: err });
    } else {
      res.status(201).json({ message: "User registered successfully", userId: result.insertId });
    }
  });
});

// Root Route
app.get("/", (req, res) => {
  res.send("Welcome to Itransition backend page");
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running at: http://localhost:${PORT}`);
});
