const mongoose = require('mongoose');

const authorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    bio: String,
    nationality: String,
    birthYear: Number,
    deathYear: Number
}, {
    timestamps: true
});

module.exports = mongoose.model('Author', authorSchema);