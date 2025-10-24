# PayMyHustle API Documentation

## Overview
Complete REST API for the PayMyHustle invoice management system, built with Cloudflare D1 database and Functions.

## Base URL
- **Development**: `http://localhost:8788/api`
- **Production**: `https://your-domain.pages.dev/api`

## Authentication
Currently using simple header-based authentication:
- **Header**: `X-User-ID: <user-id>`
- *Note: In production, implement proper JWT token authentication*

---

## Authentication Endpoints

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "userId": "uuid-here",
  "message": "User created successfully"
}
```

### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "email": "user@example.com"
  }
}
```

---

## User Profile Endpoints

### Get User Profile
```http
GET /api/user/profile
X-User-ID: <user-id>
```

**Response (200 OK):**
```json
{
  "profile": {
    "id": "uuid",
    "user_id": "uuid",
    "business_name": "My Business",
    "business_address": "123 Main St\nCity, State 12345",
    "contact_email": "contact@mybusiness.com",
    "contact_phone": "+1-555-123-4567",
    "website": "https://mybusiness.com",
    "footer_text": "Thank you for your business!",
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z"
  }
}
```

### Update User Profile
```http
PUT /api/user/profile
X-User-ID: <user-id>
Content-Type: application/json

{
  "business_name": "My Awesome Business",
  "business_address": "456 Business Ave\nSuite 100\nCity, State 67890",
  "contact_email": "hello@awesomebusiness.com",
  "contact_phone": "+1-555-987-6543",
  "website": "https://awesomebusiness.com",
  "footer_text": "Thank you for choosing us!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```

### Get Banking Details
```http
GET /api/user/banking
X-User-ID: <user-id>
```

### Update Banking Details
```http
PUT /api/user/banking
X-User-ID: <user-id>
Content-Type: application/json

{
  "account_holder": "John Doe",
  "bank_name": "First National Bank",
  "account_number": "1234567890",
  "account_type": "Business Checking",
  "branch_code": "123456",
  "swift_code": "FNBBUS33"
}
```

---

## Company Endpoints

### Get All Companies
```http
GET /api/companies
X-User-ID: <user-id>
```

**Response (200 OK):**
```json
{
  "companies": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "Acme Corporation",
      "email": "billing@acme.com",
      "address": "123 Corporate Blvd\nBusiness City, BC 12345",
      "contact_person": "Jane Smith",
      "phone": "+1-555-123-9999",
      "invoice_prefix": "ACME",
      "invoice_count": 5,
      "total_revenue": 12500.00,
      "created_at": "2024-01-01T12:00:00Z",
      "updated_at": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### Create Company
```http
POST /api/companies
X-User-ID: <user-id>
Content-Type: application/json

{
  "name": "New Company Ltd",
  "email": "accounts@newcompany.com",
  "address": "789 New St\nNew City, NC 54321",
  "contactPerson": "Bob Johnson",
  "phone": "+1-555-456-7890",
  "invoicePrefix": "NEWCO"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "company": {
    "id": "uuid",
    "user_id": "uuid",
    "name": "New Company Ltd",
    // ... other company fields
  }
}
```

### Update Company
```http
PUT /api/companies/<company-id>
X-User-ID: <user-id>
Content-Type: application/json

