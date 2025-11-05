const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const userRoutes = require('./routes/users');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/api/users', userRoutes);
// Import models
const Book = require('./models/Book');
const User = require('./models/User');
const Author = require('./models/Author');
const Category = require('./models/Category');
const Loan = require('./models/Loan');
const { authMiddleware } = require('./middleware/auth');

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library_management', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})

.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));
console.log('🔐 MODEL DEBUG: Checking registered models...');
console.log('🔐 MODEL DEBUG: Mongoose models:', Object.keys(mongoose.models));
try {
    const User = require('./models/User');
    console.log('✅ USER MODEL: Successfully required in server');
} catch (error) {
    console.error('❌ USER MODEL: Failed to require in server:', error);
}
// API Routes
// API Routes - ONLY THE FILES YOU ACTUALLY HAVE
app.use('/api/books', require('./routes/books'));
app.use('/api/users', require('./routes/users'));
app.use('/api/authors', require('./routes/authors'));
app.use('/api/loans', require('./routes/loans'));

// Add these routes directly to server (no separate files):
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/check', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin') {
        res.json({ isAdmin: true });
    } else {
        res.json({ isAdmin: false });
    }
});
// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK',
        database: mongoose.connection.readyState === 1 ? 'MongoDB Connected' : 'MongoDB Disconnected',
        timestamp: new Date().toISOString()
    });
});

