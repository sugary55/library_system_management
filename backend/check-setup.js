const fs = require('fs');
const path = require('path');

console.log('🔍 Checking project setup...\n');

// Check if model files exist
const models = ['Book.js', 'User.js', 'Author.js', 'Category.js', 'Loan.js'];
const modelsPath = path.join(__dirname, 'models');

console.log('📁 Checking model files:');
models.forEach(model => {
    const filePath = path.join(modelsPath, model);
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${model}`);
    } else {
        console.log(`❌ ${model} - MISSING`);
    }
});

// Check if node_modules exists
console.log('\n📦 Checking dependencies:');
if (fs.existsSync(path.join(__dirname, 'node_modules'))) {
    console.log('✅ node_modules folder exists');
} else {
    console.log('❌ node_modules folder missing - run npm install');
}

// Check if .env exists
console.log('\n⚙️ Checking configuration:');
if (fs.existsSync(path.join(__dirname, '.env'))) {
    console.log('✅ .env file exists');
} else {
    console.log('❌ .env file missing - creating one...');
    fs.writeFileSync(path.join(__dirname, '.env'), 
        `MONGODB_URI=mongodb://localhost:27017/library_management\nJWT_SECRET=your-secret-key-here\nPORT=5000`);
    console.log('✅ .env file created');
}

console.log('\n🎯 Setup check complete!');
console.log('💡 Run: node server.js to start the application');