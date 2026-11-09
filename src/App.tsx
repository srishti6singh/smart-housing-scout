import { useEffect } from 'react';
import { BrowserRouter, Link, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { EmptyState } from './components/states';
import { ComparePage } from './pages/ComparePage';
import { ListingPage } from './pages/ListingPage';
import { SavedPage } from './pages/SavedPage';
import { SearchPage } from './pages/SearchPage';
import { AppStateProvider } from './state/AppState';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Layout() {
  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[2000] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-ink">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Outlet />
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="px-4 py-16">
      <EmptyState
        title="Page not found"
        body="This link doesn’t match a page or a listing. The sample listings may have changed."
        action={
          <Link to="/" className="btn-primary">
            Back to search
          </Link>
        }
      />
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppStateProvider>
        <ScrollToTop />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<SearchPage />} />
            <Route path="listing/:id" element={<ListingPage />} />
            <Route path="compare" element={<ComparePage />} />
            <Route path="saved" element={<SavedPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AppStateProvider>
    </BrowserRouter>
  );
}