// Seed sample data (One-time setup)
app.post('/api/seed', async (req, res) => {
    try {
        // Clear existing data
        await Book.deleteMany({});
        await User.deleteMany({});
        await Author.deleteMany({});
        await Category.deleteMany({});
        await Loan.deleteMany({});

        // Create categories
        const categories = await Category.insertMany([
            { name: "أدب", description: "الأدب العربي والعالمي" },
            { name: "رواية", description: "الروايات العربية والعالمية" },
            { name: "تاريخ", description: "كتب التاريخ والحضارات" },
            { name: "علوم", description: "الكتب العلمية والتعليمية" }
        ]);

        // Create authors
        const authors = await Author.insertMany([
            { 
                name: "طه حسين", 
                bio: "أديب وناقد مصري، لقب بعميد الأدب العربي",
                nationality: "مصري",
                birthYear: 1889,
                deathYear: 1973
            },
            { 
                name: "إليف شافاق", 
                bio: "روائية تركية تكتب باللغتين التركية والإنجليزية",
                nationality: "تركية",
                birthYear: 1971
            },
            { 
                name: "ابن خلدون", 
                bio: "مؤرخ وعالم اجتماع عربي",
                nationality: "عربي",
                birthYear: 1332,
                deathYear: 1406
            }
        ]);

        // Create books
        const books = await Book.insertMany([
            {
                title: "الأيام",
                author: authors[0]._id,
                isbn: "9789770930054",
                category: categories[0]._id,
                publisher: "دار المعارف",
                publishedYear: 1929,
                summary: "سيرة ذاتية للأديب طه حسين",
                language: "Arabic",
                totalCopies: 5,
                availableCopies: 3
            },
            {
                title: "قواعد العشق الأربعون",
                author: authors[1]._id,
                isbn: "9789770931235",
                category: categories[1]._id,
                publisher: "دار الشروق",
                publishedYear: 2010,
                summary: "رواية عن التصوف والحب الإلهي",
                language: "Arabic",
                totalCopies: 3,
                availableCopies: 1
            },
            {
                title: "مقدمة ابن خلدون",
                author: authors[2]._id,
                isbn: "9789770932348",
                category: categories[2]._id,
                publisher: "دار الكتب العلمية",
                publishedYear: 1377,
                summary: "أحد أهم كتب التاريخ والفلسفة وعلم الاجتماع",
                language: "Arabic",
                totalCopies: 2,
                availableCopies: 2
            }
        ]);

        // Create sample user
        const user = await User.create({
            name: "أحمد محمد",
            email: "ahmed@example.com",
            password: "password123",
            universityId: "2024001",
            phone: "0123456789",
            role: "admin"
        });
        

        res.json({ 
            message: '✅ Sample data seeded successfully!',
            statistics: {
                categories: categories.length,
                authors: authors.length,
                books: books.length,
                users: 1
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 MongoDB Server running on port ${PORT}`);
    console.log(`📚 Frontend: http://localhost:${PORT}`);
    console.log(`🔗 API: http://localhost:${PORT}/api`);
    console.log(`🌱 Seed data: POST http://localhost:${PORT}/api/seed`);
    console.log(`💾 Database: MongoDB`);
});
// Loans routes - ADD THIS
app.post('/api/loans', async (req, res) => {
    try {
        const { userId, bookId, dueDate } = req.body;
        
        // Check if book exists and is available
        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        if (book.availableCopies < 1) {
            return res.status(400).json({ message: 'No available copies of this book' });
        }
        
        // Create loan
        const loan = new Loan({
            user: userId,
            book: bookId,
            dueDate: new Date(dueDate)
        });
        
        await loan.save();
        
        // Update book available copies
        book.availableCopies -= 1;
        await book.save();
        
        res.status(201).json(loan);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});
// Add new book route
app.post('/api/books', async (req, res) => {
    try {
        const { title, authorId, categoryId, publishedYear, summary, totalCopies, isbn, publisher } = req.body;
        
        // Validate required fields
        if (!title || !authorId || !categoryId) {
            return res.status(400).json({ 
                message: 'العنوان، المؤلف، والتصنيف حقول مطلوبة' 
            });
        }

        const book = new Book({
            title,
            author: authorId,
            category: categoryId,
            publishedYear: publishedYear || new Date().getFullYear(),
            summary: summary || '',
            totalCopies: totalCopies || 1,
            availableCopies: totalCopies || 1,
            isbn: isbn || '',
            publisher: publisher || '',
            language: 'Arabic'
        });

        await book.save();
        
        // Populate the response with author and category details
        await book.populate('author', 'name');
        await book.populate('category', 'name');

        res.status(201).json({
            message: 'تم إضافة الكتاب بنجاح!',
            book: book
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});
// Return book route
app.put('/api/loans/:id/return', async (req, res) => {
    try {
        const loan = await Loan.findById(req.params.id);
        
        if (!loan) {
            return res.status(404).json({ message: 'Loan not found' });
        }
        
        if (loan.status === 'returned') {
            return res.status(400).json({ message: 'Book already returned' });
        }
        
        // Update loan
        loan.returnDate = new Date();
        loan.status = 'returned';
        
        await loan.save();
        
        // Update book available copies
        const book = await Book.findById(loan.book);
        if (book) {
            book.availableCopies += 1;
            await book.save();
        }
        
        res.json(loan);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});
// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
    const { username, password } = req.body;
    
    // Simple admin authentication (in real app, use proper auth)
    if (username === 'admin' && password === 'admin') {
        req.user = { username: 'admin', role: 'admin' };
        next();
    } else {
        res.status(401).json({ message: 'غير مصرح بالدخول' });
    }
};

// Admin login route
app.post('/api/admin/login', authenticateAdmin, (req, res) => {
    res.json({ 
        message: 'تم تسجيل الدخول كمسؤول',
        user: req.user
    });
});

// Check if user is admin (for frontend)
app.post('/api/admin/check', (req, res) => {
    const { username, password } = req.body;
    
    if (username === 'admin' && password === 'admin') {
        res.json({ isAdmin: true });
    } else {
        res.json({ isAdmin: false });
    }
});

// Protect book creation route with admin check
app.post('/api/books', async (req, res) => {
    try {
        const { title, authorId, categoryId, publishedYear, summary, totalCopies, isbn, publisher, adminAuth } = req.body;
        
        // Check if admin is authenticated
        if (!adminAuth || adminAuth.username !== 'admin' || adminAuth.password !== 'admin') {
            return res.status(403).json({ 
                message: 'غير مصرح لك بإضافة كتب. يلزم صلاحيات المسؤول.' 
            });
        }

        // Validate required fields
        if (!title || !authorId || !categoryId) {
            return res.status(400).json({ 
                message: 'العنوان، المؤلف، والتصنيف حقول مطلوبة' 
            });
        }

        const book = new Book({
            title,
            author: authorId,
            category: categoryId,
            publishedYear: publishedYear || new Date().getFullYear(),
            summary: summary || '',
            totalCopies: totalCopies || 1,
            availableCopies: totalCopies || 1,
            isbn: isbn || '',
            publisher: publisher || '',
            language: 'Arabic'
        });

        await book.save();
        
        // Populate the response with author and category details
        await book.populate('author', 'name');
        await book.populate('category', 'name');

        res.status(201).json({
            message: 'تم إضافة الكتاب بنجاح!',
            book: book
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});
// In your server-mongodb.js, update the loans route:

// Loans routes - FIXED VERSION
app.post('/api/loans', async (req, res) => {
    try {
        const { userId, bookId, dueDate } = req.body;
        
        console.log('Creating loan with:', { userId, bookId, dueDate });
        
        // Check if book exists and is available
        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        if (book.availableCopies < 1) {
            return res.status(400).json({ message: 'No available copies of this book' });
        }
        
        // For demo purposes, use the first user from database instead of the string ID
        const realUser = await User.findOne();
        if (!realUser) {
            return res.status(400).json({ message: 'No users found in system' });
        }
        
        // Create loan with real user ID
        const loan = new Loan({
            user: realUser._id, // Use the real MongoDB ObjectId
            book: bookId,
            dueDate: new Date(dueDate)
        });
        
        await loan.save();
        
        // Update book available copies
        book.availableCopies -= 1;
        await book.save();
        
        // Populate the response
        await loan.populate('user', 'name email');
        await loan.populate('book', 'title');
        
        res.status(201).json(loan);
    } catch (error) {
        console.error('Loan creation error:', error);
        res.status(400).json({ message: error.message });
    }
});

// Add this route for creating new authors
app.post('/api/authors', async (req, res) => {
    try {
        const { name, bio, nationality, birthYear } = req.body;
        
        if (!name) {
            return res.status(400).json({ message: 'اسم المؤلف مطلوب' });
        }

        const author = new Author({
            name,
            bio: bio || '',
            nationality: nationality || '',
            birthYear: birthYear || null
        });

        await author.save();

        res.status(201).json({
            message: 'تم إضافة المؤلف بنجاح!',
            author: author
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});
// Add this line with your other route imports
const adminRoutes = require('./routes/admin');

// Add this line with your other app.use() routes
app.use('/api/admin', adminRoutes);