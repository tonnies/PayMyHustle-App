# PayMyHustle

A professional freelance invoice generator built with React, Vite, and Cloudflare Pages. Create, manage, and track invoices with a clean, minimal design.

## Features

- **Professional Invoice Generation**: Create beautiful PDF invoices with automatic calculations
- **Client Management**: Organize clients with detailed company profiles
- **Payment Tracking**: Monitor invoice status (pending/paid) and revenue
- **OAuth Authentication**: Secure login with Clerk (Google, Apple)
- **Company Details Dashboard**: View and edit company information with invoice history
- **Custom Invoice Numbering**: Set custom prefixes and starting numbers for each client
- **Banking Details**: Store and display payment information on invoices
- **South African Rand (ZAR)**: Built-in currency formatting

## Tech Stack

- **Frontend**: React 18, Vite 4
- **UI Components**: shadcn/ui, Tailwind CSS
- **Authentication**: Clerk (OAuth)
- **Backend**: Cloudflare Pages Functions
- **Database**: Cloudflare D1 (SQLite)
- **PDF Generation**: jsPDF, jspdf-autotable

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Cloudflare account (for deployment)
- Clerk account (for authentication)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/PayMyHustle.git
cd PayMyHustle
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory:
```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
```

4. Set up the database:
```bash
wrangler d1 create paymyhustle-db
wrangler d1 execute paymyhustle-db --local --file=./migrations/schema.sql
```

### Development

Run the development server:

```bash
# Frontend only
npm run dev

# Full stack (frontend + backend)
npm run dev:full
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8788

### Building for Production

```bash
npm run build
```

## Project Structure

```
PayMyHustle/
├── src/
│   ├── components/
│   │   ├── InvoiceGeneratorAPI.jsx  # Main invoice component
│   │   ├── auth/
│   │   │   └── OAuthAuthWrapper.jsx # Authentication wrapper
│   │   └── ui/                       # shadcn/ui components
│   ├── contexts/
│   │   └── ClerkAuthContext.jsx     # Auth context provider
│   ├── lib/
│   │   └── api.js                   # API client
│   └── App.jsx
├── functions/
│   └── api/
│       └── [[path]].js              # Cloudflare Pages Functions API
├── migrations/
│   └── schema.sql                   # Database schema
└── public/
```

## Deployment

### Cloudflare Pages

1. Push your code to GitHub
2. Connect your repository to Cloudflare Pages
3. Configure build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Add environment variables in Cloudflare dashboard
5. Deploy!

## Environment Variables

- `VITE_CLERK_PUBLISHABLE_KEY`: Your Clerk publishable key for OAuth authentication

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Author

Anton Meijer

## Acknowledgments

- Built with [Clerk](https://clerk.com) for authentication
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Deployed on [Cloudflare Pages](https://pages.cloudflare.com)
