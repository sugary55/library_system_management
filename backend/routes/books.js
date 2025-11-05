const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Book = require('../models/Book');
const Author = require('../models/Author'); // Make sure this is imported
const Category = require('../models/Category'); // Make sure this is imported
const Loan = require('../models/Loan');
const { authMiddleware, requireAdmin } = require('../middleware/auth'); // Add this

// Apply auth middleware to ALL book routes
router.use(authMiddleware);

// Add new book with auto-create author/category (Admin only)
router.post('/auto-create', requireAdmin, async (req, res) => {
    try {
        const { title, authorName, categoryName, publishedYear, summary, totalCopies, isbn, publisher } = req.body;
        
        console.log('📚 ADD BOOK AUTO-CREATE: Request received');
        console.log('📦 Book data:', req.body);

        if (!title || !authorName || !categoryName) {
            return res.status(400).json({ 
                message: 'العنوان، المؤلف، والتصنيف حقول مطلوبة' 
            });
        }

        // 1. Find or create author
        let author = await Author.findOne({ name: authorName });
        if (!author) {
            console.log('✅ Creating new author:', authorName);
            author = new Author({
                name: authorName,
                nationality: 'غير محدد',
                bio: ''
            });
            await author.save();
        }

        // 2. Find or create category
        let category = await Category.findOne({ name: categoryName });
        if (!category) {
            console.log('✅ Creating new category:', categoryName);
            category = new Category({
                name: categoryName,
                description: ''
            });
            await category.save();
        }

        // 3. Create book
        const book = new Book({
            title,
            author: author._id,
            category: category._id,
            publishedYear: publishedYear || new Date().getFullYear(),
            summary: summary || '',
            totalCopies: totalCopies || 1,
            availableCopies: totalCopies || 1,
            isbn: isbn || '',
            publisher: publisher || '',
            language: 'Arabic'
        });

        await book.save();
        
        // Populate response
        await book.populate('author', 'name');
        await book.populate('category', 'name');

        console.log('✅ ADD BOOK AUTO-CREATE: Book created successfully');

        res.status(201).json({
            message: 'تم إضافة الكتاب بنجاح!',
            book: book,
            newAuthor: !author._id, // Indicates if author was newly created
            newCategory: !category._id // Indicates if category was newly created
        });
        
    } catch (error) {
        console.error('❌ ADD BOOK AUTO-CREATE ERROR:', error);
        res.status(500).json({ 
            message: 'خطأ في إضافة الكتاب',
            error: error.message 
        });
    }
});

