const API_BASE = '/api';

// DOM Elements
const booksGrid = document.getElementById('booksGrid');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const addBookBtn = document.getElementById('addBookBtn');
const adminBtn = document.getElementById('adminBtn');

// Current user
let currentUser = null;
let isAdmin = false;

// Data cache
let authorsList = [];
let categoriesList = [];

// Prevent multiple loading
let isLoading = false;
// Global variable to track current book being viewed/edited
let currentBookInModal = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, loading books...');
    checkExistingAuth(); // Check if user is already logged in
    loadBooks();
    loadFilterData();
    setupSearch();
    // Login/Register buttons
    if (loginBtn) loginBtn.addEventListener('click', () => showLoginModal());
    if (registerBtn) registerBtn.addEventListener('click', () => showRegisterModal());
    if (adminLoginBtn) adminLoginBtn.addEventListener('click', () => showAdminLoginModal());
    if (adminBtn) {
        adminBtn.style.display = 'none';
        adminBtn.addEventListener('click', showAdminPanel);
    }

    // Login forms
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) adminLoginForm.addEventListener('submit', handleAdminLogin);

    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) registerForm.addEventListener('submit', handleRegister);

    // Add book form
    const addBookForm = document.getElementById('addBookForm');
    if (addBookForm) addBookForm.addEventListener('submit', addNewBook);

    // Add author form
    const addAuthorForm = document.getElementById('addAuthorForm');
    if (addAuthorForm) addAuthorForm.addEventListener('submit', addNewAuthor);

    // Search
    const searchInput = document.querySelector('input[type="text"]');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            if (document.activeElement === searchInput) {
                loadBooks(e.target.value);
            }
        }, 300));
    }
    
    // Add book button
    if (addBookBtn) {
        addBookBtn.style.display = 'none';
        addBookBtn.addEventListener('click', openAddBookModal);
    }

    // Setup navigation
    setupNavigation();
});

// ==================== BOOK DETAILS & EDITING FUNCTIONS ====================
// Show book details modal (smart - read-only for users, editable for admin)
async function showBookDetails(bookId) {
    try {
        console.log('📖 Loading book details for:', bookId);
        
        // Fetch book details from API
        const response = await fetch(`${API_BASE}/books/${bookId}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch book details');
        }
        
        const book = await response.json();
        currentBookInModal = book;
        
        console.log('📖 Book details loaded:', book);
        
        // Populate the modal with book data
        populateBookDetailsModal(book);
        
        // Show/hide edit controls based on user role
        setupEditMode(isAdmin);
        
        // Show the modal
        const modalElement = document.getElementById('bookDetailsModal');
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        }
        
    } catch (error) {
        console.error('❌ Error loading book details:', error);
        showNotification('خطأ في تحميل تفاصيل الكتاب', 'error');
    }
}

// Populate modal with book data
function populateBookDetailsModal(book) {
    // Basic book information
    document.getElementById('detailBookTitle').value = book.title || '';
    document.getElementById('detailBookAuthor').textContent = book.author?.name || book.author || 'غير معروف';
    document.getElementById('detailBookCategory').value = book.category?.name || book.category || 'غير مصنف';
    document.getElementById('detailBookYear').value = book.publishedYear || '';
    document.getElementById('detailBookSummary').value = book.summary || '';
    document.getElementById('detailBookCopies').value = book.totalCopies || 1;
    document.getElementById('detailBookISBN').value = book.isbn || '';
    document.getElementById('detailBookPublisher').value = book.publisher || '';
    
    // Read-only metadata
    document.getElementById('detailAvailableCopies').textContent = book.availableCopies || 0;
    
    // Book status
    const status = book.availableCopies > 0 ? 'متاح' : 'مستعار';
    const statusClass = book.availableCopies > 0 ? 'text-success' : 'text-warning';
    document.getElementById('detailBookStatus').textContent = status;
    document.getElementById('detailBookStatus').className = `form-control-plaintext ${statusClass}`;
    
    // Update modal title
    document.getElementById('bookDetailsTitle').textContent = `تفاصيل الكتاب: ${book.title}`;
}

// Setup edit mode based on user role
function setupEditMode(isAdminUser) {
    const editableFields = [
        'detailBookTitle',
        'detailBookCategory', 
        'detailBookYear',
        'detailBookSummary',
        'detailBookCopies',
        'detailBookISBN',
        'detailBookPublisher'
    ];
    
    const adminElements = document.querySelectorAll('.admin-only');
    const userElements = document.querySelectorAll('.user-only');
    
    if (isAdminUser) {
        // Show admin controls, hide user controls
        adminElements.forEach(el => el.style.display = 'block');
        userElements.forEach(el => el.style.display = 'none');
        
        // Make fields editable
        editableFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.readOnly = false;
                field.classList.add('editable-field');
            }
        });
        
        console.log('🔧 Edit mode: ADMIN (editable)');
        
    } else {
        // Show user controls, hide admin controls
        adminElements.forEach(el => el.style.display = 'none');
        userElements.forEach(el => el.style.display = 'block');
        
        // Make fields read-only
        editableFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.readOnly = true;
                field.classList.remove('editable-field');
            }
        });
        
        console.log('🔧 Edit mode: USER (read-only)');
    }
}

// Save book changes (Admin only)
async function saveBookChanges() {
    if (!currentBookInModal || !isAdmin) {
        showNotification('غير مصرح بالتعديل', 'error');
        return;
    }
    
    try {
        // Get updated values from form
        const updatedBook = {
            title: document.getElementById('detailBookTitle').value,
            categoryName: document.getElementById('detailBookCategory').value, // Text input for category
            publishedYear: document.getElementById('detailBookYear').value,
            summary: document.getElementById('detailBookSummary').value,
            totalCopies: parseInt(document.getElementById('detailBookCopies').value) || 1,
            isbn: document.getElementById('detailBookISBN').value,
            publisher: document.getElementById('detailBookPublisher').value
        };
        
        console.log('💾 Saving book changes:', updatedBook);
        
        // Validate required fields
        if (!updatedBook.title || !updatedBook.categoryName) {
            showNotification('العنوان والتصنيف حقول مطلوبة', 'error');
            return;
        }
        
        showNotification('جاري حفظ التغييرات...', 'info');
        
        // Send update to backend
        const response = await fetch(`${API_BASE}/books/${currentBookInModal._id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(updatedBook)
        });
        
        if (response.ok) {
            const result = await response.json();
            showNotification('تم حفظ التغييرات بنجاح!', 'success');
            
            // Close modal
            const modalElement = document.getElementById('bookDetailsModal');
            if (modalElement) {
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) modal.hide();
            }
            
            // Refresh books list to show changes
            loadBooks();
            
        } else {
            const error = await response.json();
            showNotification(error.message || 'فشل في حفظ التغييرات', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error saving book changes:', error);
        showNotification('خطأ في حفظ التغييرات', 'error');
    }
}

// ==================== AUTHENTICATION FUNCTIONS ====================

// Check if user is already logged in (from localStorage)
function checkExistingAuth() {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
        try {
            currentUser = JSON.parse(userData);
            isAdmin = currentUser.role === 'admin';
            updateUIForLoggedInUser(currentUser);
            console.log('🔐 Existing auth found:', currentUser.name);
        } catch (error) {
            console.error('Error parsing stored user data:', error);
            clearAuth();
        }
    }
}

