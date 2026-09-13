import { BrowserRouter, Routes, Route } from "react-router-dom";

import RoleSelect from "./pages/RoleSelect";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import AccountRecovery from "./pages/auth/AccountRecovery";
import Profile from "./pages/profile/Profile";

import AdminDashboard from "./pages/admin/AdminDashboard";
import StudentForm from "./pages/admin/StudentForm";
import StudentList from "./pages/admin/StudentList";

import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import UploadMarks from "./pages/teacher/UploadMarks";
import LessonPlan from "./pages/teacher/LessonPlan";
import Timetable from "./pages/teacher/Timetable";
import Attendance from "./pages/teacher/Attendance";
import WeeklyReport from "./pages/teacher/WeeklyReport";

import ClassTeacher from "./pages/ClassTeacher";

import ParentDashboard from "./pages/parent/ParentDashboard";
import Announcements from "./pages/parent/Announcements";
import Results from "./pages/parent/Results";
import PaymentStatus from "./pages/parent/PaymentStatus";
import Receipts from "./pages/parent/Receipts";

import BursarDashboard from "./pages/bursar/BursarDashboard";
import CaptureMoney from "./pages/bursar/CaptureMoney";
import PupilDetails from "./pages/bursar/PupilDetails";
import Records from "./pages/bursar/Records";
import UpdateStatus from "./pages/bursar/UpdateStatus";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RoleSelect />} />
        <Route path="/login/:role" element={<Login />} />
        <Route path="/signup/:role" element={<Signup />} />
        <Route path="/account-recovery/:role" element={<AccountRecovery />} />
        <Route path="/profile/:role" element={<Profile />} />

        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/students" element={<StudentList />} />
        <Route path="/admin/students/new" element={<StudentForm />} />

        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/teacher/marks" element={<UploadMarks />} />
        <Route path="/teacher/lesson-plan" element={<LessonPlan />} />
        <Route path="/teacher/timetable" element={<Timetable />} />
        <Route path="/teacher/attendance" element={<Attendance />} />
        <Route path="/teacher/weekly-report" element={<WeeklyReport />} />

        <Route path="/class-teacher" element={<ClassTeacher />} />

        <Route path="/parent" element={<ParentDashboard />} />
        <Route path="/parent/announcements" element={<Announcements />} />
        <Route path="/parent/results" element={<Results />} />
        <Route path="/parent/payment-status" element={<PaymentStatus />} />
        <Route path="/parent/receipts" element={<Receipts />} />

        <Route path="/bursar" element={<BursarDashboard />} />
        <Route path="/bursar/capture-money" element={<CaptureMoney />} />
        <Route path="/bursar/pupil-details" element={<PupilDetails />} />
        <Route path="/bursar/records" element={<Records />} />
        <Route path="/bursar/update-status" element={<UpdateStatus />} />
      </Routes>
    </BrowserRouter>
  );
}
