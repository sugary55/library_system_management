const mongoose = require('mongoose');
const Book = require('./models/Book');
const User = require('./models/User');
const Author = require('./models/Author');
const Category = require('./models/Category');
require('dotenv').config();

const seedData = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library_management');
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        await Book.deleteMany({});
        await User.deleteMany({});
        await Author.deleteMany({});
        await Category.deleteMany({});
        console.log('✅ Cleared existing data');

        // Create categories
        const categories = await Category.insertMany([
            { name: "أدب", description: "الأدب العربي والعالمي" },
            { name: "رواية", description: "الروايات العربية والعالمية" },
            { name: "تاريخ", description: "كتب التاريخ والحضارات" },
            { name: "علوم", description: "الكتب العلمية والتعليمية" }
        ]);
        console.log('✅ Categories created');

        // Create authors
        const authors = await Author.insertMany([
            { 
                name: "طه حسين", 
                bio: "أديب وناقد مصري، لقب بعميد الأدب العربي",
                nationality: "مصري",
                birthYear: 1889,
                deathYear: 1973
            },
            { 
                name: "إليف شافاق", 
                bio: "روائية تركية تكتب باللغتين التركية والإنجليزية",
                nationality: "تركية", 
                birthYear: 1971
            },
            { 
                name: "ابن خلدون", 
                bio: "مؤرخ وعالم اجتماع عربي",
                nationality: "عربي",
                birthYear: 1332,
                deathYear: 1406
            }
        ]);
        console.log('✅ Authors created');

        // Create books
        const books = await Book.insertMany([
            {
                title: "الأيام",
                author: authors[0]._id,
                category: categories[0]._id,
                publishedYear: 1929,
                summary: "سيرة ذاتية للأديب طه حسين",
                totalCopies: 5,
                availableCopies: 3,
                language: "Arabic"
            },
            {
                title: "قواعد العشق الأربعون",
                author: authors[1]._id, 
                category: categories[1]._id,
                publishedYear: 2010,
                summary: "رواية عن التصوف والحب الإلهي",
                totalCopies: 3,
                availableCopies: 1,
                language: "Arabic"
            },
            {
                title: "مقدمة ابن خلدون",
                author: authors[2]._id,
                category: categories[2]._id, 
                publishedYear: 1377,
                summary: "أحد أهم كتب التاريخ والفلسفة",
                totalCopies: 2,
                availableCopies: 2,
                language: "Arabic"
            }
        ]);
        console.log('✅ Books created');

        // Create sample user
        const user = await User.create({
            name: "أحمد محمد",
            email: "ahmed@example.com",
            password: "password123",
            universityId: "2024001",
            phone: "0123456789",
            role: "student"
        });
        console.log('✅ User created');

        console.log('\n🎉 SEEDING COMPLETE!');
        console.log(`📚 Books: ${books.length}`);
        console.log(`👤 Users: 1`);
        console.log(`✍️ Authors: ${authors.length}`);
        console.log(`📂 Categories: ${categories.length}`);
        console.log('\n🚀 You can now access: http://localhost:5000');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding data:', error);
        process.exit(1);
    }
};

seedData();