// Get authentication headers for API calls - UPDATED for test headers
function getAuthHeaders() {
    const userData = localStorage.getItem('user');
    
    if (!userData) {
        return { 'Content-Type': 'application/json' };
    }
    
    try {
        const user = JSON.parse(userData);
        console.log('🔐 Sending auth headers for user:', user._id);
        
        return {
            'Content-Type': 'application/json',
            'x-test-user-id': user._id,        // ✅ Backend expects this
            'x-test-user-email': user.email    // ✅ Backend expects this
        };
    } catch (error) {
        console.error('Error parsing user data:', error);
        return { 'Content-Type': 'application/json' };
    }
}

// Clear authentication data
function clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    isAdmin = false;
}

// Handle REAL login with backend API
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showNotification('يرجى ملء جميع الحقول', 'error');
        return;
    }
    
    showNotification('جارٍ تسجيل الدخول...', 'info');
    
    try {
        console.log('🔐 Attempting login for:', email);
        
        const response = await fetch(`${API_BASE}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        console.log('🔐 Login response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Login failed');
        }
        
        const data = await response.json();
        console.log('✅ Login successful:', data.user.name);
        
        // Store token and user data
// Store user data (backend doesn't return token, uses header-based auth)
         localStorage.setItem('user', JSON.stringify(data.user));
        console.log('🔐 User stored for header-based authentication:', data.user._id);
        
        currentUser = data.user;
        isAdmin = data.user.role === 'admin';
        
        showNotification(`مرحباً ${data.user.name}! تم تسجيل الدخول بنجاح`, 'success');
        
        // Close modal
        const modalElement = document.getElementById('loginModal');
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
        }
        
        updateUIForLoggedInUser(currentUser);
        document.getElementById('loginForm').reset();
        
        // Load user's loans
        loadMyLoans();
        
    } catch (error) {
        console.error('❌ Login error:', error);
        showNotification(error.message || 'خطأ في تسجيل الدخول', 'error');
    }
}

// Handle REAL registration with backend API
async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const universityId = document.getElementById('registerUniversityId').value;
    
    if (!name || !email || !password || !universityId) {
        showNotification('يرجى ملء جميع الحقول', 'error');
        return;
    }
    
    showNotification('جارٍ إنشاء الحساب...', 'info');
    
    try {
        console.log('👤 Attempting registration for:', email);
        
        const response = await fetch(`${API_BASE}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name, 
                email, 
                password, 
                universityId,
                role: 'user'
            })
        });
        
        console.log('👤 Registration response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Registration failed');
        }
        
        const data = await response.json();
        console.log('✅ Registration successful:', data.user.name);
        
        // Auto-login after registration
        localStorage.setItem('token', 'dummy-token'); // Your backend doesn't return token yet
        localStorage.setItem('user', JSON.stringify(data.user));
        
        currentUser = data.user;
        isAdmin = data.user.role === 'admin';
        
        showNotification(`مرحباً ${data.user.name}! تم إنشاء الحساب بنجاح`, 'success');
        
        // Close modal
        const modalElement = document.getElementById('registerModal');
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
        }
        
        document.getElementById('registerForm').reset();
        updateUIForLoggedInUser(currentUser);
        loadMyLoans();
        
    } catch (error) {
        console.error('❌ Registration error:', error);
        showNotification(error.message || 'خطأ في إنشاء الحساب', 'error');
    }
}

