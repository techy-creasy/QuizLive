import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './context/AuthContext';
import { QuizProvider } from './context/QuizContext';
import Navbar from './components/layout/Navbar';
import { ProtectedRoute, PublicRoute } from './components/layout/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import MyQuizzesPage from './pages/MyQuizzesPage';
import QuizBuilderPage from './pages/QuizBuilderPage';
import HostRoomPage from './pages/HostRoomPage';
import JoinPage from './pages/JoinPage';
import WaitingRoomPage from './pages/WaitingRoomPage';
import QuizPage from './pages/QuizPage';
import ResultsPage from './pages/ResultsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

function AppLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <QuizProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<AppLayout><LandingPage /></AppLayout>} />
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Participant routes */}
            <Route path="/join" element={<ProtectedRoute><AppLayout><JoinPage /></AppLayout></ProtectedRoute>} />
            <Route path="/room/:roomCode" element={<ProtectedRoute><WaitingRoomPage /></ProtectedRoute>} />
            <Route path="/room/:roomCode/quiz" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />

            {/* Host routes */}
            <Route path="/dashboard" element={<ProtectedRoute requireHost><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>} />
            <Route path="/quizzes" element={<ProtectedRoute requireHost><AppLayout><MyQuizzesPage /></AppLayout></ProtectedRoute>} />
            <Route path="/quizzes/new" element={<ProtectedRoute requireHost><AppLayout><QuizBuilderPage /></AppLayout></ProtectedRoute>} />
            <Route path="/quizzes/:id/edit" element={<ProtectedRoute requireHost><AppLayout><QuizBuilderPage /></AppLayout></ProtectedRoute>} />
            <Route path="/host/:roomCode" element={<ProtectedRoute requireHost><HostRoomPage /></ProtectedRoute>} />
            <Route path="/analytics/:quizId" element={<ProtectedRoute requireHost><AppLayout><AnalyticsPage /></AppLayout></ProtectedRoute>} />

            {/* Shared routes */}
            <Route path="/rooms/:id/results" element={<ProtectedRoute><AppLayout><ResultsPage /></AppLayout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>} />

            {/* 404 */}
            <Route path="*" element={<AppLayout><NotFoundPage /></AppLayout>} />
          </Routes>

          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="dark"
          />
        </QuizProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
