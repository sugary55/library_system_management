# Library Management System - Database Schema

## Collections Overview

### 1. Users Collection
Stores information about library users (students, staff, admins)

**Fields:**
- `name` (String, required): User's full name
- `email` (String, required, unique): User's email address
- `password` (String, required): Hashed password
- `universityId` (String, unique): Student/Staff ID number
- `phone` (String): Contact number
- `role` (String, enum: ['student', 'staff', 'admin']): User role
- `isActive` (Boolean): Account status
- `timestamps` (Auto-generated): Created/updated dates

### 2. Books Collection
Stores book information and inventory

**Fields:**
- `title` (String, required): Book title
- `author` (ObjectId, ref: 'Author'): Reference to author
- `isbn` (String, unique): International Standard