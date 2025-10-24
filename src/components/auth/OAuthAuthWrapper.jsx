import React from 'react';
import { SignIn, SignUp, UserButton, useAuth } from '@clerk/clerk-react';
import { useAuthContext } from '../../contexts/ClerkAuthContext';
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Building, CreditCard, FileText } from 'lucide-react';

const OAuthAuthWrapper = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthenticationScreen />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* User profile and logout button - Fixed position to avoid overlap */}
      <div className="fixed top-4 right-4 z-[100]">
        <div className="flex items-center gap-3 bg-white rounded-lg shadow-lg border px-3 py-2">
          <span className="text-sm text-gray-600 hidden sm:inline">
            {user?.name || user?.email}
          </span>
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-8 h-8",
                userButtonPopoverCard: "shadow-xl",
                userButtonPopoverActionButton: "hover:bg-gray-100"
              }
            }}
            userProfileMode="navigation"
            userProfileUrl="/user-profile"
          />
        </div>
      </div>
      {children}
    </div>
  );
};

const AuthenticationScreen = () => {
  const [mode, setMode] = React.useState('signin'); // 'signin' or 'signup'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">

        {/* Left side - Branding and features */}
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              PayMyHustle
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Professional invoice management made simple. Create, track, and manage your invoices with ease.
            </p>
          </div>

          <div className="grid gap-6">
            <FeatureCard
              icon={<FileText className="w-6 h-6 text-blue-600" />}
              title="Professional Invoices"
              description="Create beautiful, professional invoices with automatic calculations and PDF generation."
            />
            <FeatureCard
              icon={<Building className="w-6 h-6 text-green-600" />}
              title="Client Management"
              description="Organize your clients and track invoice history with detailed company profiles."
            />
            <FeatureCard
              icon={<CreditCard className="w-6 h-6 text-purple-600" />}
              title="Payment Tracking"
              description="Monitor payment status and keep track of your revenue with real-time updates."
            />
          </div>

          <div className="bg-white/50 backdrop-blur rounded-lg p-4">
            <p className="text-sm text-gray-600">
              <strong>Secure authentication</strong> powered by industry-leading OAuth providers.
              Your data is encrypted and protected.
            </p>
          </div>
        </div>

        {/* Right side - Authentication */}
        <div className="w-full max-w-md mx-auto">
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl">
                {mode === 'signin' ? 'Welcome Back' : 'Get Started'}
              </CardTitle>
              <p className="text-gray-600">
                {mode === 'signin'
                  ? 'Sign in to your PayMyHustle account'
                  : 'Create your PayMyHustle account'
                }
              </p>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Clerk Authentication Component */}
              <div className="flex justify-center">
                {mode === 'signin' ? (
                  <SignIn
                    routing="virtual"
                    appearance={{
                      elements: {
                        rootBox: "w-full",
                        card: "border-0 shadow-none",
                        headerTitle: "hidden",
                        headerSubtitle: "hidden",
                        socialButtons: "flex flex-col gap-3",
                        socialButtonsBlockButton: "border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-medium",
                        socialButtonsBlockButtonText: "font-medium",
                        formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors",
                        footerAction: "hidden"
                      }
                    }}
                  />
                ) : (
                  <SignUp
                    routing="virtual"
                    appearance={{
                      elements: {
                        rootBox: "w-full",
                        card: "border-0 shadow-none",
                        headerTitle: "hidden",
                        headerSubtitle: "hidden",
                        socialButtons: "flex flex-col gap-3",
                        socialButtonsBlockButton: "border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-medium",
                        socialButtonsBlockButtonText: "font-medium",
                        formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors",
                        footerAction: "hidden"
                      }
                    }}
                  />
                )}
              </div>

              {/* Switch between signin/signup */}
              <div className="text-center border-t pt-4">
                <p className="text-sm text-gray-600">
                  {mode === 'signin' ? "Don't have an account?" : "Already have an account?"}
                </p>
                <Button
                  variant="link"
                  onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                  className="text-blue-600 hover:text-blue-700 font-medium p-0 h-auto"
                >
                  {mode === 'signin' ? 'Create account' : 'Sign in'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Security notice */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By continuing, you agree to our Terms of Service and Privacy Policy.
              Your data is secured with enterprise-grade encryption.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <div className="flex items-start gap-4 p-4 bg-white/60 backdrop-blur rounded-lg border border-white/20">
    <div className="p-2 bg-white rounded-lg shadow-sm">
      {icon}
    </div>
    <div>
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  </div>
);

export default OAuthAuthWrapper;