{
  "email": "new-email@company.com",
  "address": "Updated address",
  "contactPerson": "New Contact Person",
  "phone": "+1-555-111-2222"
}
```

### Delete Company
```http
DELETE /api/companies/<company-id>
X-User-ID: <user-id>
```

---

## Invoice Endpoints

### Get All Invoices
```http
GET /api/invoices
X-User-ID: <user-id>
```

**Response (200 OK):**
```json
{
  "invoices": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "company_id": "uuid",
      "invoice_number": "ACME001",
      "invoice_date": "2024-01-15",
      "due_date": "2024-02-15",
      "status": "pending",
      "notes": "Net 30 payment terms",
      "total_amount": 1515.00,
      "company_name": "Acme Corporation",
      "company_email": "billing@acme.com",
      "company_address": "123 Corporate Blvd\nBusiness City, BC 12345",
      "company_contact_person": "Jane Smith",
      "company_phone": "+1-555-123-9999",
      "lineItems": [
        {
          "id": "uuid",
          "invoice_id": "uuid",
          "description": "Web Development Services",
          "quantity": 20,
          "rate": 75.00,
          "amount": 1500.00,
          "created_at": "2024-01-15T12:00:00Z"
        },
        {
          "id": "uuid",
          "invoice_id": "uuid",
          "description": "Domain Registration",
          "quantity": 1,
          "rate": 15.00,
          "amount": 15.00,
          "created_at": "2024-01-15T12:00:00Z"
        }
      ],
      "created_at": "2024-01-15T12:00:00Z",
      "updated_at": "2024-01-15T12:00:00Z"
    }
  ]
}
```

### Get Single Invoice
```http
GET /api/invoices/<invoice-id>
X-User-ID: <user-id>
```

### Create Invoice
```http
POST /api/invoices
X-User-ID: <user-id>
Content-Type: application/json

{
  "companyId": "uuid",
  "invoiceNumber": "COMP001",
  "invoiceDate": "2024-01-15",
  "dueDate": "2024-02-15",
  "status": "pending",
  "notes": "Payment due within 30 days",
  "lineItems": [
    {
      "description": "Consulting Services",
      "quantity": 10,
      "rate": 100.00
    },
    {
      "description": "Setup Fee",
      "quantity": 1,
      "rate": 250.00
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "invoice": {
    "id": "uuid",
    // ... full invoice object with line items
  }
}
```

### Update Invoice
```http
PUT /api/invoices/<invoice-id>
X-User-ID: <user-id>
Content-Type: application/json

{
  "invoiceDate": "2024-01-20",
  "dueDate": "2024-02-20",
  "status": "pending",
  "notes": "Updated payment terms",
  "lineItems": [
    {
      "description": "Updated Service",
      "quantity": 15,
      "rate": 90.00
    }
  ]
}
```

### Update Invoice Status
```http
PUT /api/invoices/<invoice-id>/status
X-User-ID: <user-id>
Content-Type: application/json

{
  "status": "paid"
}
```

**Valid statuses**: `pending`, `paid`, `overdue`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Invoice status updated to paid"
}
```

### Delete Invoice
```http
DELETE /api/invoices/<invoice-id>
X-User-ID: <user-id>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Invoice deleted successfully"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required fields"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

### 404 Not Found
```json
{
  "error": "Invoice not found"
}
```

### 409 Conflict
```json
{
  "error": "User already exists"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to create invoice"
}
```

---

## Database Schema

### Tables
- **users**: User accounts with authentication
- **user_profiles**: Business profile information
- **banking_details**: Payment/banking information
- **companies**: Client companies
- **invoices**: Invoice records
- **invoice_line_items**: Individual line items per invoice

### Key Features
- **User Isolation**: All data is scoped to specific users
- **Data Integrity**: Foreign key relationships maintained
- **Performance**: Optimized with proper indexes
- **Revenue Tracking**: Automatic company revenue calculations
- **Status Management**: Invoice status tracking with revenue updates

---

## Deployment

### Local Development
```bash
# Install dependencies
npm install

# Build the app
npm run build

# Start development server with D1 database
wrangler pages dev dist --d1=DB=paymyhustle-db
```

### Production Deployment
```bash
# Deploy to Cloudflare Pages
wrangler pages deploy dist

# Run migrations on production database
wrangler d1 execute paymyhustle-db --file=./migrations/0001_initial_schema.sql --remote
```

---

## Next Steps

1. **Frontend Integration**: Connect React app to use these APIs
2. **Authentication**: Implement proper JWT token authentication
3. **PDF Generation**: Add server-side PDF generation endpoint
4. **Data Migration**: Create utility to migrate localStorage data
5. **Rate Limiting**: Add API rate limiting for production
6. **Validation**: Add comprehensive input validation
7. **Logging**: Implement proper error logging and monitoring