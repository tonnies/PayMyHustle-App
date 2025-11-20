import React, { useState, useEffect } from 'react';
import apiClient from '../lib/api';
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "./ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Alert, AlertDescription } from "./ui/alert"
import { Separator } from "./ui/separator"
import { Plus, Trash2, Building, FileText, Settings, Download, X, Edit, Search, Home, User, CreditCard, Eye, Pencil, Check, ArrowLeft, TrendingUp } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import RevenueDashboard from './RevenueDashboard';

const InvoiceGeneratorAPI = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [companies, setCompanies] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [recurringInvoices, setRecurringInvoices] = useState([]);
  const [personalDetails, setPersonalDetails] = useState({
    businessName: '',
    businessAddress: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
    footerText: 'Thank you for your business!'
  });
  const [bankingDetailsList, setBankingDetailsList] = useState([]);
  const [editingBankingDetails, setEditingBankingDetails] = useState(null);
  const [showAddBankingForm, setShowAddBankingForm] = useState(false);
  const [newBankingData, setNewBankingData] = useState({
    name: '',
    accountHolder: '',
    bankName: '',
    accountNumber: '',
    accountType: '',
    branchCode: '',
    swiftCode: ''
  });
  const [currentInvoice, setCurrentInvoice] = useState({
    id: null,
    invoiceNumber: '',
    companyId: '',
    companyName: '',
    companyAddress: '',
    companyEmail: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lineItems: [{ description: '', quantity: 1, rate: 0 }],
    notes: '',
    status: 'pending',
    bankingDetailsId: ''
  });

  const [loading, setLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [showAlert, setShowAlert] = useState({ show: false, message: '', type: 'success' });
  const [searchQuery, setSearchQuery] = useState('');
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [showAddCompanyForm, setShowAddCompanyForm] = useState(false);
  const [newCompanyData, setNewCompanyData] = useState({
    name: '',
    invoicePrefix: '',
    startingInvoiceNumber: '1',
    contactPerson: ''
  });

  const [editingCompanyData, setEditingCompanyData] = useState(null);

  const [currentRecurringInvoice, setCurrentRecurringInvoice] = useState({
    companyId: '',
    frequency: 'monthly',
    numberOfRecurrences: 6,
    startDate: new Date().toISOString().split('T')[0],
    lineItems: [{ description: '', quantity: 1, rate: 0 }],
    notes: ''
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  // Load initial data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCompanies(),
        loadInvoices(),
        loadRecurringInvoices(),
        loadPersonalDetails(),
        loadBankingDetails()
      ]);
    } catch (error) {
      showNotification('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const result = await apiClient.getCompanies();
      const transformedCompanies = (result.companies || []).map(company =>
        apiClient.transformCompanyFromAPI(company)
      );
      setCompanies(transformedCompanies);
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  };

  const loadInvoices = async () => {
    try {
      const result = await apiClient.getInvoices();
      const transformedInvoices = (result.invoices || []).map(invoice =>
        apiClient.transformInvoiceFromAPI(invoice)
      );
      setInvoices(transformedInvoices);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    }
  };

  const loadRecurringInvoices = async () => {
    try {
      const result = await apiClient.getRecurringInvoices();
      setRecurringInvoices(result.recurringInvoices || []);
    } catch (error) {
      console.error('Failed to load recurring invoices:', error);
    }
  };

  const loadPersonalDetails = async () => {
    try {
      const result = await apiClient.getUserProfile();
      if (result.profile) {
        setPersonalDetails(apiClient.transformProfileFromAPI(result.profile));
      }
    } catch (error) {
      console.error('Failed to load personal details:', error);
    }
  };

  const loadBankingDetails = async () => {
    try {
      const result = await apiClient.getAllBankingDetails();
      const transformedBanking = (result.bankingDetails || []).map(banking =>
        apiClient.transformBankingFromAPI(banking)
      );
      setBankingDetailsList(transformedBanking);
    } catch (error) {
      console.error('Failed to load banking details:', error);
    }
  };

  const showNotification = (message, type = 'success') => {
    setShowAlert({ show: true, message, type });
    setTimeout(() => setShowAlert({ show: false, message: '', type: 'success' }), 3000);
  };

  const generateDefaultPrefix = (companyName) => {
    return companyName.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase() || 'INV';
  };

  const generateInvoiceNumber = (company) => {
    if (!company) return 'INV001';
    const nextNumber = company.invoiceCount + 1;
    const prefix = company.invoicePrefix || generateDefaultPrefix(company.name);
    return `${prefix}${String(nextNumber).padStart(3, '0')}`;
  };

  const addNewCompany = async () => {
    const companyName = newCompanyData.name.trim();
    const customPrefix = newCompanyData.invoicePrefix.trim();
    const startingNumber = parseInt(newCompanyData.startingInvoiceNumber) || 1;
    const contactPerson = newCompanyData.contactPerson.trim();

    if (!companyName) {
      showNotification('Please enter a company name', 'error');
      return;
    }

    if (startingNumber < 1) {
      showNotification('Starting invoice number must be at least 1', 'error');
      return;
    }

    // Check if company already exists
    if (companies.find(c => c.name.toLowerCase() === companyName.toLowerCase())) {
      showNotification('Company already exists', 'error');
      return;
    }

    const finalPrefix = customPrefix
      ? customPrefix.replace(/[^A-Za-z0-9]/g, '').substring(0, 6).toUpperCase()
      : generateDefaultPrefix(companyName);

    try {
      setLoading(true);
      const companyData = {
        name: companyName,
        email: '',
        address: '',
        contactPerson: contactPerson,
        phone: '',
        invoicePrefix: finalPrefix,
        invoiceCount: startingNumber - 1 // Start count at one less than desired first invoice number
      };

      await apiClient.createCompany(companyData);
      await loadCompanies();

      setNewCompanyData({ name: '', invoicePrefix: '', startingInvoiceNumber: '1', contactPerson: '' });
      setShowAddCompanyForm(false);
      showNotification(`Company "${companyName}" added with prefix "${finalPrefix}"`);
    } catch (error) {
      showNotification('Failed to create company', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (lineItems) => {
    return lineItems.reduce((total, item) => total + (item.quantity * item.rate), 0);
  };

  const getInvoiceStatus = (invoice) => {
    if (invoice.status === 'paid') return 'paid';
    if (new Date() > new Date(invoice.dueDate) && invoice.status === 'pending') return 'overdue';
    return 'pending';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const addLineItem = () => {
    setCurrentInvoice(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { description: '', quantity: 1, rate: 0 }]
    }));
  };

  const removeLineItem = (index) => {
    setCurrentInvoice(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index)
    }));
  };

  const updateLineItem = (index, field, value) => {
    setCurrentInvoice(prev => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const saveInvoice = async () => {
    if (!currentInvoice.companyId || !currentInvoice.lineItems.some(item => item.description)) {
      showNotification('Please select a company and add at least one line item', 'error');
      return;
    }

    try {
      setLoading(true);

      if (editingInvoice) {
        await apiClient.updateInvoice(editingInvoice.id, {
          invoiceDate: currentInvoice.invoiceDate,
          dueDate: currentInvoice.dueDate,
          status: currentInvoice.status,
          notes: currentInvoice.notes,
          lineItems: currentInvoice.lineItems
        });
        showNotification('Invoice updated successfully');
      } else {
        const company = companies.find(c => c.id === currentInvoice.companyId);
        const invoiceNumber = generateInvoiceNumber(company);

        const invoiceData = {
          companyId: currentInvoice.companyId,
          invoiceNumber,
          invoiceDate: currentInvoice.invoiceDate,
          dueDate: currentInvoice.dueDate,
          status: currentInvoice.status,
          notes: currentInvoice.notes,
          lineItems: currentInvoice.lineItems,
          bankingDetailsId: currentInvoice.bankingDetailsId || null
        };

        await apiClient.createInvoice(invoiceData);
        showNotification('Invoice created successfully');
      }

      await loadInvoices();
      await loadCompanies();

      setCurrentInvoice({
        id: null,
        invoiceNumber: '',
        companyId: '',
        companyName: '',
        companyAddress: '',
        companyEmail: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        lineItems: [{ description: '', quantity: 1, rate: 0 }],
        notes: '',
        status: 'pending',
        bankingDetailsId: ''
      });
      setEditingInvoice(null);
      setCurrentView('dashboard');

    } catch (error) {
      showNotification('Failed to save invoice', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleInvoiceStatus = async (invoice) => {
    const newStatus = invoice.status === 'paid' ? 'pending' : 'paid';

    try {
      setLoading(true);
      await apiClient.updateInvoiceStatus(invoice.id, newStatus);
      await loadInvoices();
      await loadCompanies();
      showNotification(`Invoice marked as ${newStatus}`);
    } catch (error) {
      showNotification('Failed to update invoice status', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Recurring invoice functions
  const addRecurringLineItem = () => {
    setCurrentRecurringInvoice(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { description: '', quantity: 1, rate: 0 }]
    }));
  };

  const removeRecurringLineItem = (index) => {
    setCurrentRecurringInvoice(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index)
    }));
  };

  const updateRecurringLineItem = (index, field, value) => {
    setCurrentRecurringInvoice(prev => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const calculateRecurringDates = () => {
    const dates = [];
    const start = new Date(currentRecurringInvoice.startDate);
    const frequency = currentRecurringInvoice.frequency;
    const count = currentRecurringInvoice.numberOfRecurrences;

    for (let i = 0; i < count; i++) {
      const date = new Date(start);

      switch (frequency) {
        case 'weekly':
          date.setDate(start.getDate() + (i * 7));
          break;
        case 'monthly':
          date.setMonth(start.getMonth() + i);
          break;
        case 'quarterly':
          date.setMonth(start.getMonth() + (i * 3));
          break;
        case 'yearly':
          date.setFullYear(start.getFullYear() + i);
          break;
      }

      dates.push(date.toISOString().split('T')[0]);
    }

    return dates;
  };

  const saveRecurringInvoice = async () => {
    if (!currentRecurringInvoice.companyId || !currentRecurringInvoice.lineItems.some(item => item.description)) {
      showNotification('Please select a company and add at least one line item', 'error');
      return;
    }

    try {
      setLoading(true);

      const recurringData = {
        companyId: currentRecurringInvoice.companyId,
        frequency: currentRecurringInvoice.frequency,
        numberOfRecurrences: parseInt(currentRecurringInvoice.numberOfRecurrences),
        startDate: currentRecurringInvoice.startDate,
        lineItems: currentRecurringInvoice.lineItems,
        notes: currentRecurringInvoice.notes
      };

      const result = await apiClient.createRecurringInvoice(recurringData);
      showNotification(`Recurring invoice created! Generated ${result.generatedInvoices.length} invoices`);

      await loadInvoices();
      await loadRecurringInvoices();
      await loadCompanies();

      setCurrentRecurringInvoice({
        companyId: '',
        frequency: 'monthly',
        numberOfRecurrences: 6,
        startDate: new Date().toISOString().split('T')[0],
        lineItems: [{ description: '', quantity: 1, rate: 0 }],
        notes: ''
      });

      setCurrentView('dashboard');

    } catch (error) {
      showNotification('Failed to create recurring invoice', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = async (invoice) => {
    if (!window.confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}?`)) {
      return;
    }

    try {
      setLoading(true);
      await apiClient.deleteInvoice(invoice.id);
      await loadInvoices();
      await loadCompanies();
      showNotification('Invoice deleted successfully');
    } catch (error) {
      showNotification('Failed to delete invoice', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCompany = async () => {
    if (!editingCompanyData || !editingCompanyData.name.trim()) {
      showNotification('Please enter a company name', 'error');
      return;
    }

    try {
      setLoading(true);
      await apiClient.updateCompany(selectedCompany.id, {
        name: editingCompanyData.name,
        email: editingCompanyData.email || '',
        address: editingCompanyData.address || '',
        contactPerson: editingCompanyData.contactPerson || '',
        phone: editingCompanyData.phone || '',
        invoicePrefix: editingCompanyData.invoicePrefix || '',
      });
      await loadCompanies();
      setEditingCompanyData(null);

      // Update selectedCompany with new data
      const updatedCompany = companies.find(c => c.id === selectedCompany.id);
      if (updatedCompany) {
        setSelectedCompany(updatedCompany);
      }

      showNotification('Company updated successfully');
    } catch (error) {
      showNotification('Failed to update company', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompany = async (company) => {
    const companyInvoices = invoices.filter(inv => inv.companyId === company.id);

    const confirmMessage = companyInvoices.length > 0
      ? `Are you sure you want to delete "${company.name}"? This will also delete ${companyInvoices.length} associated invoice(s). This action cannot be undone.`
      : `Are you sure you want to delete "${company.name}"? This action cannot be undone.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      await apiClient.deleteCompany(company.id);
      await loadCompanies();
      await loadInvoices(); // Reload invoices as they may have been deleted too

      // Navigate back to dashboard
      setSelectedCompany(null);
      setEditingCompanyData(null);
      setCurrentView('dashboard');

      showNotification('Company deleted successfully');
    } catch (error) {
      showNotification('Failed to delete company', 'error');
    } finally {
      setLoading(false);
    }
  };

  const savePersonalDetails = async () => {
    try {
      setLoading(true);
      await apiClient.updateUserProfile(apiClient.transformProfileToAPI(personalDetails));
      showNotification('Personal details saved successfully');
    } catch (error) {
      showNotification('Failed to save personal details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveBankingDetails = async () => {
    try {
      setLoading(true);
      await apiClient.updateBankingDetails(apiClient.transformBankingToAPI(bankingDetails));
      showNotification('Banking details saved successfully');
    } catch (error) {
      showNotification('Failed to save banking details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async (invoice) => {
    try {
      setLoading(true);

      // Create new PDF document
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 25;
      let yPos = 25;

      // Black text color (matching reference PDF)
      const black = [0, 0, 0];

      // Helper function to add text
      const addText = (text, x, y, fontSize = 10, isBold = false) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setTextColor(...black);
        doc.text(text, x, y);
      };

      // LEFT SIDE - Your Business Name (bold, large)
      addText(personalDetails.businessName || 'Your Business', margin, yPos, 18, true);
      yPos += 8;

      // Your business address
      if (personalDetails.businessAddress) {
        const addressLines = personalDetails.businessAddress.split('\n');
        addressLines.forEach(line => {
          addText(line, margin, yPos, 10, false);
          yPos += 5;
        });
      }
      yPos += 2;

      // Your contact details
      if (personalDetails.contactEmail) {
        addText(personalDetails.contactEmail, margin, yPos, 10, false);
        yPos += 5;
      }
      if (personalDetails.contactPhone) {
        addText(personalDetails.contactPhone, margin, yPos, 10, false);
      }

      // RIGHT SIDE - INVOICE header
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE', pageWidth - margin, 25, { align: 'right' });

      // Invoice details on right
      let rightYPos = 40;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      doc.text('Invoice No:', pageWidth - margin - 60, rightYPos);
      doc.text(invoice.invoiceNumber, pageWidth - margin, rightYPos, { align: 'right' });
      rightYPos += 7;

      doc.text('Issue Date:', pageWidth - margin - 60, rightYPos);
      doc.text(new Date(invoice.invoiceDate).toLocaleDateString('en-ZA'), pageWidth - margin, rightYPos, { align: 'right' });
      rightYPos += 7;

      doc.text('Due Date:', pageWidth - margin - 60, rightYPos);
      doc.text(new Date(invoice.dueDate).toLocaleDateString('en-ZA'), pageWidth - margin, rightYPos, { align: 'right' });

      // BILL TO section
      yPos = 75;
      addText('BILL TO', margin, yPos, 12, true);
      yPos += 8;

      // Company name (bold)
      addText(invoice.companyName || '', margin, yPos, 11, true);
      yPos += 6;

      // Get company details from companies array
      const companyDetails = companies.find(c => c.id === invoice.companyId);

      // Contact person name if available
      if (companyDetails?.contactPerson) {
        addText(companyDetails.contactPerson, margin, yPos, 10, false);
        yPos += 5;
      }

      // Company address
      if (invoice.companyAddress) {
        const clientAddressLines = invoice.companyAddress.split('\n');
        clientAddressLines.forEach(line => {
          addText(line, margin, yPos, 10, false);
          yPos += 5;
        });
      }

      // Company email
      if (invoice.companyEmail) {
        yPos += 1;
        addText(invoice.companyEmail, margin, yPos, 10, false);
      }

      // Line items table
      yPos += 15;
      const tableStartY = yPos;

      const tableData = invoice.lineItems.map(item => [
        item.description,
        item.quantity.toString(),
        formatCurrency(item.rate),
        formatCurrency(item.quantity * item.rate)
      ]);

      // Calculate available width for table
      const tableWidth = pageWidth - (2 * margin);

      autoTable(doc, {
        startY: tableStartY,
        head: [['Description', 'Quantity', 'Unit Price', 'Amount']],
        body: tableData,
        theme: 'plain',
        tableWidth: tableWidth,
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: black,
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'left',
          lineWidth: 0
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
          textColor: black,
          fontSize: 10,
          lineWidth: 0
        },
        columnStyles: {
          0: { cellWidth: 'auto', halign: 'left' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 32, halign: 'right' },
          3: { cellWidth: 32, halign: 'right' }
        },
        styles: {
          cellPadding: 3,
          lineWidth: 0,
          overflow: 'linebreak'
        },
        margin: { left: margin, right: margin },
        didDrawCell: (data) => {
          // Only draw horizontal lines for header row
          if (data.row.section === 'head') {
            doc.setDrawColor(...black);
            doc.setLineWidth(0.5);
            // Top line of header
            doc.line(
              data.cell.x,
              data.cell.y,
              data.cell.x + data.cell.width,
              data.cell.y
            );
            // Bottom line of header
            doc.line(
              data.cell.x,
              data.cell.y + data.cell.height,
              data.cell.x + data.cell.width,
              data.cell.y + data.cell.height
            );
          }
        }
      });

      yPos = doc.lastAutoTable.finalY + 8;

      // Total (right-aligned)
      const total = calculateTotal(invoice.lineItems);
      const totalLabelX = pageWidth - margin - 50;
      const totalValueX = pageWidth - margin;

      // Draw line above total
      doc.setDrawColor(...black);
      doc.setLineWidth(0.5);
      doc.line(totalLabelX - 5, yPos - 5, pageWidth - margin, yPos - 5);

      addText('Total', totalLabelX, yPos, 11, true);

      // Use doc.text with right alignment for the total amount
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...black);
      doc.text(formatCurrency(total), totalValueX, yPos, { align: 'right' });

      // PAY BY BANK TRANSFER section - use invoice's selected banking details
      const bankingDetails = invoice.bankingDetailsId
        ? bankingDetailsList.find(b => b.id === invoice.bankingDetailsId)
        : bankingDetailsList.find(b => b.isDefault);

      if (bankingDetails) {
        yPos += 25;
        addText('PAY BY BANK TRANSFER', margin, yPos, 12, true);
        yPos += 8;

        if (bankingDetails.bankName) {
          addText(`Bank Name: ${bankingDetails.bankName}`, margin, yPos, 10, false);
          yPos += 6;
        }
        if (bankingDetails.accountHolder) {
          addText(`Account Holder Name: ${bankingDetails.accountHolder}`, margin, yPos, 10, false);
          yPos += 6;
        }
        if (bankingDetails.accountNumber) {
          addText(`Account Number: ${bankingDetails.accountNumber}`, margin, yPos, 10, false);
          yPos += 6;
        }
        if (bankingDetails.accountType) {
          addText(`Account Type: ${bankingDetails.accountType}`, margin, yPos, 10, false);
          yPos += 6;
        }
        if (bankingDetails.branchCode) {
          addText(`Branch Code: ${bankingDetails.branchCode}`, margin, yPos, 10, false);
          yPos += 6;
        }
        // Add payment reference (invoice number)
        addText(`Payment Reference: ${invoice.invoiceNumber}`, margin, yPos, 10, false);
      }

      // Footer at bottom center
      const footerY = pageHeight - 20;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text(personalDetails.footerText || 'Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });

      // Save PDF
      doc.save(`Invoice_${invoice.invoiceNumber}_${invoice.companyName.replace(/\s+/g, '_')}.pdf`);
      showNotification('PDF generated successfully');

    } catch (error) {
      console.error('PDF generation error:', error);
      showNotification('Failed to generate PDF', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter functions
  const filterInvoices = (invoices) => {
    if (!searchQuery.trim()) return invoices;

    return invoices.filter(invoice =>
      invoice.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.lineItems?.some(item =>
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  };

  const filterCompanies = (companies) => {
    if (!searchQuery.trim()) return companies;

    return companies.filter(company =>
      company.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Navigation component
  const renderNavigation = () => (
    <div className="w-64 bg-card border-r border-border h-screen fixed left-0 top-0 z-30 animate-slide-in-right">
      <div className="p-6">
        <h1 className="text-xl font-bold mb-6 animate-fade-in-down">Invoice Generator</h1>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Search invoices, companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-2">
          <Button
            variant={currentView === 'dashboard' ? 'default' : 'ghost'}
            className="w-full justify-start btn-press transition-smooth hover:translate-x-1"
            onClick={() => setCurrentView('dashboard')}
          >
            <Home className="w-4 h-4 mr-2" />
            Dashboard
          </Button>

          <Button
            variant={currentView === 'revenue' ? 'default' : 'ghost'}
            className="w-full justify-start btn-press transition-smooth hover:translate-x-1"
            onClick={() => setCurrentView('revenue')}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Revenue
          </Button>

          <Button
            variant={currentView === 'createInvoice' ? 'default' : 'ghost'}
            className="w-full justify-start btn-press transition-smooth hover:translate-x-1"
            onClick={() => setCurrentView('createInvoice')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Invoice
          </Button>

          <Button
            variant={currentView === 'createRecurringInvoice' ? 'default' : 'ghost'}
            className="w-full justify-start btn-press transition-smooth hover:translate-x-1"
            onClick={() => setCurrentView('createRecurringInvoice')}
          >
            <FileText className="w-4 h-4 mr-2" />
            Create Recurring Invoice
          </Button>

          <Separator className="my-4" />

          <Button
            variant={currentView === 'personalSettings' ? 'default' : 'ghost'}
            className="w-full justify-start btn-press transition-smooth hover:translate-x-1"
            onClick={() => setCurrentView('personalSettings')}
          >
            <User className="w-4 h-4 mr-2" />
            Personal Details
          </Button>

          <Button
            variant={currentView === 'bankingSettings' ? 'default' : 'ghost'}
            className="w-full justify-start btn-press transition-smooth hover:translate-x-1"
            onClick={() => setCurrentView('bankingSettings')}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Banking Details
          </Button>

          <Button
            variant={currentView === 'companySettings' ? 'default' : 'ghost'}
            className="w-full justify-start btn-press transition-smooth hover:translate-x-1"
            onClick={() => setCurrentView('companySettings')}
          >
            <Building className="w-4 h-4 mr-2" />
            Companies
          </Button>
        </nav>
      </div>
    </div>
  );

  // Dashboard component
  const renderDashboard = () => {
    const filteredInvoices = filterInvoices(invoices);
    const filteredCompanies = filterCompanies(companies);
    const recentInvoices = filteredInvoices.slice(-5).reverse();

    return (
      <div className="space-y-6 animate-fade-in-up">
        {invoices.length === 0 && companies.length === 0 && (
          <Card className="animate-scale-in">
            <CardHeader>
              <CardTitle>Welcome to Invoice Generator</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Get started by setting up your personal and banking details, then create your first invoice.</p>
              <div className="flex gap-2">
                <Button onClick={() => setCurrentView('personalSettings')} variant="outline" className="btn-press transition-smooth hover:shadow-md">
                  <User className="w-4 h-4 mr-2" />
                  Setup Personal Details
                </Button>
                <Button onClick={() => setCurrentView('createInvoice')} className="btn-press transition-smooth hover:shadow-md">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Invoice
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="animate-fade-in-up stagger-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Companies {searchQuery && `(${filteredCompanies.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredCompanies.length > 0 ? (
                <div className="space-y-3">
                  {filteredCompanies.map((company, index) => (
                    <Card
                      key={company.id}
                      className={`cursor-pointer hover-lift animate-fade-in-up stagger-${Math.min(index + 1, 5)}`}
                      onClick={() => {
                        setSelectedCompany(company);
                        setCurrentView('companyDetails');
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{company.name}</h3>
                            <p className="text-sm text-gray-600">{company.invoiceCount} invoices</p>
                            <p className="text-sm font-medium">{formatCurrency(company.totalRevenue)}</p>
                          </div>
                          <Badge variant="secondary">
                            Next: {generateInvoiceNumber(company)}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">
                  {searchQuery ? 'No companies match your search.' : 'No companies yet. Create your first invoice to get started.'}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="animate-fade-in-up stagger-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Recent Invoices {searchQuery && `(${recentInvoices.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentInvoices.length > 0 ? (
                <div className="space-y-3">
                  {recentInvoices.map((invoice, index) => {
                    const status = getInvoiceStatus(invoice);
                    return (
                      <Card
                        key={invoice.id}
                        className={`cursor-pointer hover-lift animate-fade-in-up stagger-${Math.min(index + 1, 5)}`}
                        onClick={() => {
                          setPreviewInvoice(invoice);
                          setCurrentView('previewInvoice');
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold">{invoice.invoiceNumber}</h3>
                              <p className="text-sm text-gray-600">{invoice.companyName}</p>
                              <p className="text-sm font-medium">{formatCurrency(calculateTotal(invoice.lineItems))}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(status)}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  generatePDF(invoice);
                                }}
                                title="Download PDF"
                                className="btn-press transition-smooth hover:scale-110"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewInvoice(invoice);
                                  setCurrentView('previewInvoice');
                                }}
                                title="Preview"
                                className="btn-press transition-smooth hover:scale-110"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteInvoice(invoice);
                                }}
                                title="Delete"
                                className="btn-press transition-smooth hover:text-red-600 hover:scale-110"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500">
                  {searchQuery ? 'No invoices match your search.' : 'No invoices yet. Create your first invoice to get started.'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // Personal Settings component
  const renderPersonalSettings = () => (
    <div className="space-y-6 animate-fade-in-up">
      <Card className="animate-scale-in">
        <CardHeader>
          <CardTitle>Personal Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              value={personalDetails.businessName}
              onChange={(e) => setPersonalDetails(prev => ({...prev, businessName: e.target.value}))}
            />
          </div>
          <div>
            <Label htmlFor="businessAddress">Business Address</Label>
            <Textarea
              id="businessAddress"
              value={personalDetails.businessAddress}
              onChange={(e) => setPersonalDetails(prev => ({...prev, businessAddress: e.target.value}))}
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="contactEmail">Contact Email</Label>
            <Input
              id="contactEmail"
              type="email"
              value={personalDetails.contactEmail}
              onChange={(e) => setPersonalDetails(prev => ({...prev, contactEmail: e.target.value}))}
            />
          </div>
          <div>
            <Label htmlFor="contactPhone">Contact Phone</Label>
            <Input
              id="contactPhone"
              value={personalDetails.contactPhone}
              onChange={(e) => setPersonalDetails(prev => ({...prev, contactPhone: e.target.value}))}
            />
          </div>
          <div>
            <Label htmlFor="website">Website (Optional)</Label>
            <Input
              id="website"
              value={personalDetails.website}
              onChange={(e) => setPersonalDetails(prev => ({...prev, website: e.target.value}))}
            />
          </div>
          <div>
            <Label htmlFor="footerText">Footer Text</Label>
            <Input
              id="footerText"
              value={personalDetails.footerText}
              onChange={(e) => setPersonalDetails(prev => ({...prev, footerText: e.target.value}))}
            />
          </div>
          <Button onClick={savePersonalDetails} className="w-full btn-press transition-smooth hover:shadow-lg" disabled={loading}>
            {loading ? 'Saving...' : 'Save Personal Details'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  // Banking Details Management Functions
  const handleCreateBankingDetails = async () => {
    if (!newBankingData.name.trim()) {
      showNotification('Please enter a name for this banking details', 'error');
      return;
    }

    try {
      setLoading(true);
      const bankingData = apiClient.transformBankingToAPI(newBankingData);
      await apiClient.createBankingDetails(bankingData);
      await loadBankingDetails();
      setNewBankingData({
        name: '',
        accountHolder: '',
        bankName: '',
        accountNumber: '',
        accountType: '',
        branchCode: '',
        swiftCode: ''
      });
      setShowAddBankingForm(false);
      showNotification('Banking details added successfully');
    } catch (error) {
      showNotification('Failed to create banking details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBankingDetails = async (bankingId) => {
    if (!editingBankingDetails || !editingBankingDetails.name.trim()) {
      showNotification('Please enter a name for this banking details', 'error');
      return;
    }

    try {
      setLoading(true);
      const bankingData = apiClient.transformBankingToAPI(editingBankingDetails);
      await apiClient.updateBankingDetails(bankingId, bankingData);
      await loadBankingDetails();
      setEditingBankingDetails(null);
      showNotification('Banking details updated successfully');
    } catch (error) {
      showNotification('Failed to update banking details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBankingDetails = async (banking) => {
    if (!window.confirm(`Are you sure you want to delete "${banking.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      await apiClient.deleteBankingDetails(banking.id);
      await loadBankingDetails();
      showNotification('Banking details deleted successfully');
    } catch (error) {
      showNotification('Failed to delete banking details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefaultBanking = async (bankingId) => {
    try {
      setLoading(true);
      await apiClient.setDefaultBankingDetails(bankingId);
      await loadBankingDetails();
      showNotification('Default banking details updated');
    } catch (error) {
      showNotification('Failed to set default banking details', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Banking Settings component
  const renderBankingSettings = () => (
    <div className="space-y-6 animate-fade-in-up">
      <Card className="animate-scale-in">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Banking Details
            </CardTitle>
            <Button onClick={() => setShowAddBankingForm(true)} className="btn-press transition-smooth hover:shadow-md">
              <Plus className="w-4 h-4 mr-2" />
              Add Banking Details
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {bankingDetailsList.length > 0 ? (
            <div className="space-y-4">
              {bankingDetailsList.map((banking) => (
                <Card key={banking.id} className={`hover-lift ${banking.isDefault ? 'border-primary border-2' : ''}`}>
                  <CardContent className="p-4">
                    {editingBankingDetails?.id === banking.id ? (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="edit-banking-name">Name *</Label>
                          <Input
                            id="edit-banking-name"
                            value={editingBankingDetails.name}
                            onChange={(e) => setEditingBankingDetails(prev => ({...prev, name: e.target.value}))}
                            placeholder="e.g., Business Account, Personal Account"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-accountHolder">Account Holder</Label>
                          <Input
                            id="edit-accountHolder"
                            value={editingBankingDetails.accountHolder}
                            onChange={(e) => setEditingBankingDetails(prev => ({...prev, accountHolder: e.target.value}))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-bankName">Bank Name</Label>
                          <Input
                            id="edit-bankName"
                            value={editingBankingDetails.bankName}
                            onChange={(e) => setEditingBankingDetails(prev => ({...prev, bankName: e.target.value}))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-accountNumber">Account Number</Label>
                          <Input
                            id="edit-accountNumber"
                            value={editingBankingDetails.accountNumber}
                            onChange={(e) => setEditingBankingDetails(prev => ({...prev, accountNumber: e.target.value}))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-accountType">Account Type</Label>
                          <Input
                            id="edit-accountType"
                            value={editingBankingDetails.accountType}
                            onChange={(e) => setEditingBankingDetails(prev => ({...prev, accountType: e.target.value}))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-branchCode">Branch Code</Label>
                          <Input
                            id="edit-branchCode"
                            value={editingBankingDetails.branchCode}
                            onChange={(e) => setEditingBankingDetails(prev => ({...prev, branchCode: e.target.value}))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-swiftCode">SWIFT Code (Optional)</Label>
                          <Input
                            id="edit-swiftCode"
                            value={editingBankingDetails.swiftCode}
                            onChange={(e) => setEditingBankingDetails(prev => ({...prev, swiftCode: e.target.value}))}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => handleUpdateBankingDetails(banking.id)} disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                          </Button>
                          <Button variant="outline" onClick={() => setEditingBankingDetails(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">{banking.name}</h3>
                            {banking.isDefault && (
                              <Badge variant="default" className="mt-1">Default</Badge>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingBankingDetails(banking)}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteBankingDetails(banking)}
                              title="Delete"
                              className="hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          {banking.bankName && <p><span className="text-gray-600">Bank:</span> {banking.bankName}</p>}
                          {banking.accountHolder && <p><span className="text-gray-600">Account Holder:</span> {banking.accountHolder}</p>}
                          {banking.accountNumber && <p><span className="text-gray-600">Account Number:</span> {banking.accountNumber}</p>}
                          {banking.accountType && <p><span className="text-gray-600">Account Type:</span> {banking.accountType}</p>}
                          {banking.branchCode && <p><span className="text-gray-600">Branch Code:</span> {banking.branchCode}</p>}
                        </div>
                        {!banking.isDefault && (
                          <div className="mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetDefaultBanking(banking.id)}
                              disabled={loading}
                            >
                              Set as Default
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">
              No banking details yet. Click "Add Banking Details" to create your first one.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add Banking Details Dialog */}
      <Dialog open={showAddBankingForm} onOpenChange={setShowAddBankingForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Banking Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-banking-name">Name *</Label>
              <Input
                id="new-banking-name"
                value={newBankingData.name}
                onChange={(e) => setNewBankingData(prev => ({...prev, name: e.target.value}))}
                placeholder="e.g., Business Account, Personal Account"
              />
            </div>
            <div>
              <Label htmlFor="new-accountHolder">Account Holder</Label>
              <Input
                id="new-accountHolder"
                value={newBankingData.accountHolder}
                onChange={(e) => setNewBankingData(prev => ({...prev, accountHolder: e.target.value}))}
              />
            </div>
            <div>
              <Label htmlFor="new-bankName">Bank Name</Label>
              <Input
                id="new-bankName"
                value={newBankingData.bankName}
                onChange={(e) => setNewBankingData(prev => ({...prev, bankName: e.target.value}))}
              />
            </div>
            <div>
              <Label htmlFor="new-accountNumber">Account Number</Label>
              <Input
                id="new-accountNumber"
                value={newBankingData.accountNumber}
                onChange={(e) => setNewBankingData(prev => ({...prev, accountNumber: e.target.value}))}
              />
            </div>
            <div>
              <Label htmlFor="new-accountType">Account Type</Label>
              <Input
                id="new-accountType"
                value={newBankingData.accountType}
                onChange={(e) => setNewBankingData(prev => ({...prev, accountType: e.target.value}))}
                placeholder="e.g., Business Checking, Savings"
              />
            </div>
            <div>
              <Label htmlFor="new-branchCode">Branch Code</Label>
              <Input
                id="new-branchCode"
                value={newBankingData.branchCode}
                onChange={(e) => setNewBankingData(prev => ({...prev, branchCode: e.target.value}))}
              />
            </div>
            <div>
              <Label htmlFor="new-swiftCode">SWIFT Code (Optional)</Label>
              <Input
                id="new-swiftCode"
                value={newBankingData.swiftCode}
                onChange={(e) => setNewBankingData(prev => ({...prev, swiftCode: e.target.value}))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddBankingForm(false);
                setNewBankingData({
                  name: '',
                  accountHolder: '',
                  bankName: '',
                  accountNumber: '',
                  accountType: '',
                  branchCode: '',
                  swiftCode: ''
                });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateBankingDetails} disabled={loading}>
              {loading ? 'Adding...' : 'Add Banking Details'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // Company Settings component
  const renderCompanySettings = () => {
    const filteredCompanies = filterCompanies(companies);

    return (
      <div className="space-y-6 animate-fade-in-up">
        <Card className="animate-scale-in">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Company Management
              </CardTitle>
              <Button onClick={() => setShowAddCompanyForm(true)} className="btn-press transition-smooth hover:shadow-md">
                <Plus className="w-4 h-4 mr-2" />
                Add Company
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredCompanies.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Invoice Prefix</TableHead>
                    <TableHead>Invoices</TableHead>
                    <TableHead>Total Revenue</TableHead>
                    <TableHead>Next Invoice #</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {company.invoicePrefix || generateDefaultPrefix(company.name)}
                        </Badge>
                      </TableCell>
                      <TableCell>{company.invoiceCount}</TableCell>
                      <TableCell>{formatCurrency(company.totalRevenue)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {generateInvoiceNumber(company)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-gray-500">
                {searchQuery ? 'No companies match your search.' : 'No companies yet. Click "Add Company" to create your first company.'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Add Company Dialog */}
        <Dialog open={showAddCompanyForm} onOpenChange={setShowAddCompanyForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Company</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="newCompanyName">Company Name *</Label>
                <Input
                  id="newCompanyName"
                  value={newCompanyData.name}
                  onChange={(e) => setNewCompanyData(prev => ({
                    ...prev,
                    name: e.target.value
                  }))}
                  placeholder="Enter company name"
                />
              </div>
              <div>
                <Label htmlFor="contactPerson">Contact Person (Optional)</Label>
                <Input
                  id="contactPerson"
                  value={newCompanyData.contactPerson}
                  onChange={(e) => setNewCompanyData(prev => ({
                    ...prev,
                    contactPerson: e.target.value
                  }))}
                  placeholder="e.g. John Smith"
                />
              </div>
              <div>
                <Label htmlFor="newCompanyPrefix">Invoice Prefix (Optional)</Label>
                <Input
                  id="newCompanyPrefix"
                  value={newCompanyData.invoicePrefix}
                  onChange={(e) => setNewCompanyData(prev => ({
                    ...prev,
                    invoicePrefix: e.target.value
                  }))}
                  placeholder={newCompanyData.name ? generateDefaultPrefix(newCompanyData.name) : "ABC"}
                  maxLength={6}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Leave blank to use default: {newCompanyData.name ? generateDefaultPrefix(newCompanyData.name) : 'First 3 letters of company name'}
                </p>
              </div>
              <div>
                <Label htmlFor="startingInvoiceNumber">Starting Invoice Number</Label>
                <Input
                  id="startingInvoiceNumber"
                  type="number"
                  min="1"
                  value={newCompanyData.startingInvoiceNumber}
                  onChange={(e) => setNewCompanyData(prev => ({
                    ...prev,
                    startingInvoiceNumber: e.target.value
                  }))}
                  placeholder="1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  First invoice will be: {newCompanyData.invoicePrefix || (newCompanyData.name ? generateDefaultPrefix(newCompanyData.name) : 'XXX')}{String(parseInt(newCompanyData.startingInvoiceNumber) || 1).padStart(3, '0')}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddCompanyForm(false);
                  setNewCompanyData({ name: '', invoicePrefix: '', startingInvoiceNumber: '1', contactPerson: '' });
                }}
              >
                Cancel
              </Button>
              <Button onClick={addNewCompany} disabled={loading}>
                {loading ? 'Adding...' : 'Add Company'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  // Invoice Preview component
  const renderInvoicePreview = () => {
    if (!previewInvoice) return null;

    const total = calculateTotal(previewInvoice.lineItems);
    const status = getInvoiceStatus(previewInvoice);

    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPreviewInvoice(null);
              setCurrentView('dashboard');
            }}
            className="btn-press transition-smooth hover:shadow-md"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <Button
            onClick={() => generatePDF(previewInvoice)}
            disabled={loading}
            className="btn-press transition-smooth hover:shadow-lg"
          >
            <Download className="w-4 h-4 mr-2" />
            {loading ? 'Generating...' : 'Download PDF'}
          </Button>
          <Button
            variant="outline"
            onClick={() => toggleInvoiceStatus(previewInvoice)}
            disabled={loading}
            className="btn-press transition-smooth hover:shadow-md"
          >
            <Check className="w-4 h-4 mr-2" />
            Mark as {previewInvoice.status === 'paid' ? 'Pending' : 'Paid'}
          </Button>
        </div>

        {/* Invoice Preview Card */}
        <Card className="max-w-4xl mx-auto shadow-lg bg-white animate-scale-in">
          {/* Header */}
          <div className="p-8 border-b">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-black">{personalDetails.businessName || 'Your Business'}</h1>
                {personalDetails.businessAddress && (
                  <p className="mt-2 text-gray-800 whitespace-pre-line text-sm">{personalDetails.businessAddress}</p>
                )}
                {personalDetails.contactEmail && (
                  <p className="mt-1 text-gray-800 text-sm">{personalDetails.contactEmail}</p>
                )}
                {personalDetails.contactPhone && (
                  <p className="text-gray-800 text-sm">{personalDetails.contactPhone}</p>
                )}
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-bold text-black">INVOICE</h2>
                <div className="mt-4 text-sm space-y-1 text-right">
                  <div><span className="text-gray-700">Invoice No:</span> <span className="font-medium">{previewInvoice.invoiceNumber}</span></div>
                  <div><span className="text-gray-700">Issue Date:</span> <span className="font-medium">{new Date(previewInvoice.invoiceDate).toLocaleDateString('en-ZA')}</span></div>
                  <div><span className="text-gray-700">Due Date:</span> <span className="font-medium">{new Date(previewInvoice.dueDate).toLocaleDateString('en-ZA')}</span></div>
                </div>
              </div>
            </div>
          </div>

          <CardContent className="p-8 space-y-6">
            {/* Bill To */}
            <div>
              <h3 className="font-bold text-black mb-2 text-sm">BILL TO</h3>
              <p className="font-semibold text-black">{previewInvoice.companyName}</p>
              {previewInvoice.companyAddress && (
                <p className="text-gray-800 whitespace-pre-line mt-1 text-sm">{previewInvoice.companyAddress}</p>
              )}
              {previewInvoice.companyEmail && (
                <p className="text-gray-800 mt-1 text-sm">{previewInvoice.companyEmail}</p>
              )}
            </div>

            {/* Line Items */}
            <div>
              <Table>
                <TableHeader>
                  <TableRow className="border-t border-b border-black">
                    <TableHead className="font-bold text-black">Description</TableHead>
                    <TableHead className="text-center font-bold text-black">Quantity</TableHead>
                    <TableHead className="text-right font-bold text-black">Unit Price</TableHead>
                    <TableHead className="text-right font-bold text-black">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewInvoice.lineItems.map((item, index) => (
                    <TableRow key={index} className="border-0">
                      <TableCell className="text-black">{item.description}</TableCell>
                      <TableCell className="text-center text-black">{item.quantity}</TableCell>
                      <TableCell className="text-right text-black">{formatCurrency(item.rate)}</TableCell>
                      <TableCell className="text-right font-medium text-black">
                        {formatCurrency(item.quantity * item.rate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Total */}
            <div className="flex justify-end border-t border-black pt-2">
              <div className="flex items-center gap-8">
                <span className="font-bold text-black">Total</span>
                <span className="font-bold text-black text-lg">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Banking Details */}
            {(() => {
              const bankingDetails = previewInvoice.bankingDetailsId
                ? bankingDetailsList.find(b => b.id === previewInvoice.bankingDetailsId)
                : bankingDetailsList.find(b => b.isDefault);

              return bankingDetails && (bankingDetails.accountHolder || bankingDetails.bankName) && (
                <div className="mt-6">
                  <h3 className="font-bold text-black mb-3 text-sm">PAY BY BANK TRANSFER</h3>
                  <div className="space-y-1 text-sm">
                    {bankingDetails.name && (
                      <p className="text-black font-semibold">{bankingDetails.name}</p>
                    )}
                    {bankingDetails.bankName && (
                      <p className="text-black">Bank Name: {bankingDetails.bankName}</p>
                    )}
                    {bankingDetails.accountHolder && (
                      <p className="text-black">Account Holder Name: {bankingDetails.accountHolder}</p>
                    )}
                    {bankingDetails.accountNumber && (
                      <p className="text-black">Account Number: {bankingDetails.accountNumber}</p>
                    )}
                    {bankingDetails.accountType && (
                      <p className="text-black">Account Type: {bankingDetails.accountType}</p>
                    )}
                    {bankingDetails.branchCode && (
                      <p className="text-black">Branch Code: {bankingDetails.branchCode}</p>
                    )}
                    <p className="text-black">Payment Reference: {previewInvoice.invoiceNumber}</p>
                  </div>
                </div>
              );
            })()}

            {/* Notes */}
            {previewInvoice.notes && (
              <div className="mt-6">
                <h3 className="font-bold text-black mb-2 text-sm">NOTES</h3>
                <p className="text-gray-800 whitespace-pre-line text-sm">{previewInvoice.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-gray-800 text-sm mt-8 italic">
              {personalDetails.footerText || 'Thank you for your business!'}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Create Invoice component
  const renderCreateInvoice = () => (
    <div className="space-y-6 animate-fade-in-up">
      <Card className="animate-scale-in">
        <CardHeader>
          <CardTitle>{editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="companySelect">Company *</Label>
              <select
                id="companySelect"
                value={currentInvoice.companyId}
                onChange={(e) => {
                  const companyId = e.target.value;
                  const company = companies.find(c => c.id === companyId);
                  setCurrentInvoice(prev => ({
                    ...prev,
                    companyId,
                    companyName: company?.name || '',
                    companyEmail: company?.email || '',
                    companyAddress: company?.address || ''
                  }));
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!!editingInvoice}
              >
                <option value="">Select a company</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              {companies.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  No companies available. <Button variant="link" onClick={() => setCurrentView('companySettings')} className="p-0 h-auto">Add a company first</Button>
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="companyEmail">Company Email</Label>
              <Input
                id="companyEmail"
                type="email"
                value={currentInvoice.companyEmail}
                onChange={(e) => setCurrentInvoice(prev => ({...prev, companyEmail: e.target.value}))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="companyAddress">Company Address</Label>
            <Textarea
              id="companyAddress"
              value={currentInvoice.companyAddress}
              onChange={(e) => setCurrentInvoice(prev => ({...prev, companyAddress: e.target.value}))}
              rows={3}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="invoiceDate">Invoice Date</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={currentInvoice.invoiceDate}
                onChange={(e) => setCurrentInvoice(prev => ({...prev, invoiceDate: e.target.value}))}
              />
            </div>
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={currentInvoice.dueDate}
                onChange={(e) => setCurrentInvoice(prev => ({...prev, dueDate: e.target.value}))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="bankingDetailsSelect">Banking Details (Optional)</Label>
            <select
              id="bankingDetailsSelect"
              value={currentInvoice.bankingDetailsId}
              onChange={(e) => setCurrentInvoice(prev => ({...prev, bankingDetailsId: e.target.value}))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Use Default Banking Details</option>
              {bankingDetailsList.map(banking => (
                <option key={banking.id} value={banking.id}>
                  {banking.name} {banking.isDefault ? '(Default)' : ''}
                </option>
              ))}
            </select>
            {bankingDetailsList.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">
                No banking details available. <Button variant="link" onClick={() => setCurrentView('bankingSettings')} className="p-0 h-auto">Add banking details first</Button>
              </p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <Label>Line Items</Label>
              <Button type="button" size="sm" onClick={addLineItem} className="btn-press transition-smooth hover:shadow-md">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-20">Quantity</TableHead>
                  <TableHead className="w-32">Rate (ZAR)</TableHead>
                  <TableHead className="w-32">Amount</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentInvoice.lineItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        placeholder="Service description"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      {formatCurrency(item.quantity * item.rate)}
                    </TableCell>
                    <TableCell>
                      {currentInvoice.lineItems.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLineItem(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="text-right mt-4">
              <div className="text-lg font-semibold">
                Total: {formatCurrency(calculateTotal(currentInvoice.lineItems))}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={currentInvoice.notes}
              onChange={(e) => setCurrentInvoice(prev => ({...prev, notes: e.target.value}))}
              rows={3}
              placeholder="Additional notes or payment terms"
            />
          </div>

          <div className="flex gap-4">
            <Button onClick={saveInvoice} disabled={loading} className="btn-press transition-smooth hover:shadow-lg">
              {loading ? 'Saving...' : (editingInvoice ? 'Update Invoice' : 'Create Invoice')}
            </Button>
            <Button
              variant="outline"
              className="btn-press transition-smooth"
              onClick={() => {
                setCurrentView('dashboard');
                setEditingInvoice(null);
                setCurrentInvoice({
                  id: null,
                  invoiceNumber: '',
                  companyId: '',
                  companyName: '',
                  companyAddress: '',
                  companyEmail: '',
                  invoiceDate: new Date().toISOString().split('T')[0],
                  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  lineItems: [{ description: '', quantity: 1, rate: 0 }],
                  notes: '',
                  status: 'pending',
                  bankingDetailsId: ''
                });
              }}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCreateRecurringInvoice = () => {
    const previewDates = calculateRecurringDates();
    const total = calculateTotal(currentRecurringInvoice.lineItems);

    return (
      <div className="space-y-6 animate-fade-in-up">
        <Card className="animate-scale-in">
          <CardHeader>
            <CardTitle>Create Recurring Invoice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="recurringCompanySelect">Company *</Label>
                <select
                  id="recurringCompanySelect"
                  value={currentRecurringInvoice.companyId}
                  onChange={(e) => {
                    const companyId = e.target.value;
                    setCurrentRecurringInvoice(prev => ({
                      ...prev,
                      companyId
                    }));
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select a company</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
                {companies.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    No companies available. <Button variant="link" onClick={() => setCurrentView('companySettings')} className="p-0 h-auto">Add a company first</Button>
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="frequency">Frequency *</Label>
                <select
                  id="frequency"
                  value={currentRecurringInvoice.frequency}
                  onChange={(e) => setCurrentRecurringInvoice(prev => ({...prev, frequency: e.target.value}))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="numberOfRecurrences">Number of Recurrences *</Label>
                <Input
                  id="numberOfRecurrences"
                  type="number"
                  min="1"
                  max="120"
                  value={currentRecurringInvoice.numberOfRecurrences}
                  onChange={(e) => setCurrentRecurringInvoice(prev => ({...prev, numberOfRecurrences: parseInt(e.target.value) || 1}))}
                />
                <p className="text-sm text-gray-500 mt-1">
                  {currentRecurringInvoice.numberOfRecurrences} invoice{currentRecurringInvoice.numberOfRecurrences !== 1 ? 's' : ''} will be generated
                </p>
              </div>

              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={currentRecurringInvoice.startDate}
                  onChange={(e) => setCurrentRecurringInvoice(prev => ({...prev, startDate: e.target.value}))}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <Label>Line Items</Label>
                <Button type="button" size="sm" onClick={addRecurringLineItem} className="btn-press transition-smooth hover:shadow-md">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-20">Quantity</TableHead>
                    <TableHead className="w-32">Rate (ZAR)</TableHead>
                    <TableHead className="w-32">Amount</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRecurringInvoice.lineItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) => updateRecurringLineItem(index, 'description', e.target.value)}
                          placeholder="Service description"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateRecurringLineItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => updateRecurringLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        {formatCurrency(item.quantity * item.rate)}
                      </TableCell>
                      <TableCell>
                        {currentRecurringInvoice.lineItems.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRecurringLineItem(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="text-right mt-4">
                <div className="text-lg font-semibold">
                  Total per invoice: {formatCurrency(total)}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="recurringNotes">Notes (Optional)</Label>
              <Textarea
                id="recurringNotes"
                value={currentRecurringInvoice.notes}
                onChange={(e) => setCurrentRecurringInvoice(prev => ({...prev, notes: e.target.value}))}
                rows={3}
                placeholder="Additional notes or payment terms"
              />
            </div>

            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-sm">Invoice Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-2">
                  The following {previewDates.length} invoice{previewDates.length !== 1 ? 's' : ''} will be generated:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {previewDates.slice(0, 12).map((date, index) => (
                    <div key={index} className="text-sm bg-white p-2 rounded border">
                      Invoice {index + 1}: {new Date(date).toLocaleDateString()}
                    </div>
                  ))}
                </div>
                {previewDates.length > 12 && (
                  <p className="text-sm text-gray-500 mt-2">
                    ...and {previewDates.length - 12} more
                  </p>
                )}
                <p className="text-sm text-gray-600 mt-4">
                  <strong>Total value:</strong> {formatCurrency(total * currentRecurringInvoice.numberOfRecurrences)}
                </p>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button onClick={saveRecurringInvoice} disabled={loading} className="btn-press transition-smooth hover:shadow-lg">
                {loading ? 'Creating...' : 'Create Recurring Invoice'}
              </Button>
              <Button
                variant="outline"
                className="btn-press transition-smooth"
                onClick={() => {
                  setCurrentView('dashboard');
                  setCurrentRecurringInvoice({
                    companyId: '',
                    frequency: 'monthly',
                    numberOfRecurrences: 6,
                    startDate: new Date().toISOString().split('T')[0],
                    lineItems: [{ description: '', quantity: 1, rate: 0 }],
                    notes: ''
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderCompanyDetails = () => {
    if (!selectedCompany) return null;

    const companyInvoices = invoices.filter(inv => inv.companyId === selectedCompany.id);
    const isEditing = editingCompanyData !== null;
    const displayData = isEditing ? editingCompanyData : selectedCompany;

    return (
      <div className="max-w-6xl mx-auto animate-fade-in-up">
        <Button
          variant="ghost"
          onClick={() => {
            setCurrentView('dashboard');
            setSelectedCompany(null);
            setEditingCompanyData(null);
          }}
          className="mb-6 btn-press transition-smooth hover:shadow-md"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Company Details Card */}
          <Card className="lg:col-span-1 animate-scale-in">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Company Details</span>
                {!isEditing ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingCompanyData({
                      name: selectedCompany.name,
                      email: selectedCompany.email || '',
                      address: selectedCompany.address || '',
                      contactPerson: selectedCompany.contactPerson || '',
                      phone: selectedCompany.phone || '',
                      invoicePrefix: selectedCompany.invoicePrefix || ''
                    })}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingCompanyData(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div>
                    <Label htmlFor="edit-company-name">Company Name</Label>
                    <Input
                      id="edit-company-name"
                      value={displayData.name}
                      onChange={(e) => setEditingCompanyData(prev => ({...prev, name: e.target.value}))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-contact-person">Contact Person</Label>
                    <Input
                      id="edit-contact-person"
                      value={displayData.contactPerson}
                      onChange={(e) => setEditingCompanyData(prev => ({...prev, contactPerson: e.target.value}))}
                      placeholder="Contact person name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-company-email">Email</Label>
                    <Input
                      id="edit-company-email"
                      type="email"
                      value={displayData.email}
                      onChange={(e) => setEditingCompanyData(prev => ({...prev, email: e.target.value}))}
                      placeholder="company@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-company-phone">Phone</Label>
                    <Input
                      id="edit-company-phone"
                      value={displayData.phone}
                      onChange={(e) => setEditingCompanyData(prev => ({...prev, phone: e.target.value}))}
                      placeholder="+27 XX XXX XXXX"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-company-address">Address</Label>
                    <Textarea
                      id="edit-company-address"
                      value={displayData.address}
                      onChange={(e) => setEditingCompanyData(prev => ({...prev, address: e.target.value}))}
                      rows={3}
                      placeholder="Company address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-invoice-prefix">Invoice Prefix</Label>
                    <Input
                      id="edit-invoice-prefix"
                      value={displayData.invoicePrefix}
                      onChange={(e) => setEditingCompanyData(prev => ({...prev, invoicePrefix: e.target.value}))}
                      placeholder="ABC"
                      maxLength={10}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleUpdateCompany} disabled={loading} className="flex-1">
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="outline" onClick={() => setEditingCompanyData(null)}>
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-gray-600">Company Name</p>
                    <p className="font-semibold">{displayData.name}</p>
                  </div>
                  {displayData.contactPerson && (
                    <div>
                      <p className="text-sm text-gray-600">Contact Person</p>
                      <p className="font-semibold">{displayData.contactPerson}</p>
                    </div>
                  )}
                  {displayData.email && (
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-semibold">{displayData.email}</p>
                    </div>
                  )}
                  {displayData.phone && (
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-semibold">{displayData.phone}</p>
                    </div>
                  )}
                  {displayData.address && (
                    <div>
                      <p className="text-sm text-gray-600">Address</p>
                      <p className="font-semibold whitespace-pre-line">{displayData.address}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Invoice Prefix</p>
                    <p className="font-semibold">{displayData.invoicePrefix || 'None'}</p>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold">{formatCurrency(selectedCompany.totalRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Next Invoice Number</p>
                    <p className="font-semibold">{generateInvoiceNumber(selectedCompany)}</p>
                  </div>
                  <div className="pt-4 border-t">
                    <Button
                      variant="destructive"
                      className="w-full btn-press transition-smooth hover:shadow-md"
                      onClick={() => handleDeleteCompany(selectedCompany)}
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Company
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Invoices List */}
          <Card className="lg:col-span-2 animate-scale-in stagger-1">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Invoices ({companyInvoices.length})</span>
                <Button
                  size="sm"
                  onClick={() => {
                    setCurrentInvoice(prev => ({
                      ...prev,
                      companyId: selectedCompany.id,
                      companyName: selectedCompany.name,
                      companyAddress: selectedCompany.address || '',
                      companyEmail: selectedCompany.email || ''
                    }));
                    setCurrentView('createInvoice');
                  }}
                  className="btn-press transition-smooth hover:shadow-md"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Invoice
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {companyInvoices.length > 0 ? (
                <div className="space-y-3">
                  {companyInvoices.map((invoice, index) => {
                    const status = getInvoiceStatus(invoice);
                    return (
                      <Card
                        key={invoice.id}
                        className={`cursor-pointer hover-lift animate-fade-in-up stagger-${Math.min(index + 1, 5)}`}
                        onClick={() => {
                          setPreviewInvoice(invoice);
                          setCurrentView('previewInvoice');
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold">{invoice.invoiceNumber}</h3>
                              <p className="text-sm text-gray-600">
                                {new Date(invoice.invoiceDate).toLocaleDateString('en-ZA')}
                              </p>
                              <p className="text-sm font-medium">{formatCurrency(calculateTotal(invoice.lineItems))}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(status)}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  generatePDF(invoice);
                                }}
                                title="Download PDF"
                                className="btn-press transition-smooth hover:scale-110"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteInvoice(invoice);
                                }}
                                title="Delete"
                                className="btn-press transition-smooth hover:text-red-600 hover:scale-110"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">No invoices for this company yet</p>
                  <Button
                    onClick={() => {
                      setCurrentInvoice(prev => ({
                        ...prev,
                        companyId: selectedCompany.id,
                        companyName: selectedCompany.name,
                        companyAddress: selectedCompany.address || '',
                        companyEmail: selectedCompany.email || ''
                      }));
                      setCurrentView('createInvoice');
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Invoice
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  if (loading && companies.length === 0 && invoices.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600 animate-pulse-soft">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {renderNavigation()}

      <div className="flex-1 ml-64">
        <main className="p-6 pt-20">
          {showAlert.show && (
            <Alert className={`mb-6 animate-fade-in-down ${showAlert.type === 'error' ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}`}>
              <AlertDescription>{showAlert.message}</AlertDescription>
            </Alert>
          )}

          {currentView === 'dashboard' && renderDashboard()}
          {currentView === 'revenue' && <RevenueDashboard invoices={invoices} companies={companies} />}
          {currentView === 'personalSettings' && renderPersonalSettings()}
          {currentView === 'bankingSettings' && renderBankingSettings()}
          {currentView === 'companySettings' && renderCompanySettings()}
          {currentView === 'createInvoice' && renderCreateInvoice()}
          {currentView === 'createRecurringInvoice' && renderCreateRecurringInvoice()}
          {currentView === 'previewInvoice' && renderInvoicePreview()}
          {currentView === 'companyDetails' && renderCompanyDetails()}
        </main>
      </div>
    </div>
  );
};

export default InvoiceGeneratorAPI;