const User = require('../models/User');

// Enhanced authentication middleware - DEBUG VERSION
const authMiddleware = async (req, res, next) => {
    try {
        console.log('🔐 AUTH MIDDLEWARE: Checking authentication');
        console.log('📝 Request method:', req.method);
        console.log('📝 Request URL:', req.url);
        console.log('📝 Headers keys:', Object.keys(req.headers));
        
        // TEMPORARY: For Phase 2 testing, we'll use test headers
        // In Phase 3, we'll replace this with real frontend authentication
        
        const testUserId = req.headers['x-test-user-id'] || req.headers['user-id'];
        const testUserEmail = req.headers['x-test-user-email'];
        
        if (testUserId) {
            console.log('🔐 AUTH: Found test user ID in header:', testUserId);
            
            try {
                const user = await User.findById(testUserId);
                if (user) {
                    req.user = user;
                    console.log('✅ AUTH: User authenticated via test header:', {
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    });
                } else {
                    console.log('❌ AUTH: User not found with test ID:', testUserId);
                    req.user = null;
                }
            } catch (error) {
                console.error('❌ AUTH: Error finding user:', error.message);
                req.user = null;
            }
        } else if (testUserEmail) {
            console.log('🔐 AUTH: Found test user email in header:', testUserEmail);
            
            try {
                const user = await User.findOne({ email: testUserEmail });
                if (user) {
                    req.user = user;
                    console.log('✅ AUTH: User authenticated via email:', user.name);
                } else {
                    console.log('❌ AUTH: User not found with email:', testUserEmail);
                    req.user = null;
                }
            } catch (error) {
                console.error('❌ AUTH: Error finding user by email:', error.message);
                req.user = null;
            }
        } else {
            console.log('⚠️ AUTH: No authentication headers found - anonymous access');
            req.user = null;
        }
        
        console.log('🔐 AUTH: Final user object:', req.user ? 'Authenticated' : 'Anonymous');
        next();
        
    } catch (error) {
        console.error('❌ AUTH MIDDLEWARE ERROR:', error);
        res.status(500).json({ 
            message: 'Authentication error',
            error: error.message 
        });
    }
};

// Admin check middleware - DEBUG VERSION
const requireAdmin = (req, res, next) => {
    console.log('🔐 ADMIN CHECK: Verifying admin privileges');
    console.log('👤 Current user:', req.user ? req.user.email : 'None');
    
    if (!req.user) {
        console.log('❌ ADMIN CHECK: No user authenticated');
        return res.status(401).json({ 
            message: 'Authentication required',
            debug: 'No user found in request'
        });
    }
    
    if (req.user.role !== 'admin') {
        console.log('❌ ADMIN CHECK: User is not admin. Role:', req.user.role);
        return res.status(403).json({ 
            message: 'Admin access required',
            debug: `User role is: ${req.user.role}`
        });
    }
    
    console.log('✅ ADMIN CHECK: User is admin - access granted');
    next();
};

// User check middleware - DEBUG VERSION  
const requireAuth = (req, res, next) => {
    console.log('🔐 AUTH CHECK: Verifying user authentication');
    
    if (!req.user) {
        console.log('❌ AUTH CHECK: No user authenticated');
        return res.status(401).json({ 
            message: 'Authentication required',
            debug: 'Please login to access this resource'
        });
    }
    
    console.log('✅ AUTH CHECK: User authenticated - access granted');
    next();
};

module.exports = { authMiddleware, requireAdmin, requireAuth };