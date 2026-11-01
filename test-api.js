/**
 * Automated Verification Script for Lab 02 CRUD Routes
 * Tests all 5 required endpoints against http://localhost:3000/
 */

const BASE_URL = "http://localhost:3000";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  console.log("==================================================");
  console.log("🚀 Starting Automated API Verification for Lab 02");
  console.log("==================================================\n");

  let createdBookId = null;

  try {
    // 0. Verify Root API Route
    console.log("👉 Test 0: GET / (Root API info)");
    const rootRes = await fetch(`${BASE_URL}/`);
    const rootData = await rootRes.json();
    console.log(`Status: ${rootRes.status}`);
    console.log("Response:", JSON.stringify(rootData, null, 2));
    if (rootRes.status !== 200) throw new Error("Root route failed");
    console.log("✅ Test 0 Passed!\n");

    // 1. GET /books/
    console.log("👉 Test 1: GET /books/ (Retrieve all books)");
    const allBooksRes = await fetch(`${BASE_URL}/books/`);
    const allBooks = await allBooksRes.json();
    console.log(`Status: ${allBooksRes.status}`);
    console.log(`Found ${allBooks.length} books in the database.`);
    console.log("Sample First 2 Books:", JSON.stringify(allBooks.slice(0, 2), null, 2));
    if (allBooksRes.status !== 200 || allBooks.length < 10) {
      throw new Error("Failed to retrieve all 10 books");
    }
    console.log("✅ Test 1 Passed: 10 initial sample books retrieved!\n");

    // 2. GET /books/:bookId/
    console.log("👉 Test 2: GET /books/1/ (Retrieve book by ID = 1)");
    const singleBookRes = await fetch(`${BASE_URL}/books/1/`);
    const singleBook = await singleBookRes.json();
    console.log(`Status: ${singleBookRes.status}`);
    console.log("Book Details:", JSON.stringify(singleBook, null, 2));
    if (singleBookRes.status !== 200 || singleBook.id !== 1) {
      throw new Error("Failed to retrieve single book by ID");
    }
    console.log("✅ Test 2 Passed: Single book retrieved successfully!\n");

    // 2b. GET /books/999/ (Edge case - Not Found)
    console.log("👉 Test 2b: GET /books/999/ (Non-existent book - 404 test)");
    const notFoundRes = await fetch(`${BASE_URL}/books/999/`);
    const notFoundData = await notFoundRes.json();
    console.log(`Status: ${notFoundRes.status} (Expected 404)`);
    console.log("Response:", JSON.stringify(notFoundData, null, 2));
    if (notFoundRes.status !== 404) throw new Error("Expected 404 for non-existent book");
    console.log("✅ Test 2b Passed: Correct 404 Not Found returned!\n");

    // 3. POST /books/
    console.log("👉 Test 3: POST /books/ (Add a new book)");
    const newBookPayload = {
      title: "Computer Networks: A Systems Approach",
      author: "Larry L. Peterson & Bruce S. Davie",
      price: 849,
      pages: 920
    };
    const postRes = await fetch(`${BASE_URL}/books/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newBookPayload)
    });
    const postData = await postRes.json();
    console.log(`Status: ${postRes.status} (Expected 201)`);
    console.log("Response:", JSON.stringify(postData, null, 2));
    if (postRes.status !== 201 || !postData.bookId) {
      throw new Error("Failed to create new book");
    }
    createdBookId = postData.bookId;
    console.log(`✅ Test 3 Passed: Book added with ID ${createdBookId}!\n`);

    // Verify insertion in database
    console.log(`👉 Test 3b: GET /books/${createdBookId}/ (Verify newly inserted book)`);
    const verifyPostRes = await fetch(`${BASE_URL}/books/${createdBookId}/`);
    const verifyPostData = await verifyPostRes.json();
    console.log(`Status: ${verifyPostRes.status}`);
    console.log("Retrieved New Book:", JSON.stringify(verifyPostData, null, 2));
    if (verifyPostData.title !== newBookPayload.title) {
      throw new Error("Created book data mismatch");
    }
    console.log("✅ Test 3b Passed: Verified book is persisted in SQLite!\n");

    // 4. PUT /books/:bookId/
    console.log(`👉 Test 4: PUT /books/${createdBookId}/ (Update the new book)`);
    const updatedPayload = {
      title: "Computer Networks: A Systems Approach (Updated 6th Ed)",
      author: "Larry L. Peterson & Bruce S. Davie",
      price: 899,
      pages: 950
    };
    const putRes = await fetch(`${BASE_URL}/books/${createdBookId}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedPayload)
    });
    const putData = await putRes.json();
    console.log(`Status: ${putRes.status}`);
    console.log("Response:", JSON.stringify(putData, null, 2));
    if (putRes.status !== 200) throw new Error("Failed to update book");
    console.log("✅ Test 4 Passed: Book updated successfully!\n");

    // Verify update in database
    console.log(`👉 Test 4b: GET /books/${createdBookId}/ (Verify updated record)`);
    const verifyPutRes = await fetch(`${BASE_URL}/books/${createdBookId}/`);
    const verifyPutData = await verifyPutRes.json();
    console.log(`Status: ${verifyPutRes.status}`);
    console.log("Updated Book in DB:", JSON.stringify(verifyPutData, null, 2));
    if (verifyPutData.price !== 899 || verifyPutData.pages !== 950) {
      throw new Error("Updated book data mismatch in database");
    }
    console.log("✅ Test 4b Passed: Verified update is persisted in SQLite!\n");

    // 5. DELETE /books/:bookId/
    console.log(`👉 Test 5: DELETE /books/${createdBookId}/ (Delete the book)`);
    const deleteRes = await fetch(`${BASE_URL}/books/${createdBookId}/`, {
      method: "DELETE"
    });
    const deleteData = await deleteRes.json();
    console.log(`Status: ${deleteRes.status}`);
    console.log("Response:", JSON.stringify(deleteData, null, 2));
    if (deleteRes.status !== 200) throw new Error("Failed to delete book");
    console.log("✅ Test 5 Passed: Book deleted successfully!\n");

    // Verify deletion in database (Should return 404)
    console.log(`👉 Test 5b: GET /books/${createdBookId}/ (Verify book no longer exists)`);
    const verifyDeleteRes = await fetch(`${BASE_URL}/books/${createdBookId}/`);
    const verifyDeleteData = await verifyDeleteRes.json();
    console.log(`Status: ${verifyDeleteRes.status} (Expected 404)`);
    console.log("Response:", JSON.stringify(verifyDeleteData, null, 2));
    if (verifyDeleteRes.status !== 404) {
      throw new Error("Book still exists in database after delete operation");
    }
    console.log("✅ Test 5b Passed: Verified book is completely removed from SQLite!\n");

    console.log("==================================================");
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! CRUD VERIFIED!");
    console.log("==================================================");
  } catch (err) {
    console.error("❌ Test Failed:", err.message);
    process.exit(1);
  }
}

runTests();
