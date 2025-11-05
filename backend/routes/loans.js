const express = require('express');
const Loan = require('../models/Loan');
const Book = require('../models/Book');
const User = require('../models/User');
const { authMiddleware, requireAdmin, requireAuth } = require('../middleware/auth');
const router = express.Router();

// Apply auth middleware to ALL loan routes
router.use(authMiddleware);

// Get ALL loans (Admin only) - DEBUG VERSION
router.get('/all', requireAdmin, async (req, res) => {
    try {
        console.log('📋 ADMIN ALL LOANS: Request received');
        console.log('👤 Admin user:', req.user.name, req.user.role);
        
        const loans = await Loan.find()
            .populate('user', 'name email universityId role')
            .populate('book', 'title author category')
            .sort({ borrowDate: -1 });
        
        console.log(`📋 ADMIN ALL LOANS: Found ${loans.length} total loans`);
        
        const loansWithStatus = loans.map(loan => {
            const loanObj = loan.toObject();
            const isOverdue = new Date() > new Date(loan.dueDate) && loan.status === 'active';
            const daysOverdue = isOverdue ? 
                Math.ceil((new Date() - new Date(loan.dueDate)) / (1000 * 60 * 60 * 24)) : 0;
            const fineAmount = daysOverdue * 5;
            
            loanObj.isOverdue = isOverdue;
            loanObj.daysOverdue = daysOverdue;
            loanObj.fineAmount = fineAmount;
            
            return loanObj;
        });
        
        console.log('✅ ADMIN ALL LOANS: Successfully retrieved all loans');
        
        res.json({
            message: 'All loans retrieved successfully',
            loans: loansWithStatus,
            total: loansWithStatus.length
        });
        
    } catch (error) {
        console.error('❌ ADMIN ALL LOANS ERROR:', error);
        res.status(500).json({ 
            message: 'Error fetching all loans',
            error: error.message 
        });
    }
});

// Get MY loans (Current user only) - DEBUG VERSION
router.get('/my-loans', requireAuth, async (req, res) => {
    try {
        console.log('📋 MY LOANS: Request received');
        console.log('👤 Current user:', req.user.name, req.user._id);
        
        const loans = await Loan.find({ user: req.user._id })
            .populate('book', 'title author')
            .sort({ borrowDate: -1 });
        
        console.log(`📋 MY LOANS: Found ${loans.length} loans for user ${req.user.name}`);
        
        const loansWithStatus = loans.map(loan => {
            const loanObj = loan.toObject();
            const isOverdue = new Date() > new Date(loan.dueDate) && loan.status === 'active';
            const daysOverdue = isOverdue ? 
                Math.ceil((new Date() - new Date(loan.dueDate)) / (1000 * 60 * 60 * 24)) : 0;
            const fineAmount = daysOverdue * 5;
            
            loanObj.isOverdue = isOverdue;
            loanObj.daysOverdue = daysOverdue;
            loanObj.fineAmount = fineAmount;
            
            return loanObj;
        });
        
        console.log('✅ MY LOANS: Successfully retrieved user loans');
        
        res.json({
            message: 'Your loans retrieved successfully',
            loans: loansWithStatus,
            total: loansWithStatus.length
        });
        
    } catch (error) {
        console.error('❌ MY LOANS ERROR:', error);
        res.status(500).json({ 
            message: 'Error fetching your loans',
            error: error.message 
        });
    }
});

