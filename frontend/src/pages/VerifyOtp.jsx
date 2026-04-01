// import { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { apiFetch } from "../api/client";
// import { useAuth } from "../context/AuthContext";
// import { resolveDashboardRoute } from "../utils/roleRedirect";

// export default function VerifyOtp() {
//   const navigate = useNavigate();
//   const { login } = useAuth();

//   const [form, setForm] = useState({
//     email: "",
//     otp: "",
//     password: "",
//   });

//   const handleVerify = async () => {
//     const res = await apiFetch("/verify-otp", {
//       method: "POST",
//       body: JSON.stringify(form),
//     });

//     if (res?.token) {
//       const payload = login(res.token);
//       navigate(resolveDashboardRoute(payload.role));
//     }
//   };

//   return (
//     <div>
//       <h2>Verify OTP</h2>

//       <input
//         placeholder="Email"
//         onChange={(e) => setForm({ ...form, email: e.target.value })}
//       />

//       <input
//         placeholder="OTP"
//         onChange={(e) => setForm({ ...form, otp: e.target.value })}
//       />

//       <input
//         placeholder="New Password"
//         type="password"
//         onChange={(e) => setForm({ ...form, password: e.target.value })}
//       />

//       <button onClick={handleVerify}>Verify & Set Password</button>
//     </div>
//   );
// }