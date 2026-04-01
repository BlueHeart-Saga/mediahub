export const resolveDashboardRoute = (role) => {
  switch (role) {
    case "super_admin":
      return "/super-admin/dashboard";

    case "company_admin":
      return "/company-admin/dashboard";

    case "editor":
      return "/editor/dashboard";

    default:
      return "/login";
  }
};