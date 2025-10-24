import React, { createContext, useContext, useEffect, useState } from 'react';
import { ClerkProvider, useAuth, useUser } from '@clerk/clerk-react';
import apiClient from '../lib/api';

const AuthContext = createContext();

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

// Inner component that uses Clerk hooks
const AuthProviderInner = ({ children }) => {
  const { isSignedIn, userId, getToken } = useAuth();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [apiUser, setApiUser] = useState(null);

  // Sync Clerk user with our API
  useEffect(() => {
    const syncUser = async () => {
      if (isSignedIn && user && userId) {
        try {
          // Get Clerk token for API authentication
          const token = await getToken();

          // Set up API client with user ID
          apiClient.setUserId(userId);

          // Check if user exists in our database, create if not
          let actualUserId = userId;
          try {
            const profileResult = await apiClient.getUserProfile();
            // If profile is empty, user doesn't exist yet
            if (!profileResult.profile || Object.keys(profileResult.profile).length === 0) {
              console.log('Creating new user profile...');
              const result = await apiClient.createUserFromOAuth({
                id: userId,
                email: user.primaryEmailAddress?.emailAddress,
                name: user.fullName,
                firstName: user.firstName,
                lastName: user.lastName,
                imageUrl: user.imageUrl
              });
              // Use the returned user ID (in case of existing user by email)
              if (result.userId) {
                actualUserId = result.userId;
                apiClient.setUserId(actualUserId);
              }
            }
          } catch (error) {
            // If user doesn't exist, create them
            if (error.message.includes('Authentication required') || error.message.includes('not found')) {
              console.log('Creating new user profile...');
              const result = await apiClient.createUserFromOAuth({
                id: userId,
                email: user.primaryEmailAddress?.emailAddress,
                name: user.fullName,
                firstName: user.firstName,
                lastName: user.lastName,
                imageUrl: user.imageUrl
              });
              // Use the returned user ID (in case of existing user by email)
              if (result.userId) {
                actualUserId = result.userId;
                apiClient.setUserId(actualUserId);
              }
            }
          }

          setApiUser({
            id: userId,
            email: user.primaryEmailAddress?.emailAddress,
            name: user.fullName,
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl
          });
        } catch (error) {
          console.error('Error syncing user:', error);
        }
      } else {
        apiClient.setUserId(null);
        setApiUser(null);
      }
      setLoading(false);
    };

    syncUser();
  }, [isSignedIn, user, userId, getToken]);

  const value = {
    user: apiUser,
    isAuthenticated: isSignedIn,
    loading,
    userId,
    clerkUser: user,
    getToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Main provider component
export const ClerkAuthProvider = ({ children }) => {
  const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!clerkPubKey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h1>
          <p className="text-gray-600 mb-4">
            Missing Clerk publishable key. Please follow these steps:
          </p>
          <ol className="text-left text-sm space-y-2 bg-gray-50 p-4 rounded">
            <li>1. Go to <a href="https://dashboard.clerk.com" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">dashboard.clerk.com</a></li>
            <li>2. Create a new application</li>
            <li>3. Enable Google and Apple OAuth providers</li>
            <li>4. Copy your publishable key</li>
            <li>5. Add it to your .env.local file as VITE_CLERK_PUBLISHABLE_KEY</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      appearance={{
        elements: {
          footer: "hidden"
        }
      }}
    >
      <AuthProviderInner>
        {children}
      </AuthProviderInner>
    </ClerkProvider>
  );
};