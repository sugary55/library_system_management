const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Author',
        required: true
    },
    isbn: {
        type: String,
        unique: true,
        sparse: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    publisher: String,
    publishedYear: Number,
    summary: String,
    language: {
        type: String,
        default: 'Arabic'
    },
    totalCopies: {
        type: Number,
        default: 1
    },
    availableCopies: {
        type: Number,
        default: 1
    },
    status: {
        type: String,
        enum: ['available', 'borrowed', 'maintenance'],
        default: 'available'
    },
    coverImage: {type: String,
        default:  '/images/default-book-cover.jpg'}
}, 
{
    timestamps: true
});

module.exports = mongoose.model('Book', bookSchema);