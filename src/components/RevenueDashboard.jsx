import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  BarChart3,
  Calendar,
  Building2,
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const RevenueDashboard = ({ invoices, companies }) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState('all');

  // Get available years from invoices
  const availableYears = useMemo(() => {
    const years = new Set();
    invoices.forEach((invoice) => {
      const year = new Date(invoice.invoiceDate).getFullYear();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [invoices]);

  // Filter invoices based on selected filters
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const invoiceDate = new Date(invoice.invoiceDate);
      const invoiceYear = invoiceDate.getFullYear();
      const invoiceMonth = invoiceDate.getMonth();

      const yearMatch = invoiceYear === selectedYear;
      const monthMatch =
        selectedMonth === 'all' || invoiceMonth === parseInt(selectedMonth);
      const companyMatch =
        selectedCompany === 'all' || invoice.companyId === selectedCompany;

      return yearMatch && monthMatch && companyMatch;
    });
  }, [invoices, selectedYear, selectedMonth, selectedCompany]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalRevenue = filteredInvoices.reduce(
      (sum, inv) => sum + (inv.totalAmount || 0),
      0
    );

    const outstandingInvoices = filteredInvoices.filter(
      (inv) => inv.status === 'pending' || inv.status === 'overdue'
    );
    const outstandingAmount = outstandingInvoices.reduce(
      (sum, inv) => sum + (inv.totalAmount || 0),
      0
    );

    const paidInvoices = filteredInvoices.filter((inv) => inv.status === 'paid');
    const paidAmount = paidInvoices.reduce(
      (sum, inv) => sum + (inv.totalAmount || 0),
      0
    );

    // Calculate average income per month for the selected year
    const monthlyRevenue = {};
    filteredInvoices.forEach((invoice) => {
      const month = new Date(invoice.invoiceDate).getMonth();
      if (!monthlyRevenue[month]) {
        monthlyRevenue[month] = 0;
      }
      monthlyRevenue[month] += invoice.totalAmount || 0;
    });

    const monthsWithRevenue = Object.keys(monthlyRevenue).length || 1;
    const averageMonthlyIncome = totalRevenue / monthsWithRevenue;

    return {
      totalRevenue,
      outstandingAmount,
      paidAmount,
      averageMonthlyIncome,
      outstandingCount: outstandingInvoices.length,
      paidCount: paidInvoices.length,
    };
  }, [filteredInvoices]);

  // Revenue by month
  const revenueByMonth = useMemo(() => {
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(2000, i, 1).toLocaleString('default', { month: 'short' }),
      revenue: 0,
      paid: 0,
      outstanding: 0,
    }));

    filteredInvoices.forEach((invoice) => {
      const month = new Date(invoice.invoiceDate).getMonth();
      const amount = invoice.totalAmount || 0;
      monthlyData[month].revenue += amount;

      if (invoice.status === 'paid') {
        monthlyData[month].paid += amount;
      } else {
        monthlyData[month].outstanding += amount;
      }
    });

    return monthlyData;
  }, [filteredInvoices]);

  // Revenue by company
  const revenueByCompany = useMemo(() => {
    const companyRevenue = {};

    filteredInvoices.forEach((invoice) => {
      const companyId = invoice.companyId;
      const company = companies.find((c) => c.id === companyId);
      const companyName = company?.name || 'Unknown';

      if (!companyRevenue[companyName]) {
        companyRevenue[companyName] = 0;
      }
      companyRevenue[companyName] += invoice.totalAmount || 0;
    });

    return Object.entries(companyRevenue)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10); // Top 10 companies
  }, [filteredInvoices, companies]);

  // Status distribution
  const statusDistribution = useMemo(() => {
    const distribution = {
      paid: 0,
      pending: 0,
      overdue: 0,
    };

    filteredInvoices.forEach((invoice) => {
      const status = invoice.status || 'pending';
      distribution[status] = (distribution[status] || 0) + (invoice.totalAmount || 0);
    });

    return [
      { name: 'Paid', value: distribution.paid, color: '#10b981' },
      { name: 'Pending', value: distribution.pending, color: '#f59e0b' },
      { name: 'Overdue', value: distribution.overdue, color: '#ef4444' },
    ].filter((item) => item.value > 0);
  }, [filteredInvoices]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const months = [
    { value: 'all', label: 'All Months' },
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Revenue Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Track your income, outstanding invoices, and financial trends
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Year Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Company Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building2 className="w-4 h-4 inline mr-1" />
                Company
              </label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Companies</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Revenue */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold mt-2">
                  {formatCurrency(metrics.totalRevenue)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {filteredInvoices.length} invoices
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Outstanding Invoices */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Outstanding</p>
                <p className="text-3xl font-bold mt-2 text-orange-600">
                  {formatCurrency(metrics.outstandingAmount)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {metrics.outstandingCount} unpaid invoices
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Monthly Income */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Monthly Income</p>
                <p className="text-3xl font-bold mt-2 text-green-600">
                  {formatCurrency(metrics.averageMonthlyIncome)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {formatCurrency(metrics.paidAmount)} paid
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Month */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Month ({selectedYear})</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="paid" fill="#10b981" name="Paid" />
                <Bar dataKey="outstanding" fill="#f59e0b" name="Outstanding" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6">
        {/* Revenue by Company */}
        <Card>
          <CardHeader>
            <CardTitle>Top Revenue by Company</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={revenueByCompany} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px' }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" name="Revenue">
                  {revenueByCompany.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                contentStyle={{ borderRadius: '8px' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Total Revenue"
              />
              <Line
                type="monotone"
                dataKey="paid"
                stroke="#10b981"
                strokeWidth={2}
                name="Paid"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueDashboard;