// Handle admin login (keep as is for now)
// Handle admin login - UPDATED to use real backend auth
async function handleAdminLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    
    if (!username || !password) {
        showNotification('يرجى ملء جميع الحقول', 'error');
        return;
    }
    
    showNotification('جارٍ تسجيل الدخول كمسؤول...', 'info');
    
    try {
        // Use real backend authentication
        const response = await fetch(`${API_BASE}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: "admin@library.com",  // Use the real admin email
                password: password 
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Store user data
            localStorage.setItem('user', JSON.stringify(data.user));
            
            currentUser = data.user;
            isAdmin = data.user.role === 'admin';
            
            showNotification('تم تسجيل الدخول كمسؤول بنجاح!', 'success');
            
            // Close modal
            const modalElement = document.getElementById('adminLoginModal');
            if (modalElement) {
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) modal.hide();
            }
            
            updateUIForLoggedInUser(currentUser);
            document.getElementById('adminLoginForm').reset();
        } else {
            showNotification('بيانات المسؤول غير صحيحة', 'error');
        }
    } catch (error) {
        console.error('Admin login error:', error);
        showNotification('خطأ في تسجيل الدخول', 'error');
    }
}

// Handle logout
function handleLogout() {
    showNotification('تم تسجيل الخروج', 'info');
    clearAuth();
    updateUIForLoggedOutUser();
    loadBooks(); // Refresh to hide admin features
}

// Update UI after login
function updateUIForLoggedInUser(user) {
    if (loginBtn) {
        loginBtn.innerHTML = `<i class="fas fa-user me-1"></i>${user.name}`;
    }
    
    if (registerBtn) {
        registerBtn.innerHTML = '<i class="fas fa-sign-out-alt me-1"></i>تسجيل الخروج';
        registerBtn.onclick = handleLogout;
    }
    
    // Show admin features only for admin users
    if (user.role === 'admin') {
        showAdminFeatures();
    }
    
    // Update the book display to show/hide delete buttons
    loadBooks();
}

// Update UI after logout
function updateUIForLoggedOutUser() {
    if (loginBtn) {
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt me-1"></i>تسجيل الدخول';
    }
    
    if (registerBtn) {
        registerBtn.innerHTML = '<i class="fas fa-user-plus me-1"></i>إنشاء حساب';
        registerBtn.onclick = () => showRegisterModal();
    }
    
    // Hide admin features
    if (adminBtn) adminBtn.style.display = 'none';
    if (addBookBtn) addBookBtn.style.display = 'none';
    
    // Clear loans list
    const loansList = document.getElementById('loansList');
    if (loansList) {
        loansList.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="fas fa-user-lock fa-3x mb-3"></i>
                <p>يرجى تسجيل الدخول لعرض الاستعارات</p>
                <button class="btn btn-primary" onclick="showLoginModal()">تسجيل الدخول</button>
            </div>
        `;
    }
}

// ==================== BOOK FUNCTIONS ====================

