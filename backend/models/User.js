const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    universityId: {
        type: String,
        required: true,
        unique: true
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Debug middleware
userSchema.pre('save', async function(next) {
    console.log('🔐 USER MODEL: Pre-save hook triggered');
    
    if (!this.isModified('password')) {
        console.log('🔐 Password not modified, skipping hash');
        return next();
    }

    try {
        console.log('🔐 Hashing password...');
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        console.log('✅ Password hashed successfully');
        next();
    } catch (error) {
        console.error('❌ Password hashing error:', error);
        next(error);
    }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    console.log('🔐 Comparing passwords...');
    
    try {
        const isMatch = await bcrypt.compare(candidatePassword, this.password);
        console.log('🔐 Password match result:', isMatch);
        return isMatch;
    } catch (error) {
        console.error('❌ Password comparison error:', error);
        throw error;
    }
};

userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    return user;
};

// Debug line
console.log('🔐 USER MODEL: User schema registered successfully');

const User = mongoose.model('User', userSchema);
module.exports = User;