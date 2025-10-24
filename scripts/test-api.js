// Test API endpoints
const API_BASE = 'http://localhost:8788/api';

async function testAPI() {
  console.log('Testing PayMyHustle API...\n');

  try {
    // Test user registration
    console.log('1. Testing user registration...');
    const registerResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'john@example.com',
        password: 'password123'
      })
    });

    const registerData = await registerResponse.json();
    console.log('Register response:', registerData);

    if (!registerData.success) {
      console.error('Registration failed');
      return;
    }

    const userId = registerData.userId;

    // Test user login
    console.log('\n2. Testing user login...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'john@example.com',
        password: 'password123'
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);

    // Test creating a company
    console.log('\n3. Testing company creation...');
    const companyResponse = await fetch(`${API_BASE}/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': userId
      },
      body: JSON.stringify({
        name: 'Test Corporation',
        email: 'contact@testcorp.com',
        address: '123 Business St\nCity, 12345',
        contactPerson: 'John Doe',
        phone: '+1-555-123-4567',
        invoicePrefix: 'TCORP'
      })
    });

    const companyData = await companyResponse.json();
    console.log('Company creation response:', companyData);

    if (!companyData.success) {
      console.error('Company creation failed');
      return;
    }

    const companyId = companyData.company.id;

    // Test getting companies
    console.log('\n4. Testing get companies...');
    const getCompaniesResponse = await fetch(`${API_BASE}/companies`, {
      method: 'GET',
      headers: {
        'X-User-ID': userId
      }
    });

    const companiesData = await getCompaniesResponse.json();
    console.log('Get companies response:', companiesData);

    // Test updating user profile
    console.log('\n5. Testing update user profile...');
    const updateProfileResponse = await fetch(`${API_BASE}/user/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': userId
      },
      body: JSON.stringify({
        business_name: 'My Awesome Business',
        business_address: '456 Main St\nAnytown, 67890',
        contact_email: 'contact@myawesomebusiness.com',
        contact_phone: '+1-555-987-6543',
        website: 'https://myawesomebusiness.com',
        footer_text: 'Thank you for choosing us!'
      })
    });

    const updateProfileData = await updateProfileResponse.json();
    console.log('Update profile response:', updateProfileData);

    // Test getting user profile
    console.log('\n6. Testing get user profile...');
    const profileResponse = await fetch(`${API_BASE}/user/profile`, {
      method: 'GET',
      headers: {
        'X-User-ID': userId
      }
    });

    const profileData = await profileResponse.json();
    console.log('Get profile response:', profileData);

    // Test creating an invoice
    console.log('\n7. Testing invoice creation...');
    const invoiceResponse = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': userId
      },
      body: JSON.stringify({
        companyId: companyId,
        invoiceNumber: 'TCORP001',
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        status: 'pending',
        notes: 'Net 30 payment terms',
        lineItems: [
          {
            description: 'Web Development Services',
            quantity: 20,
            rate: 75.00
          },
          {
            description: 'Domain Registration',
            quantity: 1,
            rate: 15.00
          }
        ]
      })
    });

    const invoiceData = await invoiceResponse.json();
    console.log('Invoice creation response:', invoiceData);

    if (invoiceData.invoice) {
      const invoiceId = invoiceData.invoice.id;

      // Test getting invoices
      console.log('\n8. Testing get invoices...');
      const getInvoicesResponse = await fetch(`${API_BASE}/invoices`, {
        method: 'GET',
        headers: {
          'X-User-ID': userId
        }
      });

      const invoicesData = await getInvoicesResponse.json();
      console.log('Get invoices response:', invoicesData);

      // Test updating invoice status
      console.log('\n9. Testing update invoice status...');
      const statusResponse = await fetch(`${API_BASE}/invoices/${invoiceId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        },
        body: JSON.stringify({
          status: 'paid'
        })
      });

      const statusData = await statusResponse.json();
      console.log('Update status response:', statusData);

      // Test getting single invoice
      console.log('\n10. Testing get single invoice...');
      const singleInvoiceResponse = await fetch(`${API_BASE}/invoices/${invoiceId}`, {
        method: 'GET',
        headers: {
          'X-User-ID': userId
        }
      });

      const singleInvoiceData = await singleInvoiceResponse.json();
      console.log('Get single invoice response:', singleInvoiceData);
    }

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAPI();