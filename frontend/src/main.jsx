import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { PrintProvider } from './contexts/PrintContext.jsx';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <PrintProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </PrintProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
