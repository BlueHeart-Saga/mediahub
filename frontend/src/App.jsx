import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import "./index.css"

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
// import SuperAdminRegister from './pages/SuperAdminRegister';
import SuperAdminManage from "./pages/developer/SuperAdminManage";
import SuperAdminRequests from "./pages/developer/SuperAdminRequests";
import DeveloperOverview from "./pages/developer/DeveloperOverview";
import RegisterBlocked from "./pages/RegisterBlocked";
import ContactUs from "./pages/ContactUs";
import DeveloperLogin from "./pages/developer/DeveloperLogin";

import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./layouts/AdminLayout";
import DeveloperLayout from "./layouts/DeveloperLayout";

import VerifyOtp from "./pages/Auth/VerifyOtp";
import ForgotPassword from "./pages/Auth/ForgotPassword";
import ResetPassword from "./pages/Auth/ResetPassword";

/* Dashboards */
import SuperAdminDashboard from "./pages/SuperAdmin/Dashboard";
import CompanyAdminDashboard from "./pages/CompanyAdmin/CompanyAdminDashboard";
import EditorDashboard from "./pages/Editor/EditorDashboard";
import SubscribeManage from "./pages/SuperAdmin/SubscribeManage";

/* Shared Pages */
import Users from "./pages/Common/Users";
import CompanyUsers from "./pages/CompanyAdmin/CompanyUsers";
import Posts from "./pages/Common/Posts";
import Settings from "./pages/Common/Settings";

/* Super Admin */
import Companies from "./pages/SuperAdmin/Companies";
import InviteAdmin from "./pages/SuperAdmin/InviteAdmin";
import InviteEditor from "./pages/SuperAdmin/InviteEditor";
import Sections from "./pages/SuperAdmin/Sections";
import Categories from "./pages/SuperAdmin/Categories";
import ContentManager from "./pages/CompanyAdmin/Content";

/* Company Admin */
import CAInviteEditor from "./pages/CompanyAdmin/CAInviteEditor";
import CASections from "./pages/CompanyAdmin/CASections";
import CACategories from "./pages/CompanyAdmin/CACategories";
import CAContent from "./pages/CompanyAdmin/Content";

/* Editor */
import EditorContent from "./pages/CompanyAdmin/Content";

/* Public */
import PublicContent from "./contents/PublicContent";
import PublicSection from "./contents/PublicSection";
import PublicCompany from "./contents/PublicCompany";
import PublicCompanies from "./contents/PublicCompanies";
import PublicCategory from "./contents/PublicCategory";
import ContentView from "./contents/ContentView";

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      

      <Routes>
        

        {/* ---------- PUBLIC ---------- */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<RegisterBlocked />} />
        <Route path="/contact" element={<ContactUs />} />
        

        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />



        {/* ---------- COMPANY ADMIN ---------- */}

        <Route path="/developer/login" element={<DeveloperLogin />} />
        <Route path="/developer/superadmin/register" element={<Register />} />
        
        <Route path="/developer/superadmin" element={<DeveloperLayout />}>
            <Route path="manage" element={<SuperAdminManage />} />
            <Route path="requests" element={<SuperAdminRequests />} />
            <Route path="overview" element={<DeveloperOverview />} />
          </Route>




        {/* ---------- PUBLIC PAGES ---------- */}

        
        <Route path="/companies" element={<PublicCompanies />} />   {/*  show all companies */}
        <Route path="/company/:companyId" element={<PublicCompany />} />  {/*  show company based  all section */}
        <Route path="/company/:companyId/:sectionSlug" element={<PublicSection />} />  {/*  show section basedall all categories */}
        <Route path="/company/:companyId/:sectionSlug/:categorySlug" element={<PublicCategory />} />   {/*  show category based all companies */}


        <Route path="/company/:companyId/:sectionSlug/:categorySlug/:contentId" element={<PublicContent />} />   {/*  view post */}

        <Route path="/content/:contentId" element={<ContentView />} />   {/*  view post */}



        {/* ---------- SUPER ADMIN ---------- */}
        <Route
          path="/super-admin"
          element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}
        >
          <Route path="dashboard" element={<SuperAdminDashboard />} />
          <Route path="companies" element={<Companies />} />
          <Route path="invite-admin" element={<InviteAdmin />} />
          <Route path="invite-editor" element={<InviteEditor />} />
          <Route path="users" element={<Users />} />
          <Route path="settings" element={<Settings />} />

          {/* Global taxonomy control */}
          <Route path="sections" element={<Sections />} />
          <Route path="categories" element={<Categories />} />

          {/* Post control */}
          <Route path="content" element={<ContentManager />} />
          <Route path="content/:contentId" element={<EditorContent />} />
          <Route path="posts" element={<Posts />} />
          <Route path="posts/:id" element={<PublicContent />} />
          <Route path="subscribe" element={<SubscribeManage />} />
        </Route>

        {/* ---------- COMPANY ADMIN ---------- */}
        <Route
          path="/company-admin"
          element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}
        >
          <Route path="dashboard" element={<CompanyAdminDashboard />} />
          <Route path="invite-editor" element={<CAInviteEditor />} />
          <Route path="users" element={<CompanyUsers />} />
          <Route path="settings" element={<Settings />} />

          <Route path="sections" element={<CASections />} />
          <Route path="categories" element={<CACategories />} />

          <Route path="content" element={<CAContent />} />
          <Route path="content/:contentId" element={<CAContent/>} />
          <Route path="posts" element={<Posts />} />
          <Route path="posts/:id" element={<PublicContent />} />
        </Route>

        {/* ---------- EDITOR ---------- */}
        <Route
          path="/editor"
          element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}
        >
          <Route path="dashboard" element={<EditorDashboard />} />
          <Route path="content" element={<EditorContent />} />
          <Route path="content/:contentId" element={<EditorContent/>} />
          <Route path="posts" element={<Posts />} />
          <Route path="posts/:id" element={<PublicContent />} />
          <Route path="settings" element={<Settings />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}