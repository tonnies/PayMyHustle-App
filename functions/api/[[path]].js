// Main API handler for all routes
import { generateId } from '../utils/generateId';
import { hashPassword, verifyPassword } from '../utils/auth';
import { corsHeaders, handleCors } from '../utils/cors';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/', '');
  const method = request.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return handleCors();
  }

  try {
    // Route handling
    const [resource, id, action] = path.split('/');

    switch (resource) {
      case 'auth':
        return await handleAuth(request, env, id);
      case 'companies':
        return await handleCompanies(request, env, id, action);
      case 'invoices':
        return await handleInvoices(request, env, id, action);
      case 'user':
        return await handleUser(request, env, id);
      default:
        return new Response(JSON.stringify({ error: 'Route not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Authentication handlers
async function handleAuth(request, env, action) {
  const method = request.method;

  switch (action) {
    case 'register':
      if (method === 'POST') return await registerUser(request, env);
      break;
    case 'login':
      if (method === 'POST') return await loginUser(request, env);
      break;
    case 'verify':
      if (method === 'GET') return await verifyToken(request, env);
      break;
    case 'oauth':
      // Handle nested OAuth routes like /auth/oauth/register
      const url = new URL(request.url);
      const oauthAction = url.pathname.split('/').pop();
      if (oauthAction === 'register' && method === 'POST') {
        return await registerOAuthUser(request, env);
      }
      break;
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// User registration
async function registerUser(request, env) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user exists
    const existingUser = await env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();

    if (existingUser) {
      return new Response(JSON.stringify({ error: 'User already exists' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create user
    const userId = generateId();
    const passwordHash = await hashPassword(password);

    await env.DB.prepare(`
      INSERT INTO users (id, email, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `).bind(userId, email, passwordHash).run();

    // Create default user profile
    const profileId = generateId();
    await env.DB.prepare(`
      INSERT INTO user_profiles (id, user_id, footer_text, created_at, updated_at)
      VALUES (?, ?, 'Thank you for your business!', datetime('now'), datetime('now'))
    `).bind(profileId, userId).run();

    return new Response(JSON.stringify({
      success: true,
      userId,
      message: 'User created successfully'
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return new Response(JSON.stringify({ error: 'Registration failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// OAuth user registration
async function registerOAuthUser(request, env) {
  try {
    const { id, email, name, firstName, lastName, imageUrl } = await request.json();

    if (!id || !email) {
      return new Response(JSON.stringify({ error: 'User ID and email required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user exists
    const existingUser = await env.DB.prepare(
      'SELECT id FROM users WHERE id = ? OR email = ?'
    ).bind(id, email).first();

    if (existingUser) {
      // User exists, return success with existing user ID (idempotent operation)
      return new Response(JSON.stringify({
        success: true,
        userId: existingUser.id,
        message: 'User already exists'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create new OAuth user (no password needed)
    await env.DB.prepare(`
      INSERT INTO users (id, email, password_hash, created_at, updated_at)
      VALUES (?, ?, 'oauth', datetime('now'), datetime('now'))
    `).bind(id, email).run();

    // Create default user profile with OAuth data
    const profileId = generateId();
    const businessName = name || `${firstName} ${lastName}`.trim() || email.split('@')[0];

    await env.DB.prepare(`
      INSERT INTO user_profiles (id, user_id, business_name, contact_email, footer_text, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'Thank you for your business!', datetime('now'), datetime('now'))
    `).bind(profileId, id, businessName, email).run();

    return new Response(JSON.stringify({
      success: true,
      userId: id,
      message: 'OAuth user created successfully'
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('OAuth registration error:', error);
    return new Response(JSON.stringify({ error: 'OAuth registration failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// User login
async function loginUser(request, env) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get user
    const user = await env.DB.prepare(
      'SELECT id, email, password_hash FROM users WHERE email = ?'
    ).bind(email).first();

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // For now, return user info (in production, implement JWT tokens)
    return new Response(JSON.stringify({
      success: true,
      user: { id: user.id, email: user.email }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: 'Login failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Companies handlers
async function handleCompanies(request, env, id, action) {
  const method = request.method;
  const userId = request.headers.get('X-User-ID'); // Temporary auth method

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  switch (method) {
    case 'GET':
      return await getCompanies(env, userId);
    case 'POST':
      return await createCompany(request, env, userId);
    case 'PUT':
      return await updateCompany(request, env, userId, id);
    case 'DELETE':
      return await deleteCompany(env, userId, id);
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Get all companies for user
async function getCompanies(env, userId) {
  try {
    const companies = await env.DB.prepare(`
      SELECT * FROM companies WHERE user_id = ? ORDER BY name
    `).bind(userId).all();

    return new Response(JSON.stringify({ companies: companies.results || [] }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get companies error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch companies' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Create company
async function createCompany(request, env, userId) {
  try {
    const companyData = await request.json();
    const companyId = generateId();

    // Use provided invoice_count or default to 0
    const invoiceCount = typeof companyData.invoiceCount === 'number'
      ? companyData.invoiceCount
      : 0;

    await env.DB.prepare(`
      INSERT INTO companies (
        id, user_id, name, email, address, contact_person, phone,
        invoice_prefix, invoice_count, total_revenue, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, datetime('now'), datetime('now'))
    `).bind(
      companyId, userId, companyData.name, companyData.email || null,
      companyData.address || null, companyData.contactPerson || null,
      companyData.phone || null, companyData.invoicePrefix || null, invoiceCount
    ).run();

    const company = await env.DB.prepare(
      'SELECT * FROM companies WHERE id = ?'
    ).bind(companyId).first();

    return new Response(JSON.stringify({ success: true, company }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Create company error:', error);
    return new Response(JSON.stringify({ error: 'Failed to create company' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Update company
async function updateCompany(request, env, userId, companyId) {
  try {
    if (!companyId) {
      return new Response(JSON.stringify({ error: 'Company ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const companyData = await request.json();

    // Verify company belongs to user
    const existingCompany = await env.DB.prepare(
      'SELECT id FROM companies WHERE id = ? AND user_id = ?'
    ).bind(companyId, userId).first();

    if (!existingCompany) {
      return new Response(JSON.stringify({ error: 'Company not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await env.DB.prepare(`
      UPDATE companies
      SET name = ?,
          email = ?,
          address = ?,
          contact_person = ?,
          phone = ?,
          invoice_prefix = ?,
          updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).bind(
      companyData.name,
      companyData.email || null,
      companyData.address || null,
      companyData.contactPerson || null,
      companyData.phone || null,
      companyData.invoicePrefix || null,
      companyId,
      userId
    ).run();

    const company = await env.DB.prepare(
      'SELECT * FROM companies WHERE id = ?'
    ).bind(companyId).first();

    return new Response(JSON.stringify({ success: true, company }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Update company error:', error);
    return new Response(JSON.stringify({ error: 'Failed to update company' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Delete company
async function deleteCompany(env, userId, companyId) {
  try {
    if (!companyId) {
      return new Response(JSON.stringify({ error: 'Company ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify company belongs to user
    const existingCompany = await env.DB.prepare(
      'SELECT id FROM companies WHERE id = ? AND user_id = ?'
    ).bind(companyId, userId).first();

    if (!existingCompany) {
      return new Response(JSON.stringify({ error: 'Company not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Delete company (invoices will be handled by foreign key constraints if set up)
    await env.DB.prepare(
      'DELETE FROM companies WHERE id = ? AND user_id = ?'
    ).bind(companyId, userId).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Delete company error:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete company' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// User profile handlers
async function handleUser(request, env, action) {
  const method = request.method;
  const userId = request.headers.get('X-User-ID');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  switch (action) {
    case 'profile':
      if (method === 'GET') return await getUserProfile(env, userId);
      if (method === 'PUT') return await updateUserProfile(request, env, userId);
      break;
    case 'banking':
      if (method === 'GET') return await getBankingDetails(env, userId);
      if (method === 'PUT') return await updateBankingDetails(request, env, userId);
      break;
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Get user profile
async function getUserProfile(env, userId) {
  try {
    const profile = await env.DB.prepare(`
      SELECT * FROM user_profiles WHERE user_id = ?
    `).bind(userId).first();

    return new Response(JSON.stringify({ profile: profile || {} }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch profile' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Update user profile
async function updateUserProfile(request, env, userId) {
  try {
    const profileData = await request.json();

    // Check if profile exists
    const existingProfile = await env.DB.prepare(`
      SELECT id FROM user_profiles WHERE user_id = ?
    `).bind(userId).first();

    if (existingProfile) {
      // Update existing profile
      await env.DB.prepare(`
        UPDATE user_profiles
        SET business_name = ?, business_address = ?, contact_email = ?,
            contact_phone = ?, website = ?, footer_text = ?, updated_at = datetime('now')
        WHERE user_id = ?
      `).bind(
        profileData.business_name || null,
        profileData.business_address || null,
        profileData.contact_email || null,
        profileData.contact_phone || null,
        profileData.website || null,
        profileData.footer_text || 'Thank you for your business!',
        userId
      ).run();
    } else {
      // Create new profile
      const profileId = generateId();
      await env.DB.prepare(`
        INSERT INTO user_profiles (
          id, user_id, business_name, business_address, contact_email,
          contact_phone, website, footer_text, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(
        profileId, userId,
        profileData.business_name || null,
        profileData.business_address || null,
        profileData.contact_email || null,
        profileData.contact_phone || null,
        profileData.website || null,
        profileData.footer_text || 'Thank you for your business!'
      ).run();
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Profile updated successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    return new Response(JSON.stringify({ error: 'Failed to update profile' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Get banking details
async function getBankingDetails(env, userId) {
  try {
    const bankingDetails = await env.DB.prepare(`
      SELECT * FROM banking_details WHERE user_id = ?
    `).bind(userId).first();

    return new Response(JSON.stringify({ bankingDetails: bankingDetails || {} }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get banking details error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch banking details' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Update banking details
async function updateBankingDetails(request, env, userId) {
  try {
    const bankingData = await request.json();

    // Check if banking details exist
    const existingBanking = await env.DB.prepare(`
      SELECT id FROM banking_details WHERE user_id = ?
    `).bind(userId).first();

    if (existingBanking) {
      // Update existing banking details
      await env.DB.prepare(`
        UPDATE banking_details
        SET account_holder = ?, bank_name = ?, account_number = ?,
            account_type = ?, branch_code = ?, swift_code = ?, updated_at = datetime('now')
        WHERE user_id = ?
      `).bind(
        bankingData.account_holder || null,
        bankingData.bank_name || null,
        bankingData.account_number || null,
        bankingData.account_type || null,
        bankingData.branch_code || null,
        bankingData.swift_code || null,
        userId
      ).run();
    } else {
      // Create new banking details
      const bankingId = generateId();
      await env.DB.prepare(`
        INSERT INTO banking_details (
          id, user_id, account_holder, bank_name, account_number,
          account_type, branch_code, swift_code, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(
        bankingId, userId,
        bankingData.account_holder || null,
        bankingData.bank_name || null,
        bankingData.account_number || null,
        bankingData.account_type || null,
        bankingData.branch_code || null,
        bankingData.swift_code || null
      ).run();
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Banking details updated successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Update banking details error:', error);
    return new Response(JSON.stringify({ error: 'Failed to update banking details' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Invoice handlers
async function handleInvoices(request, env, id, action) {
  const method = request.method;
  const userId = request.headers.get('X-User-ID');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  switch (method) {
    case 'GET':
      if (id) {
        return await getInvoice(env, userId, id);
      }
      return await getInvoices(env, userId);
    case 'POST':
      if (id && action === 'pdf') {
        return await generateInvoicePDF(env, userId, id);
      }
      return await createInvoice(request, env, userId);
    case 'PUT':
      if (id && action === 'status') {
        return await updateInvoiceStatus(request, env, userId, id);
      }
      return await updateInvoice(request, env, userId, id);
    case 'DELETE':
      return await deleteInvoice(env, userId, id);
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Get all invoices for user
async function getInvoices(env, userId) {
  try {
    const invoices = await env.DB.prepare(`
      SELECT
        i.*,
        c.name as company_name,
        c.email as company_email,
        c.address as company_address,
        c.contact_person as company_contact_person,
        c.phone as company_phone
      FROM invoices i
      JOIN companies c ON i.company_id = c.id
      WHERE i.user_id = ?
      ORDER BY i.created_at DESC
    `).bind(userId).all();

    // Get line items for each invoice
    const invoicesWithItems = await Promise.all(
      (invoices.results || []).map(async (invoice) => {
        const lineItems = await env.DB.prepare(`
          SELECT * FROM invoice_line_items WHERE invoice_id = ?
        `).bind(invoice.id).all();

        return {
          ...invoice,
          lineItems: lineItems.results || []
        };
      })
    );

    return new Response(JSON.stringify({ invoices: invoicesWithItems }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch invoices' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Get single invoice
async function getInvoice(env, userId, invoiceId) {
  try {
    const invoice = await env.DB.prepare(`
      SELECT
        i.*,
        c.name as company_name,
        c.email as company_email,
        c.address as company_address,
        c.contact_person as company_contact_person,
        c.phone as company_phone
      FROM invoices i
      JOIN companies c ON i.company_id = c.id
      WHERE i.id = ? AND i.user_id = ?
    `).bind(invoiceId, userId).first();

    if (!invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const lineItems = await env.DB.prepare(`
      SELECT * FROM invoice_line_items WHERE invoice_id = ?
    `).bind(invoiceId).all();

    const invoiceWithItems = {
      ...invoice,
      lineItems: lineItems.results || []
    };

    return new Response(JSON.stringify({ invoice: invoiceWithItems }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch invoice' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Create invoice
async function createInvoice(request, env, userId) {
  try {
    const invoiceData = await request.json();
    const invoiceId = generateId();

    // Validate required fields
    if (!invoiceData.companyId || !invoiceData.invoiceNumber || !invoiceData.lineItems?.length) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calculate total
    const totalAmount = invoiceData.lineItems.reduce((sum, item) => {
      return sum + (item.quantity * item.rate);
    }, 0);

    // Create invoice
    await env.DB.prepare(`
      INSERT INTO invoices (
        id, user_id, company_id, invoice_number, invoice_date, due_date,
        status, notes, total_amount, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
      invoiceId, userId, invoiceData.companyId, invoiceData.invoiceNumber,
      invoiceData.invoiceDate, invoiceData.dueDate, invoiceData.status || 'pending',
      invoiceData.notes || null, totalAmount
    ).run();

    // Create line items
    for (const item of invoiceData.lineItems) {
      const lineItemId = generateId();
      const amount = item.quantity * item.rate;

      await env.DB.prepare(`
        INSERT INTO invoice_line_items (
          id, invoice_id, description, quantity, rate, amount, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        lineItemId, invoiceId, item.description, item.quantity, item.rate, amount
      ).run();
    }

    // Update company stats
    await env.DB.prepare(`
      UPDATE companies
      SET invoice_count = invoice_count + 1,
          total_revenue = total_revenue + ?,
          updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).bind(totalAmount, invoiceData.companyId, userId).run();

    // Get the created invoice with line items
    const createdInvoice = await getInvoice(env, userId, invoiceId);

    return new Response(createdInvoice.body, {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Create invoice error:', error);
    return new Response(JSON.stringify({ error: 'Failed to create invoice' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Update invoice
async function updateInvoice(request, env, userId, invoiceId) {
  try {
    const invoiceData = await request.json();

    // Get existing invoice
    const existingInvoice = await env.DB.prepare(`
      SELECT * FROM invoices WHERE id = ? AND user_id = ?
    `).bind(invoiceId, userId).first();

    if (!existingInvoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calculate new total
    const totalAmount = invoiceData.lineItems?.reduce((sum, item) => {
      return sum + (item.quantity * item.rate);
    }, 0) || existingInvoice.total_amount;

    // Update invoice
    await env.DB.prepare(`
      UPDATE invoices
      SET invoice_date = ?, due_date = ?, status = ?, notes = ?,
          total_amount = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).bind(
      invoiceData.invoiceDate || existingInvoice.invoice_date,
      invoiceData.dueDate || existingInvoice.due_date,
      invoiceData.status || existingInvoice.status,
      invoiceData.notes !== undefined ? invoiceData.notes : existingInvoice.notes,
      totalAmount,
      invoiceId, userId
    ).run();

    // Update line items if provided
    if (invoiceData.lineItems) {
      // Delete existing line items
      await env.DB.prepare(`
        DELETE FROM invoice_line_items WHERE invoice_id = ?
      `).bind(invoiceId).run();

      // Create new line items
      for (const item of invoiceData.lineItems) {
        const lineItemId = generateId();
        const amount = item.quantity * item.rate;

        await env.DB.prepare(`
          INSERT INTO invoice_line_items (
            id, invoice_id, description, quantity, rate, amount, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `).bind(
          lineItemId, invoiceId, item.description, item.quantity, item.rate, amount
        ).run();
      }

      // Update company total revenue
      const companyRevenue = await env.DB.prepare(`
        SELECT SUM(total_amount) as total FROM invoices
        WHERE company_id = ? AND user_id = ? AND status = 'paid'
      `).bind(existingInvoice.company_id, userId).first();

      await env.DB.prepare(`
        UPDATE companies
        SET total_revenue = ?, updated_at = datetime('now')
        WHERE id = ? AND user_id = ?
      `).bind(companyRevenue.total || 0, existingInvoice.company_id, userId).run();
    }

    // Get updated invoice
    const updatedInvoice = await getInvoice(env, userId, invoiceId);

    return new Response(updatedInvoice.body, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Update invoice error:', error);
    return new Response(JSON.stringify({ error: 'Failed to update invoice' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Update invoice status
async function updateInvoiceStatus(request, env, userId, invoiceId) {
  try {
    const { status } = await request.json();

    if (!['pending', 'paid', 'overdue'].includes(status)) {
      return new Response(JSON.stringify({ error: 'Invalid status' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get existing invoice
    const existingInvoice = await env.DB.prepare(`
      SELECT * FROM invoices WHERE id = ? AND user_id = ?
    `).bind(invoiceId, userId).first();

    if (!existingInvoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update invoice status
    await env.DB.prepare(`
      UPDATE invoices
      SET status = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).bind(status, invoiceId, userId).run();

    // Update company revenue if status changed to/from paid
    if (status === 'paid' && existingInvoice.status !== 'paid') {
      // Add to revenue
      await env.DB.prepare(`
        UPDATE companies
        SET total_revenue = total_revenue + ?, updated_at = datetime('now')
        WHERE id = ? AND user_id = ?
      `).bind(existingInvoice.total_amount, existingInvoice.company_id, userId).run();
    } else if (status !== 'paid' && existingInvoice.status === 'paid') {
      // Remove from revenue
      await env.DB.prepare(`
        UPDATE companies
        SET total_revenue = total_revenue - ?, updated_at = datetime('now')
        WHERE id = ? AND user_id = ?
      `).bind(existingInvoice.total_amount, existingInvoice.company_id, userId).run();
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Invoice status updated to ${status}`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Update invoice status error:', error);
    return new Response(JSON.stringify({ error: 'Failed to update invoice status' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Delete invoice
async function deleteInvoice(env, userId, invoiceId) {
  try {
    // Get existing invoice
    const existingInvoice = await env.DB.prepare(`
      SELECT * FROM invoices WHERE id = ? AND user_id = ?
    `).bind(invoiceId, userId).first();

    if (!existingInvoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Delete line items first (due to foreign key constraint)
    await env.DB.prepare(`
      DELETE FROM invoice_line_items WHERE invoice_id = ?
    `).bind(invoiceId).run();

    // Delete invoice
    await env.DB.prepare(`
      DELETE FROM invoices WHERE id = ? AND user_id = ?
    `).bind(invoiceId, userId).run();

    // Update company stats
    const decrementAmount = existingInvoice.status === 'paid' ? existingInvoice.total_amount : 0;

    await env.DB.prepare(`
      UPDATE companies
      SET invoice_count = invoice_count - 1,
          total_revenue = total_revenue - ?,
          updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).bind(decrementAmount, existingInvoice.company_id, userId).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Invoice deleted successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete invoice error:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete invoice' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Generate PDF for invoice
async function generateInvoicePDF(env, userId, invoiceId) {
  try {
    // Get invoice with all details
    const invoice = await env.DB.prepare(`
      SELECT
        i.*,
        c.name as company_name,
        c.email as company_email,
        c.address as company_address,
        c.contact_person as company_contact_person,
        c.phone as company_phone
      FROM invoices i
      JOIN companies c ON i.company_id = c.id
      WHERE i.id = ? AND i.user_id = ?
    `).bind(invoiceId, userId).first();

    if (!invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get line items
    const lineItems = await env.DB.prepare(`
      SELECT * FROM invoice_line_items WHERE invoice_id = ?
    `).bind(invoiceId).all();

    // Get user profile and banking details
    const userProfile = await env.DB.prepare(`
      SELECT * FROM user_profiles WHERE user_id = ?
    `).bind(userId).first();

    const bankingDetails = await env.DB.prepare(`
      SELECT * FROM banking_details WHERE user_id = ?
    `).bind(userId).first();

    // Create PDF data object
    const pdfData = {
      invoice: {
        ...invoice,
        lineItems: lineItems.results || []
      },
      userProfile: userProfile || {},
      bankingDetails: bankingDetails || {}
    };

    // For now, return the data as JSON - in production, generate actual PDF
    // You would use a PDF library like jsPDF here
    return new Response(JSON.stringify({
      success: true,
      pdfData,
      message: 'PDF data generated - implement PDF library for actual PDF generation'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Generate PDF error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate PDF' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}