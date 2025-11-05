const express = require('express');
const router = express.Router();
const Author = require('../models/Author');

// Get all authors
router.get('/', async (req, res) => {
    try {
        const authors = await Author.find().sort({ name: 1 });
        res.json(authors);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new author
router.post('/', async (req, res) => {
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

module.exports = router;