// Get all books (available to all authenticated users)
router.get('/', async (req, res) => {
    try {
        const { search, category, author } = req.query;
        let query = {};

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { summary: { $regex: search, $options: 'i' } }
            ];
        }

        const books = await Book.find(query)
            .populate('author', 'name nationality')
            .populate('category', 'name')
            .sort({ title: 1 });

        res.json({
            books: books,
            totalPages: 1,
            currentPage: 1,
            total: books.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add new book (Admin only) - WITH EXISTING AUTHOR
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { title, authorId, categoryId, publishedYear, summary, totalCopies, isbn, publisher } = req.body;
        
        console.log('📚 ADD BOOK: Request received by admin:', req.user.name);
        console.log('📦 Book data:', req.body);

        if (!title || !authorId || !categoryId) {
            return res.status(400).json({ 
                message: 'العنوان، المؤلف، والتصنيف حقول مطلوبة' 
            });
        }

        // Check if author exists
        const authorExists = await Author.findById(authorId);
        if (!authorExists) {
            return res.status(404).json({ 
                message: 'المؤلف غير موجود' 
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
        
        // Populate the response
        await book.populate('author', 'name');
        await book.populate('category', 'name');

        console.log('✅ ADD BOOK: Book created successfully:', book.title);

        res.status(201).json({
            message: 'تم إضافة الكتاب بنجاح!',
            book: book
        });
    } catch (error) {
        console.error('❌ ADD BOOK ERROR:', error);
        res.status(400).json({ message: error.message });
    }
});

// Add new book WITH NEW AUTHOR (Admin only)
// Add new book with auto-create author/category (Admin only)
router.post('/auto-create', requireAdmin, async (req, res) => {
    try {
        const { title, authorName, categoryName, publishedYear, summary, totalCopies, isbn, publisher } = req.body;
        
        console.log('📚 ADD BOOK AUTO-CREATE: Request received');
        console.log('📦 Book data:', req.body);

        if (!title || !authorName || !categoryName) {
            return res.status(400).json({ 
                message: 'العنوان، المؤلف، والتصنيف حقول مطلوبة' 
            });
        }

        // 1. Find or create author
        let author = await Author.findOne({ name: authorName });
        if (!author) {
            console.log('✅ Creating new author:', authorName);
            author = new Author({
                name: authorName,
                nationality: 'غير محدد',
                bio: ''
            });
            await author.save();
        }

        // 2. Find or create category
        let category = await Category.findOne({ name: categoryName });
        if (!category) {
            console.log('✅ Creating new category:', categoryName);
            category = new Category({
                name: categoryName,
                description: ''
            });
            await category.save();
        }

        // 3. Create book
        const book = new Book({
            title,
            author: author._id,
            category: category._id,
            publishedYear: publishedYear || new Date().getFullYear(),
            summary: summary || '',
            totalCopies: totalCopies || 1,
            availableCopies: totalCopies || 1,
            isbn: isbn || '',
            publisher: publisher || '',
            language: 'Arabic'
        });

        await book.save();
        
        // Populate response
        await book.populate('author', 'name');
        await book.populate('category', 'name');

        console.log('✅ ADD BOOK AUTO-CREATE: Book created successfully');

        res.status(201).json({
            message: 'تم إضافة الكتاب بنجاح!',
            book: book,
            newAuthor: !author._id, // Indicates if author was newly created
            newCategory: !category._id // Indicates if category was newly created
        });
        
    } catch (error) {
        console.error('❌ ADD BOOK AUTO-CREATE ERROR:', error);
        res.status(500).json({ 
            message: 'خطأ في إضافة الكتاب',
            error: error.message 
        });
    }
});

// Delete book (Admin only) - WITH LOAN CHECK
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const bookId = req.params.id;
        console.log('🗑️ DELETE BOOK: Attempting to delete book:', bookId);
        
        // Check if book has active loans
        const activeLoans = await Loan.findOne({ 
            book: bookId, 
            status: 'active' 
        });
        
        if (activeLoans) {
            return res.status(400).json({ 
                message: 'لا يمكن حذف الكتاب لأنه معار حالياً' 
            });
        }
        
        const deletedBook = await Book.findByIdAndDelete(bookId);
        
        if (!deletedBook) {
            return res.status(404).json({ 
                message: 'الكتاب غير موجود' 
            });
        }
        
        console.log('✅ DELETE BOOK: Successfully deleted:', deletedBook.title);
        res.json({ 
            message: '✅ تم حذف الكتاب بنجاح!' 
        });
        
    } catch (error) {
        console.error('❌ DELETE BOOK ERROR:', error);
        res.status(500).json({ 
            message: 'خطأ في حذف الكتاب: ' + error.message 
        });
    }
});

// ==================== SINGLE BOOK OPERATIONS ====================

