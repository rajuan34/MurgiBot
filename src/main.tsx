import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { PrivacyPolicy } from './pages/PrivacyPolicy.tsx';
import { TermsOfService } from './pages/TermsOfService.tsx';
import './index.css';

const path = window.location.pathname;

let Component = App;
if (path === '/privacy') {
  Component = PrivacyPolicy;
} else if (path === '/terms') {
  Component = TermsOfService;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Component />
  </StrictMode>,
);
