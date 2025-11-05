const express = require('express');
const Book = require('../models/Book');
const Loan = require('../models/Loan');
const User = require('../models/User');
const router = express.Router();

// Middleware to check if user is admin - DEBUG VERSION
const requireAdmin = (req, res, next) => {
    console.log('🔐 ADMIN ACCESS: Authentication disabled for debugging');
    console.log('📝 Request:', req.method, req.url);
    next();
};

router.use(requireAdmin);

// Admin: Get system statistics
router.get('/stats', async (req, res) => {
    try {
        console.log('📊 Fetching system statistics...');
        
        const totalBooks = await Book.countDocuments();
        const totalUsers = await User.countDocuments();
        const activeLoans = await Loan.countDocuments({ status: 'active' });
        const overdueLoans = await Loan.countDocuments({
            status: 'active',
            dueDate: { $lt: new Date() }
        });

        console.log('📊 Stats result:', {
            totalBooks,
            totalUsers,
            activeLoans,
            overdueLoans
        });

        res.json({
            totalBooks,
            totalUsers,
            activeLoans,
            overdueLoans
        });
    } catch (error) {
        console.error('❌ Stats error:', error);
        res.status(500).json({ 
            message: 'Error fetching statistics',
            error: error.message 
        });
    }
});

// Admin: Reset all book copies and clear loans - DEBUG VERSION
router.post('/reset-books', async (req, res) => {
    try {
        console.log('🔄 RESET BOOKS: Request received');
        console.log('📦 Request body:', req.body);
        
        // Get all books and reset availableCopies to totalCopies
        const books = await Book.find({});
        console.log(`📚 Found ${books.length} books to reset`);
        
        let updatedCount = 0;
        let resetErrors = [];
        
        // Reset each book individually
        for (let book of books) {
            try {
                console.log(`📖 Resetting book: ${book.title}`);
                console.log(`   Before - Available: ${book.availableCopies}, Total: ${book.totalCopies}`);
                
                // Simple assignment - no complex MongoDB expressions
                book.availableCopies = book.totalCopies;
                book.status = 'available';
                await book.save();
                
                console.log(`   After - Available: ${book.availableCopies}, Total: ${book.totalCopies}`);
                updatedCount++;
            } catch (bookError) {
                console.error(`❌ Error resetting book ${book.title}:`, bookError);
                resetErrors.push({ book: book.title, error: bookError.message });
            }
        }
        
        // Delete all loans
        console.log('🗑️ Deleting all loan records...');
        const loanResult = await Loan.deleteMany({});
        console.log(`🗑️ Deleted ${loanResult.deletedCount} loan records`);
        
        res.json({ 
            message: `Successfully reset ${updatedCount} books and deleted ${loanResult.deletedCount} loan records!`,
            details: {
                booksReset: updatedCount,
                loansDeleted: loanResult.deletedCount,
                errors: resetErrors
            }
        });
        
    } catch (error) {
        console.error('❌ RESET BOOKS ERROR:', error);
        res.status(500).json({ 
            message: 'Error resetting books',
            error: error.message,
            stack: error.stack
        });
    }
});

// Admin: Get all loans with overdue status - DEBUG VERSION
router.get('/loans', async (req, res) => {
    try {
        console.log('📋 Fetching all loans...');
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        console.log(`📋 Pagination - Page: ${page}, Limit: ${limit}, Skip: ${skip}`);

        const loans = await Loan.find()
            .populate('user', 'name email universityId role')
            .populate('book', 'title author category')
            .populate({
                path: 'book',
                populate: [
                    { path: 'author', select: 'name' },
                    { path: 'category', select: 'name' }
                ]
            })
            .sort({ borrowDate: -1 })
            .skip(skip)
            .limit(limit);

        const totalLoans = await Loan.countDocuments();
        
        console.log(`📋 Found ${loans.length} loans (total: ${totalLoans})`);

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
        
        console.log('📋 Loans processed successfully');
        
        res.json({
            loans: loansWithStatus,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalLoans / limit),
                totalLoans,
                hasNext: page < Math.ceil(totalLoans / limit),
                hasPrev: page > 1
            }
        });
    } catch (error) {
        console.error('❌ LOANS ERROR:', error);
        res.status(500).json({ 
            message: 'Error fetching loans',
            error: error.message,
            stack: error.stack
        });
    }
});

// Admin: Get overdue loans - DEBUG VERSION
router.get('/overdue-loans', async (req, res) => {
    try {
        console.log('⏰ Fetching overdue loans...');
        console.log('⏰ Current date:', new Date());
        
        const overdueLoans = await Loan.find({
            status: 'active',
            dueDate: { $lt: new Date() }
        })
        .populate('user', 'name email phone')
        .populate('book', 'title author')
        .sort({ dueDate: 1 });
        
        console.log(`⏰ Found ${overdueLoans.length} overdue loans`);
        
        // Log each overdue loan for debugging
        overdueLoans.forEach(loan => {
            console.log(`⏰ Overdue: ${loan.book?.title} for ${loan.user?.name}, Due: ${loan.dueDate}`);
        });
        
        res.json({
            count: overdueLoans.length,
            loans: overdueLoans
        });
        
    } catch (error) {
        console.error('❌ OVERDUE LOANS ERROR:', error);
        res.status(500).json({ 
            message: 'Error fetching overdue loans',
            error: error.message,
            stack: error.stack
        });
    }
});

// Admin: Send return reminders - DEBUG VERSION
router.post('/send-reminders', async (req, res) => {
    try {
        console.log('📧 Sending return reminders...');
        
        const overdueLoans = await Loan.find({
            status: 'active',
            dueDate: { $lt: new Date() }
        }).populate('user', 'name email').populate('book', 'title');

        console.log(`📧 Found ${overdueLoans.length} loans for reminders`);

        // Log reminder details
        overdueLoans.forEach(loan => {
            const daysOverdue = Math.ceil((new Date() - new Date(loan.dueDate)) / (1000 * 60 * 60 * 24));
            console.log(`📧 Reminder for: ${loan.user.name} (${loan.user.email}) - ${loan.book.title} - ${daysOverdue} days overdue`);
        });

        res.json({
            message: `📧 Reminders will be sent to ${overdueLoans.length} users`,
            reminders: overdueLoans.map(loan => ({
                user: loan.user.name,
                email: loan.user.email,
                book: loan.book.title,
                dueDate: loan.dueDate,
                daysOverdue: Math.ceil((new Date() - new Date(loan.dueDate)) / (1000 * 60 * 60 * 24))
            }))
        });
    } catch (error) {
        console.error('❌ SEND REMINDERS ERROR:', error);
        res.status(500).json({ 
            message: 'Error sending reminders',
            error: error.message,
            stack: error.stack
        });
    }
});

module.exports = router;