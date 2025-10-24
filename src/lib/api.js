// API client for PayMyHustle backend
const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE;
    this.userId = null;
  }

  setUserId(userId) {
    this.userId = userId;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add user authentication header if available
    if (this.userId) {
      config.headers['X-User-ID'] = this.userId;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // OAuth Authentication methods
  async createUserFromOAuth(oauthUser) {
    return this.request('/auth/oauth/register', {
      method: 'POST',
      body: JSON.stringify({
        id: oauthUser.id,
        email: oauthUser.email,
        name: oauthUser.name,
        firstName: oauthUser.firstName,
        lastName: oauthUser.lastName,
        imageUrl: oauthUser.imageUrl
      }),
    });
  }

  // Legacy authentication methods (keep for backward compatibility)
  async register(email, password) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async login(email, password) {
    const result = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (result.success && result.user) {
      this.setUserId(result.user.id);
      // Store in localStorage for session persistence
      localStorage.setItem('paymyhustle_user', JSON.stringify(result.user));
    }

    return result;
  }

  logout() {
    this.userId = null;
    localStorage.removeItem('paymyhustle_user');
  }

  // Initialize from stored session
  initializeFromStorage() {
    try {
      const storedUser = localStorage.getItem('paymyhustle_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        this.setUserId(user.id);
        return user;
      }
    } catch (error) {
      console.error('Failed to restore user session:', error);
    }
    return null;
  }

  // User profile methods
  async getUserProfile() {
    return this.request('/user/profile');
  }

  async updateUserProfile(profileData) {
    return this.request('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async getBankingDetails() {
    return this.request('/user/banking');
  }

  async updateBankingDetails(bankingData) {
    return this.request('/user/banking', {
      method: 'PUT',
      body: JSON.stringify(bankingData),
    });
  }

  // Company methods
  async getCompanies() {
    return this.request('/companies');
  }

  async createCompany(companyData) {
    return this.request('/companies', {
      method: 'POST',
      body: JSON.stringify(companyData),
    });
  }

  async updateCompany(companyId, companyData) {
    return this.request(`/companies/${companyId}`, {
      method: 'PUT',
      body: JSON.stringify(companyData),
    });
  }

  async deleteCompany(companyId) {
    return this.request(`/companies/${companyId}`, {
      method: 'DELETE',
    });
  }

  // Invoice methods
  async getInvoices() {
    return this.request('/invoices');
  }

  async getInvoice(invoiceId) {
    return this.request(`/invoices/${invoiceId}`);
  }

  async createInvoice(invoiceData) {
    return this.request('/invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
  }

  async updateInvoice(invoiceId, invoiceData) {
    return this.request(`/invoices/${invoiceId}`, {
      method: 'PUT',
      body: JSON.stringify(invoiceData),
    });
  }

  async updateInvoiceStatus(invoiceId, status) {
    return this.request(`/invoices/${invoiceId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async deleteInvoice(invoiceId) {
    return this.request(`/invoices/${invoiceId}`, {
      method: 'DELETE',
    });
  }

  async generateInvoicePDF(invoiceId) {
    return this.request(`/invoices/${invoiceId}/pdf`, {
      method: 'POST',
    });
  }

  // Utility methods for data transformation
  transformCompanyFromAPI(apiCompany) {
    return {
      ...apiCompany,
      invoicePrefix: apiCompany.invoice_prefix,
      invoiceCount: apiCompany.invoice_count,
      totalRevenue: apiCompany.total_revenue,
      contactPerson: apiCompany.contact_person,
    };
  }

  transformCompanyToAPI(company) {
    return {
      name: company.name,
      email: company.email || '',
      address: company.address || '',
      contactPerson: company.contactPerson || '',
      phone: company.phone || '',
      invoicePrefix: company.invoicePrefix || '',
    };
  }

  transformInvoiceFromAPI(apiInvoice) {
    return {
      ...apiInvoice,
      id: apiInvoice.id,
      companyId: apiInvoice.company_id,
      invoiceNumber: apiInvoice.invoice_number,
      companyName: apiInvoice.company_name,
      companyEmail: apiInvoice.company_email,
      companyAddress: apiInvoice.company_address,
      invoiceDate: apiInvoice.invoice_date,
      dueDate: apiInvoice.due_date,
      totalAmount: apiInvoice.total_amount,
      lineItems: apiInvoice.lineItems || [],
      status: apiInvoice.status,
      notes: apiInvoice.notes,
    };
  }

  transformInvoiceToAPI(invoice, companyId) {
    return {
      companyId,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      status: invoice.status || 'pending',
      notes: invoice.notes || '',
      lineItems: invoice.lineItems.map(item => ({
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
      })),
    };
  }

  transformProfileFromAPI(apiProfile) {
    return {
      businessName: apiProfile.business_name || '',
      businessAddress: apiProfile.business_address || '',
      contactEmail: apiProfile.contact_email || '',
      contactPhone: apiProfile.contact_phone || '',
      website: apiProfile.website || '',
      footerText: apiProfile.footer_text || 'Thank you for your business!',
    };
  }

  transformProfileToAPI(profile) {
    return {
      business_name: profile.businessName,
      business_address: profile.businessAddress,
      contact_email: profile.contactEmail,
      contact_phone: profile.contactPhone,
      website: profile.website,
      footer_text: profile.footerText,
    };
  }

  transformBankingFromAPI(apiBanking) {
    return {
      accountHolder: apiBanking.account_holder || '',
      bankName: apiBanking.bank_name || '',
      accountNumber: apiBanking.account_number || '',
      accountType: apiBanking.account_type || '',
      branchCode: apiBanking.branch_code || '',
      swiftCode: apiBanking.swift_code || '',
    };
  }

  transformBankingToAPI(banking) {
    return {
      account_holder: banking.accountHolder,
      bank_name: banking.bankName,
      account_number: banking.accountNumber,
      account_type: banking.accountType,
      branch_code: banking.branchCode,
      swift_code: banking.swiftCode,
    };
  }
}

// Create and export a singleton instance
const apiClient = new ApiClient();
export default apiClient;