// Create new loan (Authenticated users) - DEBUG VERSION
router.post('/', requireAuth, async (req, res) => {
    try {
        console.log('🚀📚 CREATE LOAN: Request received');
        console.log('👤 Authenticated user:', req.user.name, req.user._id);
        console.log('📦 Request body:', req.body);
        
        const { bookId } = req.body;
        
        if (!bookId) {
            console.log('❌ CREATE LOAN: No book ID provided');
            return res.status(400).json({ message: 'Book ID is required' });
        }
        
        console.log('🔍 CREATE LOAN: Looking for book with ID:', bookId);
        
        // Check if book exists and is available
        const book = await Book.findById(bookId);
        if (!book) {
            console.log('❌ CREATE LOAN: Book not found');
            return res.status(404).json({ message: 'Book not found' });
        }
        
        console.log('✅ CREATE LOAN: Book found:', book.title);
        console.log('📖 Available copies:', book.availableCopies);
        
        if (book.availableCopies < 1) {
            console.log('❌ CREATE LOAN: No available copies');
            return res.status(400).json({ message: 'No available copies of this book' });
        }
        
        // Check if user already has this book borrowed
        const existingLoan = await Loan.findOne({
            user: req.user._id,
            book: bookId,
            status: 'active'
        });
        
        if (existingLoan) {
            console.log('❌ CREATE LOAN: User already has this book borrowed');
            return res.status(400).json({ message: 'You already have this book borrowed' });
        }
        
        console.log('✅ CREATE LOAN: User can borrow this book');
        
        // Create loan with ACTUAL authenticated user
        const loan = new Loan({
            user: req.user._id, // Use the actual authenticated user
            book: bookId,
            borrowDate: new Date(),
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
            status: 'active'
        });
        
        await loan.save();
        console.log('✅ CREATE LOAN: Loan record saved');
        
        // Update book available copies
        book.availableCopies -= 1;
        if (book.availableCopies === 0) {
            book.status = 'borrowed';
        }
        await book.save();
        console.log('✅ CREATE LOAN: Book copies updated');
        
        // Populate response
        await loan.populate('book', 'title author');
        
        console.log('✅ CREATE LOAN: Loan created successfully');
        
        res.status(201).json({
            message: 'Book borrowed successfully!',
            loan: loan,
            book: {
                title: book.title,
                availableCopies: book.availableCopies
            }
        });
        
    } catch (error) {
        console.error('❌ CREATE LOAN ERROR:', error);
        res.status(500).json({ 
            message: 'Error borrowing book',
            error: error.message 
        });
    }
});

// Return book (Authenticated users) - DEBUG VERSION
router.put('/:id/return', requireAuth, async (req, res) => {
    try {
        console.log('🔄 RETURN BOOK: Request received');
        console.log('👤 Authenticated user:', req.user.name);
        console.log('📦 Loan ID to return:', req.params.id);
        
        const loan = await Loan.findById(req.params.id).populate('book');
        
        if (!loan) {
            console.log('❌ RETURN BOOK: Loan not found');
            return res.status(404).json({ message: 'Loan not found' });
        }
        
        // Check if user owns this loan or is admin
        if (loan.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            console.log('❌ RETURN BOOK: User does not own this loan');
            return res.status(403).json({ message: 'You can only return your own books' });
        }
        
        if (loan.status === 'returned') {
            console.log('⚠️ RETURN BOOK: Book already returned');
            return res.status(400).json({ message: 'Book already returned' });
        }
        
        console.log('✅ RETURN BOOK: Proceeding with return');
        
        // Update loan
        loan.returnDate = new Date();
        loan.status = 'returned';
        await loan.save();
        
        // Update book available copies
        if (loan.book) {
            loan.book.availableCopies += 1;
            if (loan.book.availableCopies > 0) {
                loan.book.status = 'available';
            }
            await loan.book.save();
            console.log('✅ RETURN BOOK: Book copies updated');
        }
        
        console.log('✅ RETURN BOOK: Book returned successfully');
        
        res.json({
            message: 'Book returned successfully',
            loan: loan
        });
        
    } catch (error) {
        console.error('❌ RETURN BOOK ERROR:', error);
        res.status(500).json({ 
            message: 'Error returning book',
            error: error.message 
        });
    }
});

// Keep the temporary user-loans endpoint for compatibility
router.get('/user-loans', async (req, res) => {
    try {
        console.log('👤 USER-LOANS (LEGACY): Request received');
        
        // Simple response without population for now
        const loans = await Loan.find().sort({ borrowDate: -1 }).limit(10);
        
        console.log(`👤 USER-LOANS: Found ${loans.length} loans (simple query)`);
        
        res.json(loans);
        
    } catch (error) {
        console.error('❌ USER-LOANS ERROR:', error);
        res.status(500).json({ 
            message: 'Error fetching loans',
            error: error.message 
        });
    }
});

module.exports = router;