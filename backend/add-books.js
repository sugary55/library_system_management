const mongoose = require('mongoose');
const Book = require('./models/Book');
const Author = require('./models/Author');
const Category = require('./models/Category');
require('dotenv').config();

const addSampleBooks = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library_management');
        console.log('✅ Connected to MongoDB');

        // Get existing authors and categories
        const authors = await Author.find();
        const categories = await Category.find();

        if (authors.length === 0 || categories.length === 0) {
            console.log('❌ Please run seed script first to create authors and categories');
            process.exit(1);
        }

        // Add new books
        const newBooks = await Book.insertMany([
            {
                title: "ثلاثية غرناطة",
                author: authors.find(a => a.name === "رضوى عاشور")._id || authors[0]._id,
                category: categories.find(c => c.name === "رواية")._id,
                publishedYear: 1994,
                summary: "رواية تاريخية تدور أحداثها في الأندلس خلال فترة سقوط غرناطة",
                totalCopies: 4,
                availableCopies: 4,
                language: "Arabic",
                publisher: "دار الشروق",
                isbn: "9789770934567"
            },
            {
                title: "الطريق إلى رمضان",
                author: authors.find(a => a.name === "مصطفى محمود")._id || authors[0]._id,
                category: categories.find(c => c.name === "أدب")._id,
                publishedYear: 1979,
                summary: "مجموعة مقالات فلسفية ودينية للدكتور مصطفى محمود",
                totalCopies: 3,
                availableCopies: 3,
                language: "Arabic",
                publisher: "دار المعارف",
                isbn: "9789770935678"
            },
            {
                title: "علم الفلك للمبتدئين",
                author: authors.find(a => a.name === "نيل ديجراس تايسون")._id || authors[0]._id,
                category: categories.find(c => c.name === "علوم")._id,
                publishedYear: 2017,
                summary: "مدخل مبسط لعلم الفلك والكون",
                totalCopies: 2,
                availableCopies: 2,
                language: "Arabic",
                publisher: "دار الكتب العلمية",
                isbn: "9789770936789"
            }
        ]);

        console.log('✅ New books added successfully!');
        console.log(`📚 Added ${newBooks.length} new books:`);
        newBooks.forEach(book => {
            console.log(`   - ${book.title} (${book.publishedYear})`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding books:', error);
        process.exit(1);
    }
};

// First, let's add some new authors
const addNewAuthors = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library_management');
        
        const newAuthors = await Author.insertMany([
            {
                name: "رضوى عاشور",
                bio: "أكاديمية وروائية وناقدة أدبية مصرية",
                nationality: "مصرية",
                birthYear: 1946,
                deathYear: 2014
            },
            {
                name: "مصطفى محمود",
                bio: "طبيب وكاتب مصري",
                nationality: "مصري", 
                birthYear: 1921,
                deathYear: 2009
            },
            {
                name: "نيل ديجراس تايسون",
                bio: "عالم فيزياء فلكية أمريكي",
                nationality: "أمريكي",
                birthYear: 1958
            }
        ]);

        console.log('✅ New authors added!');
        await addSampleBooks();
    } catch (error) {
        console.error('❌ Error adding authors:', error);
        process.exit(1);
    }
};

addNewAuthors();