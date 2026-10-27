// filters and pages only change the query string: the browser's own history api does
// that without asking the server, and next keeps useSearchParams in sync with it
export function go(href: string, replace = false) {
  if (href === location.pathname + location.search) return false;
  if (replace) window.history.replaceState(null, '', href);
  else window.history.pushState(null, '', href);
  return true;
}

// a plain click on a link that should go(): keep new-tab clicks working
export function onGo(href: string) {
  return (e: React.MouseEvent) => {
    if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    go(href);
  };
}
