// Main App component with MUI theme
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme/theme';
import { Dashboard } from './pages/Dashboard';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <Dashboard />
    </ThemeProvider>
  );
}

export default App;
