import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Resets scroll position to top on route (pathname) changes only.
 * Does not interfere with in-page interactions, hash changes, or search params.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
