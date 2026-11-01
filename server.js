/**
 * B.Tech Backend Development Fundamentals - Lab 02
 * Project Title: SQLite Database and CRUD Routes
 *
 * Student Name: P. Pradeep Yadav
 * Registration Number: 252U1R7083
 *
 * Description:
 * This Express.js application connects to an SQLite database (database.db)
 * and exposes RESTful API endpoints to perform complete CRUD operations on
 * the `book` table using parameterized queries.
 *
 * Compatible with both local Node.js / Nodemon runtime and Vercel serverless functions.
 */

const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware configuration
app.use(express.json()); // Parses incoming JSON payloads
app.use(cors()); // Enables Cross-Origin Resource Sharing

// Database file path:
// On Vercel Serverless, the root filesystem is read-only.
// We copy database.db to /tmp/database.db where SQLite has full read/write permissions.
let dbPath;
if (process.env.VERCEL) {
  dbPath = path.join("/tmp", "database.db");
  const sourceDb = path.join(__dirname, "database.db");
  if (!fs.existsSync(dbPath) && fs.existsSync(sourceDb)) {
    try {
      fs.copyFileSync(sourceDb, dbPath);
      console.log("Database copied to /tmp for Vercel write access.");
    } catch (e) {
      console.error("Error copying database to /tmp on Vercel:", e.message);
    }
  }
} else {
  dbPath = path.join(__dirname, "database.db");
}

let db = null;

// Initial 10 sample book records to seed the database
const sampleBooks = [
  { title: "Clean Code", author: "Robert C. Martin", price: 650, pages: 464 },
  { title: "The Pragmatic Programmer", author: "Andrew Hunt & David Thomas", price: 799, pages: 352 },
  { title: "JavaScript: The Good Parts", author: "Douglas Crockford", price: 450, pages: 176 },
  { title: "Eloquent JavaScript", author: "Marijn Haverbeke", price: 550, pages: 472 },
  { title: "You Don't Know JS: Scope & Closures", author: "Kyle Simpson", price: 399, pages: 278 },
  { title: "Introduction to Algorithms", author: "Thomas H. Cormen", price: 1250, pages: 1312 },
  { title: "Design Patterns", author: "Erich Gamma et al.", price: 899, pages: 395 },
  { title: "Node.js Design Patterns", author: "Mario Casciaro", price: 950, pages: 664 },
  { title: "Designing Data-Intensive Applications", author: "Martin Kleppmann", price: 1100, pages: 616 },
  { title: "Refactoring", author: "Martin Fowler", price: 850, pages: 448 }
];

/**
 * Seeds the database with 10 sample book records if table is empty.
 */
const seedDatabase = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS book (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        price INTEGER NOT NULL,
        pages INTEGER NOT NULL
      );
    `;
    await db.run(createTableQuery);

    const checkQuery = `SELECT COUNT(*) AS count FROM book;`;
    const countResult = await db.get(checkQuery);

    if (countResult && countResult.count === 0) {
      console.log("Seeding initial 10 sample book records into the database...");
      for (const book of sampleBooks) {
        await db.run(
          `INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?);`,
          [book.title, book.author, book.price, book.pages]
        );
      }
      console.log("Successfully seeded 10 sample books!");
    }
  } catch (error) {
    console.error("Error setting up / seeding database table:", error.message);
  }
};

/**
 * Connects to SQLite and seeds the database if needed.
 */
const initializeDB = async () => {
  if (db) return db;
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });
  await seedDatabase();
  return db;
};

/**
 * Initializes the SQLite Database and starts the Express server.
 * Ensures the server only listens after a successful DB connection.
 */
const initializeDBAndServer = async () => {
  try {
    await initializeDB();
    console.log("Connected to SQLite database successfully.");

    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}/`);
    });
  } catch (error) {
    console.error(`Database Initialization Error: ${error.message}`);
    process.exit(1);
  }
};

// Express middleware: ensures database is connected on serverless invocations (e.g. Vercel)
app.use(async (req, res, next) => {
  try {
    if (!db) {
      await initializeDB();
    }
    next();
  } catch (error) {
    console.error("Database connection middleware error:", error.message);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Database connection failed"
    });
  }
});

// Run local server when executed directly via node or nodemon
if (require.main === module) {
  initializeDBAndServer();
}

/* ==========================================================================
   REST API ROUTES / CRUD ENDPOINTS
   ========================================================================== */

/**
 * Root Route: GET /
 * Provides API information and available endpoints.
 */
app.get("/", (req, res) => {
  res.status(200).json({
    message: "B.Tech Backend Development Fundamentals - Lab 02 API",
    student: "P. Pradeep Yadav",
    registrationNumber: "252U1R7083",
    status: "Server is running & SQLite Database is connected",
    environment: process.env.VERCEL ? "Vercel Serverless" : "Local Environment",
    availableEndpoints: {
      "GET /books/": "Retrieve all books",
      "GET /books/:bookId/": "Retrieve a specific book by ID",
      "POST /books/": "Add a new book (JSON body: title, author, price, pages)",
      "PUT /books/:bookId/": "Update an existing book by ID (JSON body: title, author, price, pages)",
      "DELETE /books/:bookId/": "Delete a book by ID"
    }
  });
});

