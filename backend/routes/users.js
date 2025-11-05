const express = require('express');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Apply auth middleware to all user routes
router.use(authMiddleware);

// User registration - DEBUG VERSION
router.post('/register', async (req, res) => {
    try {
        console.log('👤 REGISTER: Request received');
        console.log('📦 Request body:', req.body);
        
        const { name, email, password, universityId, role = 'user' } = req.body;
        
        // Validate required fields
        if (!name || !email || !password || !universityId) {
            console.log('❌ REGISTER: Missing required fields');
            return res.status(400).json({ 
                message: 'جميع الحقول مطلوبة: الاسم، البريد الإلكتروني، كلمة المرور، رقم الجامعة' 
            });
        }
        
        console.log('🔍 REGISTER: Checking for existing user...');
        
        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { universityId }]
        });
        
        if (existingUser) {
            console.log('❌ REGISTER: User already exists');
            const conflictField = existingUser.email === email ? 'البريد الإلكتروني' : 'رقم الجامعة';
            return res.status(409).json({
                message: `${conflictField} مسجل مسبقاً`
            });
        }
        
        console.log('✅ REGISTER: No existing user found, creating new user...');
        
        // Create new user
        const user = new User({
            name,
            email,
            password,
            universityId,
            role
        });
        
        await user.save();
        console.log('✅ REGISTER: User saved successfully');
        
        // Return user without password
        const userResponse = user.toJSON();
        
        console.log('✅ REGISTER: Registration successful for:', userResponse.email);
        
        res.status(201).json({
            message: 'تم إنشاء الحساب بنجاح',
            user: userResponse
        });
        
    } catch (error) {
        console.error('❌ REGISTER ERROR:', error);
        res.status(500).json({ 
            message: 'خطأ في إنشاء الحساب',
            error: error.message 
        });
    }
});

// User login - DEBUG VERSION
router.post('/login', async (req, res) => {
    try {
        console.log('🔐 LOGIN: Request received');
        console.log('📦 Request body:', req.body);
        
        const { email, password } = req.body;
        
        if (!email || !password) {
            console.log('❌ LOGIN: Missing email or password');
            return res.status(400).json({ 
                message: 'البريد الإلكتروني وكلمة المرور مطلوبان' 
            });
        }
        
        console.log('🔍 LOGIN: Looking for user with email:', email);
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            console.log('❌ LOGIN: User not found with email:', email);
            return res.status(401).json({ 
                message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' 
            });
        }
        
        console.log('✅ LOGIN: User found:', user.name);
        console.log('🔐 LOGIN: Verifying password...');
        
        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            console.log('❌ LOGIN: Invalid password for user:', email);
            return res.status(401).json({ 
                message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' 
            });
        }
        
        console.log('✅ LOGIN: Password verified successfully');
        
        // Return user without password
        const userResponse = user.toJSON();
        
        console.log('✅ LOGIN: Login successful for:', userResponse.email);
        
        res.json({
            message: 'تم تسجيل الدخول بنجاح',
            user: userResponse
        });
        
    } catch (error) {
        console.error('❌ LOGIN ERROR:', error);
        res.status(500).json({ 
            message: 'خطأ في تسجيل الدخول',
            error: error.message 
        });
    }
});

// Get current user profile - DEBUG VERSION
router.get('/profile', async (req, res) => {
    try {
        console.log('👤 PROFILE: Request received');
        
        if (!req.user) {
            console.log('❌ PROFILE: No authenticated user');
            return res.status(401).json({ message: 'غير مصرح بالوصول' });
        }
        
        console.log('✅ PROFILE: Returning user data for:', req.user.email);
        
        res.json({
            user: req.user
        });
        
    } catch (error) {
        console.error('❌ PROFILE ERROR:', error);
        res.status(500).json({ 
            message: 'خطأ في جلب بيانات المستخدم',
            error: error.message 
        });
    }
});

// Get all users (admin only) - DEBUG VERSION
router.get('/', async (req, res) => {
    try {
        console.log('👥 GET ALL USERS: Request received');
        
        const users = await User.find().select('-password');
        console.log(`✅ Found ${users.length} users`);
        
        res.json(users);
        
    } catch (error) {
        console.error('❌ GET ALL USERS ERROR:', error);
        res.status(500).json({ 
            message: 'خطأ في جلب المستخدمين',
            error: error.message 
        });
    }
});

module.exports = router;