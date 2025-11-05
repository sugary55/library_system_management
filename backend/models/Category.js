const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: String
}, {
    timestamps: true
});

// FIX: Change authorSchema to categorySchema
module.exports = mongoose.model('Category', categorySchema);