// Get single book by ID - DEBUG VERSION
router.get('/:id', async (req, res) => {
    try {
        console.log('📖 GET SINGLE BOOK: Request received');
        console.log('📦 Book ID:', req.params.id);
        
        const bookId = req.params.id;
        
        // Validate book ID
        if (!bookId || !mongoose.Types.ObjectId.isValid(bookId)) {
            console.log('❌ GET SINGLE BOOK: Invalid book ID');
            return res.status(400).json({ 
                message: 'معرف الكتاب غير صحيح' 
            });
        }
        
        console.log('🔍 GET SINGLE BOOK: Looking for book...');
        
        // Find book and populate author and category
        const book = await Book.findById(bookId)
            .populate('author', 'name nationality bio')
            .populate('category', 'name description');
        
        if (!book) {
            console.log('❌ GET SINGLE BOOK: Book not found');
            return res.status(404).json({ 
                message: 'الكتاب غير موجود' 
            });
        }
        
        console.log('✅ GET SINGLE BOOK: Book found:', book.title);
        console.log('📖 Book details:', {
            id: book._id,
            title: book.title,
            author: book.author?.name,
            category: book.category?.name,
            availableCopies: book.availableCopies
        });
        
        res.json(book);
        
    } catch (error) {
        console.error('❌ GET SINGLE BOOK ERROR:', error);
        res.status(500).json({ 
            message: 'خطأ في جلب تفاصيل الكتاب',
            error: error.message 
        });
    }
});

// Update book by ID - DEBUG VERSION (Admin only)
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        console.log('✏️ UPDATE BOOK: Request received');
        console.log('📦 Book ID:', req.params.id);
        console.log('📦 Update data:', req.body);
        console.log('👤 Admin user:', req.user.name);
        
        const bookId = req.params.id;
        const { title, categoryName, publishedYear, summary, totalCopies, isbn, publisher } = req.body;
        
        // Validate book ID
        if (!bookId || !mongoose.Types.ObjectId.isValid(bookId)) {
            console.log('❌ UPDATE BOOK: Invalid book ID');
            return res.status(400).json({ 
                message: 'معرف الكتاب غير صحيح' 
            });
        }
        
        // Validate required fields
        if (!title || !categoryName) {
            console.log('❌ UPDATE BOOK: Missing required fields');
            return res.status(400).json({ 
                message: 'العنوان والتصنيف حقول مطلوبة' 
            });
        }
        
        console.log('🔍 UPDATE BOOK: Looking for book...');
        
        // Find the book
        const book = await Book.findById(bookId);
        if (!book) {
            console.log('❌ UPDATE BOOK: Book not found');
            return res.status(404).json({ 
                message: 'الكتاب غير موجود' 
            });
        }
        
        console.log('✅ UPDATE BOOK: Book found:', book.title);
        
        // Find or create category
        let category = await Category.findOne({ name: categoryName });
        if (!category) {
            console.log('✅ UPDATE BOOK: Creating new category:', categoryName);
            category = new Category({
                name: categoryName,
                description: ''
            });
            await category.save();
        }
        
        console.log('✅ UPDATE BOOK: Category resolved:', category.name);
        
        // Update book fields
        book.title = title;
        book.category = category._id;
        book.publishedYear = publishedYear || book.publishedYear;
        book.summary = summary || book.summary;
        book.totalCopies = totalCopies || book.totalCopies;
        book.isbn = isbn || book.isbn;
        book.publisher = publisher || book.publisher;
        
        // Update available copies if total copies changed
        if (totalCopies && totalCopies !== book.totalCopies) {
            const copiesDifference = totalCopies - book.totalCopies;
            book.availableCopies = Math.max(0, book.availableCopies + copiesDifference);
            console.log('📊 UPDATE BOOK: Copies updated - total:', totalCopies, 'available:', book.availableCopies);
        }
        
        await book.save();
        
        // Populate the response
        await book.populate('author', 'name');
        await book.populate('category', 'name');
        
        console.log('✅ UPDATE BOOK: Book updated successfully:', book.title);
        console.log('📊 Final book data:', {
            title: book.title,
            category: book.category.name,
            copies: book.totalCopies,
            available: book.availableCopies
        });
        
        res.json({
            message: 'تم تحديث الكتاب بنجاح!',
            book: book
        });
        
    } catch (error) {
        console.error('❌ UPDATE BOOK ERROR:', error);
        res.status(500).json({ 
            message: 'خطأ في تحديث الكتاب',
            error: error.message 
        });
    }
});

module.exports = router;