// Setup navigation
function setupNavigation() {
    const navLinks = document.querySelectorAll('a.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const target = this.getAttribute('data-bs-target');
            if (target === '#borrows') {
                loadMyLoans();
            } else if (target === '#catalog') {
                loadBooks();
            }
        });
    });
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Modal functions
function showLoginModal() {
    const modalElement = document.getElementById('loginModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }
}

function showRegisterModal() {
    const modalElement = document.getElementById('registerModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }
}

function showAdminLoginModal() {
    const modalElement = document.getElementById('adminLoginModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }
}

// Load books from API
async function loadBooks(searchTerm = '') {
    const authorFilter = document.getElementById('authorFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    
    const selectedAuthor = authorFilter ? authorFilter.value : '';
    const selectedCategory = categoryFilter ? categoryFilter.value : '';
    
    await loadBooksWithFilters(searchTerm, selectedAuthor, selectedCategory);
}

// Display books in grid
function displayBooks(books) {
    if (!booksGrid) {
        console.error('❌ booksGrid element not found!');
        return;
    }
    
    booksGrid.innerHTML = '';
    
    if (!books || books.length === 0) {
        booksGrid.innerHTML = `
            <div class="col-12 text-center text-muted py-5">
                <i class="fas fa-book-open fa-3x mb-3"></i>
                <p>لا توجد كتب متاحة</p>
                <p class="small">قم بإضافة كتب جديدة أو حاول البحث بمصطلحات أخرى</p>
            </div>
        `;
        return;
    }
    
    books.forEach((book) => {
        const col = document.createElement('div');
        col.className = 'col-lg-4 col-md-6 mb-4';
        
        // Handle both populated and unpopulated author/category
        let authorName = 'مؤلف غير معروف';
        if (book.author) {
            authorName = typeof book.author === 'object' ? book.author.name : book.author;
        }
        
        let categoryName = 'غير مصنف';
        if (book.category) {
            categoryName = typeof book.category === 'object' ? book.category.name : book.category;
        }
        
        const isAvailable = book.availableCopies > 0;
        const statusText = isAvailable ? 'متاح' : 'مستعار';
        const statusClass = isAvailable ? 'status-available' : 'status-borrowed';

        col.innerHTML = `
            <div class="book-card h-100">
                <div class="book-card-img">
                    <i class="fas fa-book"></i>
                </div>
                <div class="book-card-body d-flex flex-column">
                    <div class="flex-grow-1">
                        <span class="book-status ${statusClass}">${statusText}</span>
                        <h5 class="mt-2 fw-bold">${book.title || 'عنوان غير معروف'}</h5>
                        <p class="text-muted mb-1">
                            <i class="fas fa-user-edit me-1"></i>${authorName}
                        </p>
                        <p class="small text-primary mb-2">
                            <i class="fas fa-tag me-1"></i>${categoryName}
                        </p>
                        <p class="book-summary">${book.summary || 'لا يوجد وصف متاح'}</p>
                    </div>
                    <div class="book-meta mt-auto">
                        <small class="text-muted d-block mb-2">
                            <i class="fas fa-copy me-1"></i>${book.availableCopies || 0} نسخة متاحة من ${book.totalCopies || 0}
                        </small>
                       <div class="d-flex gap-2">
                            <button class="btn btn-primary btn-sm flex-fill" onclick="borrowBook('${book._id}', '${book.title}')" 
                                ${!isAvailable ? 'disabled' : ''}>
                                <i class="fas fa-bookmark me-1"></i>استعارة
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="showBookDetails('${book._id}')" title="تفاصيل الكتاب">
                                <i class="fas fa-info-circle"></i>
                            </button>
                            ${currentUser && currentUser.role === 'admin' ? `
                                <button class="btn btn-outline-danger btn-sm" onclick="deleteBook('${book._id}', '${book.title}')" title="حذف الكتاب">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        booksGrid.appendChild(col);
    });
}

// ==================== LOAN FUNCTIONS ====================

// Borrow book function - UPDATED with real authentication
async function borrowBook(bookId, bookTitle) {
    if (!currentUser) {
        showNotification('يرجى تسجيل الدخول أولاً', 'error');
        showLoginModal();
        return;
    }
    
    try {
        showNotification(`جاري معالجة طلب استعارة "${bookTitle}"...`, 'info');
        
        console.log('📚 Borrowing book:', bookId, 'for user:', currentUser._id);
        
        const response = await fetch(`${API_BASE}/loans`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                bookId: bookId
                // user ID is automatically taken from JWT token in backend
            })
        });
        
        console.log('📚 Borrow response status:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            showNotification(`تم استعارة الكتاب "${bookTitle}" بنجاح!`, 'success');
            loadBooks(); // Refresh books to update available copies
            loadMyLoans(); // Refresh loans list
        } else {
            const error = await response.json();
            showNotification(error.message || `فشل في استعارة الكتاب "${bookTitle}"`, 'error');
        }
    } catch (error) {
        console.error('❌ Borrow error:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
}

// Load user's loans - UPDATED with real authentication
// Load user's loans - UPDATED with smart endpoint selection
async function loadMyLoans() {
    try {
        const loansList = document.getElementById('loansList');
        if (!loansList) return;
        
        loansList.innerHTML = `
            <div class="text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">جاري التحميل...</span>
                </div>
                <p class="mt-2">جاري تحميل الاستعارات...</p>
            </div>
        `;

        console.log('🔍 LOAD MY LOANS: Starting...');
        console.log('👤 Current user:', currentUser);
        console.log('👤 Is admin?:', isAdmin);

        // ✅ SMART ENDPOINT SELECTION
        const endpoint = isAdmin ? '/all' : '/my-loans';
        console.log('🔍 Using endpoint:', endpoint);
        
        const response = await fetch(`${API_BASE}/loans${endpoint}`, {
            headers: getAuthHeaders()
        });
        
        console.log('🔍 My loans response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            // Handle both response formats
            const myLoans = data.loans || data;
            
            console.log('✅ MY LOANS DATA:', myLoans);
            console.log('✅ Number of loans:', myLoans.length);
            
            // ✅ Pass isAdmin flag to display function
            displayMyLoans(myLoans, isAdmin);
        } else {
            const errorText = await response.text();
            console.error('❌ My loans error:', errorText);
            throw new Error('Failed to fetch user loans');
        }
    } catch (error) {
        console.error('❌ Error loading loans:', error);
        const loansList = document.getElementById('loansList');
        if (loansList) {
            loansList.innerHTML = `
                <div class="text-center text-danger py-4">
                    <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                    <p>خطأ في تحميل الاستعارات</p>
                    <small class="d-block text-muted">${error.message}</small>
                    <button class="btn btn-primary btn-sm" onclick="loadMyLoans()">إعادة المحاولة</button>
                </div>
            `;
        }
    }
}

// Display user's loans
// Display user's loans - UPDATED for admin view
function displayMyLoans(loans, isAdmin = false) {
    const loansList = document.getElementById('loansList');
    if (!loansList) return;
    
    // ✅ Different headers based on user role
    const sectionTitle = isAdmin ? 'جميع الاستعارات في النظام' : 'استعاراتي';
    const sectionDescription = isAdmin ? 'عرض جميع استعارات الكتب في النظام' : 'عرض الكتب التي قمت باستعارتها';
    
    // Update section title if elements exist
    const titleElement = document.querySelector('#loans .section-title');
    const descElement = document.querySelector('#loans .text-muted');
    if (titleElement) titleElement.textContent = sectionTitle;
    if (descElement) descElement.textContent = sectionDescription;

    if (!currentUser) {
        loansList.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="fas fa-user-lock fa-3x mb-3"></i>
                <p>يرجى تسجيل الدخول لعرض الاستعارات</p>
                <button class="btn btn-primary" onclick="showLoginModal()">تسجيل الدخول</button>
            </div>
        `;
        return;
    }

    if (!loans || loans.length === 0) {
        const noLoansMessage = isAdmin ? 
            'لا توجد استعارات في النظام حالياً' : 
            'لا توجد استعارات حالية';
        const noLoansDescription = isAdmin ?
            'سيتم عرض الاستعارات هنا عندما يقوم المستخدمون باستعارة الكتب' :
            'قم بزيارة الفهرس واختر الكتب التي ترغب في استعارتها';
            
        loansList.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="fas fa-book-open fa-3x mb-3"></i>
                <p>${noLoansMessage}</p>
                <p class="small">${noLoansDescription}</p>
                ${!isAdmin ? '<button class="btn btn-primary" onclick="scrollToCatalog()">عرض الكتب المتاحة</button>' : ''}
            </div>
        `;
        return;
    }

    loansList.innerHTML = loans.map(loan => {
        const bookTitle = loan.book?.title || loan.bookTitle || 'كتاب غير معروف';
        const dueDate = loan.dueDate ? new Date(loan.dueDate).toLocaleDateString('ar-EG') : 'غير محدد';
        const borrowDate = loan.borrowDate ? new Date(loan.borrowDate).toLocaleDateString('ar-EG') : 'غير محدد';
        const isOverdue = loan.dueDate && new Date() > new Date(loan.dueDate) && (loan.status === 'active' || !loan.status);
        const status = isOverdue ? 'overdue' : (loan.status || 'active');
        
        // ✅ Admin view: Show user information
        const userInfo = isAdmin && loan.user ? `
            <div class="mb-2">
                <small class="text-info">
                    <i class="fas fa-user me-1"></i>
                    المستخدم: ${loan.user.name || 'غير معروف'} 
                    ${loan.user.email ? `(${loan.user.email})` : ''}
                </small>
            </div>
        ` : '';
        
        let statusText, statusClass;
        switch(status) {
            case 'active': statusText = 'نشطة'; statusClass = 'status-active'; break;
            case 'overdue': statusText = 'متأخرة'; statusClass = 'status-overdue'; break;
            case 'returned': statusText = 'تم الإرجاع'; statusClass = 'status-returned'; break;
            default: statusText = 'نشطة'; statusClass = 'status-active';
        }

        return `
            <div class="loan-card">
                <div class="row align-items-center">
                    <div class="${isAdmin ? 'col-md-5' : 'col-md-6'}">
                        <h5 class="mb-2">${bookTitle}</h5>
                        ${userInfo}
                        <p class="text-muted mb-1">
                            <i class="fas fa-calendar-alt me-1"></i>تاريخ الاستعارة: ${borrowDate}
                        </p>
                        <p class="loan-due-date mb-0">
                            <i class="fas fa-clock me-1"></i>موعد الإرجاع: ${dueDate}
                        </p>
                    </div>
                    <div class="${isAdmin ? 'col-md-3' : 'col-md-4'}">
                        <span class="loan-status ${statusClass}">${statusText}</span>
                        ${isOverdue ? `
                            <div class="mt-2">
                                <small class="fine-amount">
                                    <i class="fas fa-exclamation-triangle me-1"></i>توجد غرامة متأخرة
                                </small>
                            </div>
                        ` : ''}
                    </div>
                    <div class="${isAdmin ? 'col-md-4' : 'col-md-2'} text-end">
                        ${status === 'active' ? `
                            <button class="btn btn-outline-primary btn-sm" onclick="returnBook('${loan._id}', '${bookTitle}')">إرجاع الكتاب</button>
                        ` : ''}
                        ${isAdmin ? `
                            <div class="mt-2">
                                <small class="text-muted">رقم الاستعارة: ${loan._id}</small>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}
// Make "استكشاف الكتب" button functional

// Return book function - UPDATED with real authentication
async function returnBook(loanId, bookTitle) {
    try {
        showNotification(`جاري إرجاع الكتاب "${bookTitle}"...`, 'info');
        
        console.log('🔄 Returning loan:', loanId);
        
        const response = await fetch(`${API_BASE}/loans/${loanId}/return`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });
        
        console.log('🔄 Return response status:', response.status);
        
        if (response.ok) {
            showNotification(`تم إرجاع الكتاب "${bookTitle}" بنجاح!`, 'success');
            loadMyLoans();
            loadBooks();
        } else {
            const error = await response.json();
            showNotification(error.message || `فشل في إرجاع الكتاب "${bookTitle}"`, 'error');
        }
    } catch (error) {
        console.error('❌ Return error:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
}

// ==================== ADMIN FUNCTIONS ====================

// Show admin features
function showAdminFeatures() {
    if (adminBtn) adminBtn.style.display = 'block';
    if (addBookBtn) addBookBtn.style.display = 'block';
}

// Show admin panel
function showAdminPanel() {
    loadOverdueLoans();
    const modalElement = document.getElementById('adminModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }
}

// Show book details
// Show book details modal (smart - read-only for users, editable for admin)
async function showBookDetails(bookId) {
    try {
        console.log('📖 Loading book details for:', bookId);
        
        // Show loading notification instead of placeholder
        showNotification('جاري تحميل تفاصيل الكتاب...', 'info');
        
        // Fetch book details from API
        const response = await fetch(`${API_BASE}/books/${bookId}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch book details');
        }
        
        const book = await response.json();
        currentBookInModal = book;
        
        console.log('📖 Book details loaded:', book);
        
        // Populate the modal with book data
        populateBookDetailsModal(book);
        
        // Show/hide edit controls based on user role
        setupEditMode(isAdmin);
        
        // Show the modal
        const modalElement = document.getElementById('bookDetailsModal');
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        }
        
    } catch (error) {
        console.error('❌ Error loading book details:', error);
        showNotification('خطأ في تحميل تفاصيل الكتاب', 'error');
    }
}

// Populate modal with book data
function populateBookDetailsModal(book) {
    // Basic book information
    document.getElementById('detailBookTitle').value = book.title || '';
    document.getElementById('detailBookAuthor').textContent = book.author?.name || book.author || 'غير معروف';
    document.getElementById('detailBookCategory').value = book.category?.name || book.category || 'غير مصنف';
    document.getElementById('detailBookYear').value = book.publishedYear || '';
    document.getElementById('detailBookSummary').value = book.summary || '';
    document.getElementById('detailBookCopies').value = book.totalCopies || 1;
    document.getElementById('detailBookISBN').value = book.isbn || '';
    document.getElementById('detailBookPublisher').value = book.publisher || '';
    
    // Read-only metadata
    document.getElementById('detailAvailableCopies').textContent = book.availableCopies || 0;
    
    // Book status
    const status = book.availableCopies > 0 ? 'متاح' : 'مستعار';
    const statusClass = book.availableCopies > 0 ? 'text-success' : 'text-warning';
    document.getElementById('detailBookStatus').textContent = status;
    document.getElementById('detailBookStatus').className = `form-control-plaintext ${statusClass}`;
    
    // Update modal title
    document.getElementById('bookDetailsTitle').textContent = `تفاصيل الكتاب: ${book.title}`;
}

// Setup edit mode based on user role
function setupEditMode(isAdminUser) {
    const editableFields = [
        'detailBookTitle',
        'detailBookCategory', 
        'detailBookYear',
        'detailBookSummary',
        'detailBookCopies',
        'detailBookISBN',
        'detailBookPublisher'
    ];
    
    const adminElements = document.querySelectorAll('.admin-only');
    const userElements = document.querySelectorAll('.user-only');
    
    if (isAdminUser) {
        // Show admin controls, hide user controls
        adminElements.forEach(el => el.style.display = 'block');
        userElements.forEach(el => el.style.display = 'none');
        
        // Make fields editable
        editableFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.readOnly = false;
                field.classList.add('editable-field');
            }
        });
        
        console.log('🔧 Edit mode: ADMIN (editable)');
        
    } else {
        // Show user controls, hide admin controls
        adminElements.forEach(el => el.style.display = 'none');
        userElements.forEach(el => el.style.display = 'block');
        
        // Make fields read-only
        editableFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.readOnly = true;
                field.classList.remove('editable-field');
            }
        });
        
        console.log('🔧 Edit mode: USER (read-only)');
    }
}

// Save book changes (Admin only)
async function saveBookChanges() {
    if (!currentBookInModal || !isAdmin) {
        showNotification('غير مصرح بالتعديل', 'error');
        return;
    }
    
    try {
        // Get updated values from form
        const updatedBook = {
            title: document.getElementById('detailBookTitle').value,
            categoryName: document.getElementById('detailBookCategory').value, // Text input for category
            publishedYear: document.getElementById('detailBookYear').value,
            summary: document.getElementById('detailBookSummary').value,
            totalCopies: parseInt(document.getElementById('detailBookCopies').value) || 1,
            isbn: document.getElementById('detailBookISBN').value,
            publisher: document.getElementById('detailBookPublisher').value
        };
        
        console.log('💾 Saving book changes:', updatedBook);
        
        // Validate required fields
        if (!updatedBook.title || !updatedBook.categoryName) {
            showNotification('العنوان والتصنيف حقول مطلوبة', 'error');
            return;
        }
        
        showNotification('جاري حفظ التغييرات...', 'info');
        
        // Send update to backend
        const response = await fetch(`${API_BASE}/books/${currentBookInModal._id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(updatedBook)
        });
        
        if (response.ok) {
            const result = await response.json();
            showNotification('تم حفظ التغييرات بنجاح!', 'success');
            
            // Close modal
            const modalElement = document.getElementById('bookDetailsModal');
            if (modalElement) {
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) modal.hide();
            }
            
            // Refresh books list to show changes
            loadBooks();
            
        } else {
            const error = await response.json();
            showNotification(error.message || 'فشل في حفظ التغييرات', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error saving book changes:', error);
        showNotification('خطأ في حفظ التغييرات', 'error');
    }
}
// Scroll to catalog function
function scrollToCatalog() {
    const catalogSection = document.getElementById('catalog');
    if (catalogSection) {
        catalogSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
//scroll to gallery function
function scrollToAuthors() {
    const authorsSection = document.getElementById('authors');
    if (authorsSection) {
        authorsSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert.position-fixed');
    existingAlerts.forEach(alert => alert.remove());
    
    const alert = document.createElement('div');
    const alertClass = type === 'success' ? 'alert-success' : 
                      type === 'error' ? 'alert-danger' : 'alert-info';
    
    alert.className = `alert ${alertClass} position-fixed`;
    alert.style.cssText = `
        top: 100px; 
        right: 20px; 
        z-index: 1050; 
        min-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        border: none;
        border-radius: 10px;
    `;
    
    const icon = type === 'success' ? 'fa-check-circle' :
                 type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    
    alert.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas ${icon} me-2"></i>
            <span class="flex-grow-1">${message}</span>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        if (alert.parentNode) alert.remove();
    }, 5000);
}

// ==================== BOOK MANAGEMENT FUNCTIONS ====================

// Add book functionality
async function openAddBookModal() {
    if (!isAdmin) {
        showNotification('يجب تسجيل الدخول كمسؤول لإضافة كتب', 'error');
        showAdminLoginModal();
        return;
    }
    
    // Load authors and categories for dropdowns
    await loadFormData();
    
    const modalElement = document.getElementById('addBookModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }
}

// Load form data for dropdowns
async function loadFormData() {
    try {
        const [authorsRes, categoriesRes] = await Promise.all([
            fetch(`${API_BASE}/authors`),
            fetch(`${API_BASE}/categories`)
        ]);
        
        if (authorsRes.ok) {
            authorsList = await authorsRes.json();
        } else {
            console.warn('Failed to load authors');
            authorsList = [];
        }
        
        if (categoriesRes.ok) {
            categoriesList = await categoriesRes.json();
        } else {
            console.warn('Failed to load categories');
            categoriesList = [];
        }
        
        // Populate author dropdown
        const authorSelect = document.getElementById('bookAuthor');
        if (authorSelect) {
            authorSelect.innerHTML = '<option value="">اختر المؤلف</option>';
            authorsList.forEach(author => {
                authorSelect.innerHTML += `<option value="${author._id}">${author.name}</option>`;
            });
        }
        
        // Populate category dropdown
        const categorySelect = document.getElementById('bookCategory');
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">اختر التصنيف</option>';
            categoriesList.forEach(category => {
                categorySelect.innerHTML += `<option value="${category._id}">${category.name}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading form data:', error);
        showNotification('خطأ في تحميل بيانات النموذج', 'error');
    }
}

// Add new author function - FIXED VERSION
async function addNewAuthor(e) {
    // ✅ FIX: Check if event exists before calling preventDefault
    if (e && e.preventDefault) {
        e.preventDefault();
    }
    
    const authorName = document.getElementById('newAuthorName').value;
    const authorBio = document.getElementById('newAuthorBio').value;
    const authorNationality = document.getElementById('newAuthorNationality').value;
    
    if (!authorName) {
        showNotification('اسم المؤلف مطلوب', 'error');
        return;
    }

    try {
        showNotification('جاري إضافة المؤلف...', 'info');
        
        const response = await fetch(`${API_BASE}/authors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: authorName,
                bio: authorBio,
                nationality: authorNationality
            })
        });

        if (response.ok) {
            showNotification('تم إضافة المؤلف بنجاح!', 'success');
            
            // Close modal and reset form
            const modalElement = document.getElementById('addAuthorModal');
            if (modalElement) {
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) modal.hide();
            }
            
            document.getElementById('newAuthorName').value = '';
            document.getElementById('newAuthorBio').value = '';
            document.getElementById('newAuthorNationality').value = '';
            
            // Reload authors for the book form
            await loadFormData();
        } else {
            const error = await response.json();
            showNotification(error.message || 'فشل في إضافة المؤلف', 'error');
        }
    } catch (error) {
        console.error('Add author error:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
}

// Function to open add author modal
function openAddAuthorModal() {
    const modalElement = document.getElementById('addAuthorModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }
}

// Add new book
// Add new book - UPDATED for auto-create authors/categories
async function addNewBook(e) {
    e.preventDefault();
    
    if (!isAdmin) {
        showNotification('غير مصرح لك بإضافة كتب', 'error');
        return;
    }

    const form = document.getElementById('addBookForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Get form data
    const bookData = {
        title: document.getElementById('bookTitle').value,
        authorName: document.getElementById('bookAuthor').value, // ✅ Now text input
        categoryName: document.getElementById('bookCategory').value, // ✅ Now text input
        publishedYear: document.getElementById('bookYear').value || new Date().getFullYear(),
        summary: document.getElementById('bookSummary').value,
        totalCopies: parseInt(document.getElementById('bookCopies').value) || 1,
        isbn: document.getElementById('bookISBN').value,
        publisher: document.getElementById('bookPublisher').value
    };

    // Validate required fields
    if (!bookData.title || !bookData.authorName || !bookData.categoryName) {
        showNotification('العنوان، المؤلف، والتصنيف حقول مطلوبة', 'error');
        return;
    }

    try {
        showNotification('جاري إضافة الكتاب...', 'info');
        
        console.log('📚 Adding book with auto-create:', bookData);
        
       const response = await fetch(`${API_BASE}/books/auto-create`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(bookData)
});

        if (response.ok) {
            const result = await response.json();
            showNotification('تم إضافة الكتاب بنجاح!', 'success');
            
            // Close modal and reset form
            const modalElement = document.getElementById('addBookModal');
            if (modalElement) {
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) modal.hide();
            }
            
            form.reset();
            loadBooks(); // Refresh books list
        } else {
            const error = await response.json();
            showNotification(error.message || 'فشل في إضافة الكتاب', 'error');
        }
    } catch (error) {
        console.error('Add book error:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
}

// Delete book function
async function deleteBook(bookId, bookTitle) {
    if (!confirm(`هل أنت متأكد من حذف الكتاب "${bookTitle}"؟`)) {
        return;
    }
    
    try {
        showNotification(`جاري حذف الكتاب "${bookTitle}"...`, 'info');
        
        console.log('🗑️ Deleting book:', bookId);
        
        const response = await fetch(`${API_BASE}/books/${bookId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        console.log('✅ Delete response status:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Delete result:', result);
            showNotification(result.message, 'success');
            loadBooks(); // Refresh the book list
        } else {
            // Get detailed error message
            const errorText = await response.text();
            console.error('❌ Delete error response:', errorText);
            
            let errorMessage = `فشل في حذف الكتاب "${bookTitle}"`;
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (e) {
                errorMessage = errorText || errorMessage;
            }
            
            showNotification(errorMessage, 'error');
        }
    } catch (error) {
        console.error('❌ Delete request failed:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
}

// ==================== DEBUG FUNCTIONS ====================

// Debug function
async function debugBooks() {
    console.log("🧪 DEBUG INFO:");
    console.log("Current User:", currentUser);
    console.log("Is Admin:", isAdmin);
    
    const booksGrid = document.getElementById('booksGrid');
    console.log("Books Grid Children:", booksGrid ? booksGrid.children.length : 0);
    
    // Test API endpoints
    try {
        const response = await fetch(`${API_BASE}/books`);
        console.log("Books API Status:", response.status);
    } catch (error) {
        console.log("Books API Error:", error);
    }
}

// Debug function to check what's happening
async function debugUserLoans() {
    try {
        console.log('🔍 DEBUG: Loading user loans...');
        
        const response = await fetch('/api/loans/user-loans');
        console.log('🔍 DEBUG: Response status:', response.status);
        
        if (!response.ok) {
            console.log('❌ DEBUG: Response not OK:', response.status, response.statusText);
            return;
        }
        
        const data = await response.json();
        console.log('🔍 DEBUG: Loans data received:', data);
        console.log('🔍 DEBUG: Number of loans:', data.length);
        
        // Log each loan
        data.forEach((loan, index) => {
            console.log(`🔍 DEBUG: Loan ${index + 1}:`, {
                id: loan._id,
                book: loan.book?.title,
                user: loan.user?.name,
                status: loan.status,
                borrowDate: loan.borrowDate,
                dueDate: loan.dueDate
            });
        });
        
    } catch (error) {
        console.error('❌ DEBUG: Error loading loans:', error);
    }
}
// ==================== SEARCH FUNCTIONS ====================

// Handle search when button is clicked
function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        const searchTerm = searchInput.value.trim();
        console.log('🔍 Searching for:', searchTerm);
        loadBooks(searchTerm);
    }
}

// Handle search when Enter key is pressed
function handleSearchKeypress(event) {
    if (event.key === 'Enter') {
        console.log('🔍 Enter key pressed - searching...');
        handleSearch();
    }
}

// Real-time search as user types (with debounce)
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            const searchTerm = e.target.value.trim();
            console.log('🔍 Real-time search:', searchTerm);
            loadBooks(searchTerm);
        }, 500)); // 500ms delay
        
        console.log('✅ Search functionality initialized');
    }
}

// Make debug functions available globally
window.debugBooks = debugBooks;
window.debugUserLoans = debugUserLoans;
window.loadMyLoans = loadMyLoans;
window.borrowBook = borrowBook;
window.returnBook = returnBook;
window.deleteBook = deleteBook;
window.showLoginModal = showLoginModal;
window.showRegisterModal = showRegisterModal;
window.scrollToCatalog = scrollToCatalog;

// Call debug on load
debugUserLoans();
// ==================== FILTER FUNCTIONS ====================

// Load authors and categories for filters
async function loadFilterData() {
    try {
        console.log('🔍 Loading filter data...');
        
        // Fetch authors and categories simultaneously
        const [authorsResponse, categoriesResponse] = await Promise.all([
            fetch(`${API_BASE}/authors`),
            fetch(`${API_BASE}/categories`)
        ]);

        if (authorsResponse.ok && categoriesResponse.ok) {
            const authors = await authorsResponse.json();
            const categories = await categoriesResponse.json();
            
            console.log('✅ Authors loaded:', authors.length);
            console.log('✅ Categories loaded:', categories.length);
            
            // Populate dropdowns
            populateAuthorFilter(authors);
            populateCategoryFilter(categories);
        } else {
            throw new Error('Failed to load filter data');
        }
    } catch (error) {
        console.error('❌ Error loading filter data:', error);
    }
}

// Populate author dropdown
function populateAuthorFilter(authors) {
    const authorFilter = document.getElementById('authorFilter');
    if (!authorFilter) return;
    
    // Clear existing options (keep "All Authors")
    authorFilter.innerHTML = '<option value="">جميع المؤلفين</option>';
    
    // Add authors to dropdown
    authors.forEach(author => {
        const option = document.createElement('option');
        option.value = author._id;
        option.textContent = author.name;
        authorFilter.appendChild(option);
    });
    
    console.log('✅ Author filter populated with', authors.length, 'authors');
}

// Populate category dropdown  
function populateCategoryFilter(categories) {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;
    
    // Clear existing options (keep "All Categories")
    categoryFilter.innerHTML = '<option value="">جميع الفئات</option>';
    
    // Add categories to dropdown
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category._id;
        option.textContent = category.name;
        categoryFilter.appendChild(option);
    });
    
    console.log('✅ Category filter populated with', categories.length, 'categories');
}
// Apply filters when dropdowns change
function applyFilters() {
    console.log('🔍 Applying filters...');
    
    const authorFilter = document.getElementById('authorFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    const searchInput = document.getElementById('searchInput');
    
    const selectedAuthor = authorFilter ? authorFilter.value : '';
    const selectedCategory = categoryFilter ? categoryFilter.value : '';
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    
    console.log('Filter criteria:', {
        author: selectedAuthor,
        category: selectedCategory,
        search: searchTerm
    });
    
    // Load books with all filters applied
    loadBooksWithFilters(searchTerm, selectedAuthor, selectedCategory);
}

// Load books with search and filter criteria
async function loadBooksWithFilters(searchTerm = '', authorId = '', categoryId = '') {
    if (isLoading) {
        console.log('⏳ Already loading books, skipping...');
        return;
    }
    
    try {
        isLoading = true;
        console.log('🔍 Loading books with filters:', { searchTerm, authorId, categoryId });
        
        if (booksGrid) {
            booksGrid.innerHTML = '<div class="col-12 text-center"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">جاري تحميل الكتب...</p></div>';
        }
        
        // Build URL with all filter parameters
        let url = `${API_BASE}/books`;
        const params = new URLSearchParams();
        
        if (searchTerm) params.append('search', searchTerm);
        if (authorId) params.append('author', authorId);
        if (categoryId) params.append('category', categoryId);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        console.log('📡 Fetching from:', url);
        
        const response = await fetch(url);
        console.log('✅ Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Server error details:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📚 Filtered data received:', data);
        
        let books = data.books || data;
        
        if (!Array.isArray(books)) {
            console.warn('Books is not an array:', books);
            books = [];
        }
        
        console.log(`📚 Loaded ${books.length} books with filters`);
        displayBooks(books);
        
    } catch (error) {
        console.error('Error loading filtered books:', error);
        if (booksGrid) {
            booksGrid.innerHTML = `
                <div class="col-12 text-center text-danger py-5">
                    <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                    <p>خطأ في تحميل الكتب</p>
                    <small class="d-block text-muted">${error.message}</small>
                    <button class="btn btn-primary btn-sm mt-2" onclick="loadBooksWithFilters()">إعادة المحاولة</button>
                </div>
            `;
        }
    } finally {
        isLoading = false;
    }
}