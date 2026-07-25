const TITLE_MAP = {
  '/': 'Dashboard',
  '/login': 'Sign In',
  '/admin': 'Admin Panel',
  '/manager-dashboard': 'My Requests',
  '/officer-dashboard': 'All Requests',
  '/new-request': 'New Request',
  '/manage-vendors': 'Vendor Management',
  '/add-vendor': 'Add Vendor',
  '/analytics': 'Analytics',
  '/activity-log': 'Activity Log',
  '/profile': 'Profile',
  '/avatar-studio': 'Avatar Studio',
  '/accept-invite': 'Accept Invitation',
};

export function updatePageTitle(pathname) {
  // Check exact match first
  if (TITLE_MAP[pathname]) {
    document.title = `${TITLE_MAP[pathname]} — ProcureAI`;
    return;
  }
  // Check prefix matches
  if (pathname.startsWith('/pr/')) {
    document.title = 'Request Details — ProcureAI';
  } else if (pathname.startsWith('/accept-invite')) {
    document.title = 'Accept Invitation — ProcureAI';
  } else {
    document.title = 'ProcureAI — Procurement Management';
  }
}
