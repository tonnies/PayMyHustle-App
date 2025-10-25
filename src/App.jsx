import InvoiceGeneratorAPI from './components/InvoiceGeneratorAPI';
import AuthWrapper from './components/auth/AuthWrapper';

function App() {
  return (
    <AuthWrapper>
      <InvoiceGeneratorAPI />
    </AuthWrapper>
  );
}

export default App