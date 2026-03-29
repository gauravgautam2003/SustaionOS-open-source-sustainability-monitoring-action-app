import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";

import PageWrapper from "../components/layout/PageWrapper";
import ProtectedRoute from "../components/auth/ProtectedRoute";

const Dashboard = lazy(() => import("../pages/Dashboard"));
const Analytics = lazy(() => import("../pages/Analytics"));
const History = lazy(() => import("../pages/History"));
const Reports = lazy(() => import("../pages/Reports"));
const Settings = lazy(() => import("../pages/Settings"));
const Alerts = lazy(() => import("../pages/Alerts"));
const Notifications = lazy(() => import("../pages/Notifications"));
const Incidents = lazy(() => import("../pages/Incidents"));
const Impact = lazy(() => import("../pages/Impact"));
const Buildings = lazy(() => import("../pages/Buildings"));
const Locations = lazy(() => import("../pages/Locations"));
const Recommendations = lazy(() => import("../pages/Recommendations"));
const Sensors = lazy(() => import("../pages/Sensors"));
const Login = lazy(() => import("../pages/Login"));
const Register = lazy(() => import("../pages/Register"));
const Profile = lazy(() => import("../pages/Profile"));

const pageFallback = (
  <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">
    Loading workspace...
  </div>
);

const withSuspense = (element) => <Suspense fallback={pageFallback}>{element}</Suspense>;

const protectedPage = (element) => (
  <ProtectedRoute>
    <PageWrapper>{withSuspense(element)}</PageWrapper>
  </ProtectedRoute>
);

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={withSuspense(<Login />)} />
      <Route path="/register" element={withSuspense(<Register />)} />

      <Route path="/" element={protectedPage(<Dashboard />)} />
      <Route path="/analytics" element={protectedPage(<Analytics />)} />
      <Route path="/history" element={protectedPage(<History />)} />
      <Route path="/reports" element={protectedPage(<Reports />)} />
      <Route path="/alerts" element={protectedPage(<Alerts />)} />
      <Route path="/incidents" element={protectedPage(<Incidents />)} />
      <Route path="/impact" element={protectedPage(<Impact />)} />
      <Route path="/buildings" element={protectedPage(<Buildings />)} />
      <Route path="/locations" element={protectedPage(<Locations />)} />
      <Route path="/recommendations" element={protectedPage(<Recommendations />)} />
      <Route path="/sensors" element={protectedPage(<Sensors />)} />
      <Route path="/notifications" element={protectedPage(<Notifications />)} />
      <Route path="/settings" element={protectedPage(<Settings />)} />
      <Route path="/profile" element={protectedPage(<Profile />)} />
    </Routes>
  );
};

export default AppRoutes;
