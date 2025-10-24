import { ClerkAuthProvider } from './contexts/ClerkAuthContext';
import OAuthAuthWrapper from './components/auth/OAuthAuthWrapper';
import InvoiceGeneratorAPI from './components/InvoiceGeneratorAPI';

function App() {
  return (
    <ClerkAuthProvider>
      <OAuthAuthWrapper>
        <InvoiceGeneratorAPI />
      </OAuthAuthWrapper>
    </ClerkAuthProvider>
  );
}

export default App