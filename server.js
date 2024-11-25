import express from "express";
import cors from "cors";
import fs from "fs/promises";
import { body, validationResult } from "express-validator";
import path from "path";

const app = express();
const PORT = 3000;
const DB_FILE = path.resolve("db.json");

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to read and write the db.json
const readDB = async () => JSON.parse(await fs.readFile(DB_FILE, "utf-8"));
const writeDB = async (data) =>
	fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));

// Validation middleware
const validateBook = [
	body("title").notEmpty().trim().escape(),
	body("author").notEmpty().trim().escape(),
	body("isbn")
		.notEmpty()
		.matches(/^[\d-]{10,17}$/),
	body("publishedYear").isInt({ min: 1000, max: new Date().getFullYear() }),
];

// CRUD Routes
app.get("/api/books", async (req, res) => {
	try {
		const db = await readDB();
		res.json(db.books);
	} catch (error) {
		res.status(500).json({ error: "Error reading books" });
	}
});

app.post("/api/books", validateBook, async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}

	try {
		const db = await readDB();
		const newBook = { id: Date.now().toString(), ...req.body };
		db.books.push(newBook);
		await writeDB(db);
		res.status(201).json(newBook);
	} catch (error) {
		res.status(500).json({ error: "Error creating book" });
	}
});

app.put("/api/books/:id", validateBook, async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}

	try {
		const db = await readDB();
		const index = db.books.findIndex((book) => book.id === req.params.id);
		if (index === -1) return res.status(404).json({ error: "Book not found" });

		db.books[index] = { ...db.books[index], ...req.body };
		await writeDB(db);
		res.json(db.books[index]);
	} catch (error) {
		res.status(500).json({ error: "Error updating book" });
	}
});

app.delete("/api/books/:id", async (req, res) => {
	try {
		const db = await readDB();
		const index = db.books.findIndex((book) => book.id === req.params.id);
		if (index === -1) return res.status(404).json({ error: "Book not found" });

		db.books.splice(index, 1);
		await writeDB(db);
		res.json({ message: "Book deleted successfully" });
	} catch (error) {
		res.status(500).json({ error: "Error deleting book" });
	}
});

app.get("/api/books/search", async (req, res) => {
	const { query } = req.query;
	try {
		const db = await readDB();
		const books = db.books.filter(
			(book) =>
				book.title.toLowerCase().includes(query.toLowerCase()) ||
				book.author.toLowerCase().includes(query.toLowerCase()) ||
				book.isbn.includes(query)
		);
		res.json(books);
	} catch (error) {
		res.status(500).json({ error: "Error searching books" });
	}
});

//  Endpoints

app.get("/api/books/recommendations", async (req, res) => {
	try {
		const db = await readDB();
		const recommendations = db.books
			.sort(() => 0.5 - Math.random())
			.slice(0, 3);
		res.json(recommendations);
	} catch (error) {
		res.status(500).json({ error: "Error fetching recommendations" });
	}
});

app.get("/api/books/stats", async (req, res) => {
	try {
		const db = await readDB();
		const totalBooks = db.books.length;
		const yearStats = db.books.reduce((stats, book) => {
			stats[book.publishedYear] = (stats[book.publishedYear] || 0) + 1;
			return stats;
		}, {});
		const authorStats = db.books.reduce((stats, book) => {
			stats[book.author] = (stats[book.author] || 0) + 1;
			return stats;
		}, {});
		const topAuthors = Object.entries(authorStats)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5);

		res.json({
			totalBooks,
			yearStats,
			topAuthors,
			lastUpdated: new Date(),
		});
	} catch (error) {
		res.status(500).json({ error: "Error fetching statistics" });
	}
});

app.get("/api/books/by-decade/:decade", async (req, res) => {
	const decade = parseInt(req.params.decade);
	if (isNaN(decade) || decade < 1000 || decade > new Date().getFullYear()) {
		return res.status(400).json({ error: "Invalid decade" });
	}

	try {
		const db = await readDB();
		const books = db.books.filter(
			(book) => book.publishedYear >= decade && book.publishedYear < decade + 10
		);
		res.json(books);
	} catch (error) {
		res.status(500).json({ error: "Error fetching books by decade" });
	}
});

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
