const TITLE_MAP = {
  '/': 'Dashboard',
  '/login': 'Sign In',
  '/admin': 'Admin Panel',
  '/manager-dashboard': 'My Requests',
  '/officer-dashboard': 'All Requests',
  '/new-request': 'New Request',
  '/manage-vendors': 'Vendor Management',
  '/add-vendor': 'Add Vendor',
  '/manage-vendors/:id': 'Vendor Catalog',
  '/analytics': 'Analytics',
  '/activity-log': 'Activity Log',
  '/profile': 'Profile',
  '/avatar-studio': 'Avatar Studio',
  '/accept-invite': 'Accept Invitation',
  '/inventory': 'Inventory',
  '/purchase-orders': 'Purchase Orders',
  '/deliveries': 'Delivery Tracking',
  '/agent': 'Procura Agent',
};

export function updatePageTitle(pathname) {
  // Check exact match first
  if (TITLE_MAP[pathname]) {
    document.title = `${TITLE_MAP[pathname]} — ProcureAI`;
    return;
  }
  // Check prefix matches
  if (pathname.startsWith('/pr/') && pathname.endsWith('/compare')) {
    document.title = 'Vendor Comparison — ProcureAI';
  } else if (pathname.startsWith('/manage-vendors/')) {
    document.title = 'Vendor Catalog — ProcureAI';
  } else if (pathname.startsWith('/pr/')) {
    document.title = 'Request Details — ProcureAI';
  } else if (pathname.startsWith('/accept-invite')) {
    document.title = 'Accept Invitation — ProcureAI';
  } else if (pathname.startsWith('/vendor-quote/')) {
    document.title = 'Vendor Quote — ProcureAI';
  } else {
    document.title = 'ProcureAI — Procurement Management';
  }
}