/**
 * 1. GET /books/
 * Retrieve all books from the database.
 */
app.get("/books/", async (req, res) => {
  try {
    const getBooksQuery = `
      SELECT
        id,
        title,
        author,
        price,
        pages
      FROM
        book
      ORDER BY
        id ASC;
    `;
    const booksList = await db.all(getBooksQuery);
    res.status(200).json(booksList);
  } catch (error) {
    console.error("Error fetching books:", error.message);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to retrieve books from database"
    });
  }
});

/**
 * 2. GET /books/:bookId/
 * Retrieve a single book using its ID.
 */
app.get("/books/:bookId/", async (req, res) => {
  const { bookId } = req.params;

  // Validate ID format
  if (isNaN(bookId)) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Book ID must be a valid integer"
    });
  }

  try {
    const getBookQuery = `
      SELECT
        id,
        title,
        author,
        price,
        pages
      FROM
        book
      WHERE
        id = ?;
    `;
    const book = await db.get(getBookQuery, [bookId]);

    if (!book) {
      return res.status(404).json({
        error: "Not Found",
        message: `Book with ID ${bookId} not found`
      });
    }

    res.status(200).json(book);
  } catch (error) {
    console.error(`Error fetching book ${bookId}:`, error.message);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to retrieve book from database"
    });
  }
});

/**
 * 3. POST /books/
 * Add a new book into the database using parameterized query.
 */
app.post("/books/", async (req, res) => {
  const { title, author, price, pages } = req.body;

  // Validation: ensure all required fields are provided
  if (!title || !author || price === undefined || pages === undefined) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Please provide all required fields: title, author, price, pages"
    });
  }

  // Type validation
  if (typeof price !== "number" || typeof pages !== "number") {
    return res.status(400).json({
      error: "Bad Request",
      message: "Price and pages must be numbers"
    });
  }

  try {
    const addBookQuery = `
      INSERT INTO book (title, author, price, pages)
      VALUES (?, ?, ?, ?);
    `;
    const dbResponse = await db.run(addBookQuery, [title, author, price, pages]);

    res.status(201).json({
      message: "Book Added Successfully",
      bookId: dbResponse.lastID
    });
  } catch (error) {
    console.error("Error adding book:", error.message);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to add book to database"
    });
  }
});

/**
 * 4. PUT /books/:bookId/
 * Update an existing book's details using parameterized query.
 */
app.put("/books/:bookId/", async (req, res) => {
  const { bookId } = req.params;
  const { title, author, price, pages } = req.body;

  // Validate ID
  if (isNaN(bookId)) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Book ID must be a valid integer"
    });
  }

  // Validation: ensure required fields are provided
  if (!title || !author || price === undefined || pages === undefined) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Please provide all required fields: title, author, price, pages"
    });
  }

  try {
    // Check if the book exists first
    const checkBookQuery = `SELECT id FROM book WHERE id = ?;`;
    const existingBook = await db.get(checkBookQuery, [bookId]);

    if (!existingBook) {
      return res.status(404).json({
        error: "Not Found",
        message: `Book with ID ${bookId} not found`
      });
    }

    // Update book record
    const updateBookQuery = `
      UPDATE book
      SET
        title = ?,
        author = ?,
        price = ?,
        pages = ?
      WHERE
        id = ?;
    `;
    await db.run(updateBookQuery, [title, author, price, pages, bookId]);

    res.status(200).json({
      message: "Book Updated Successfully"
    });
  } catch (error) {
    console.error(`Error updating book ${bookId}:`, error.message);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update book in database"
    });
  }
});

/**
 * 5. DELETE /books/:bookId/
 * Delete a book from the database using parameterized query.
 */
app.delete("/books/:bookId/", async (req, res) => {
  const { bookId } = req.params;

  // Validate ID
  if (isNaN(bookId)) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Book ID must be a valid integer"
    });
  }

  try {
    // Check if the book exists first
    const checkBookQuery = `SELECT id FROM book WHERE id = ?;`;
    const existingBook = await db.get(checkBookQuery, [bookId]);

    if (!existingBook) {
      return res.status(404).json({
        error: "Not Found",
        message: `Book with ID ${bookId} not found`
      });
    }

    // Delete the record
    const deleteBookQuery = `DELETE FROM book WHERE id = ?;`;
    await db.run(deleteBookQuery, [bookId]);

    res.status(200).json({
      message: "Book Deleted Successfully"
    });
  } catch (error) {
    console.error(`Error deleting book ${bookId}:`, error.message);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to delete book from database"
    });
  }
});

// Fallback 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    error: "Route Not Found",
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Export app and DB initializer for testing and Vercel serverless deployment
module.exports = app;
module.exports.initializeDB = initializeDB;
module.exports.initializeDBAndServer = initializeDBAndServer;
