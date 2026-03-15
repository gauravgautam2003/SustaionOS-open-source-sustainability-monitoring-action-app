import React from "react";
import { Routes, Route } from "react-router-dom";

import Dashboard from "../pages/Dashboard";
import Analytics from "../pages/Analytics";
import History from "../pages/History";
import Reports from "../pages/Reports";
import Settings from "../pages/Settings";

import Login from "../pages/Login";
import Register from "../pages/Register";

import PageWrapper from "../components/layout/PageWrapper";
import ProtectedRoute from "../components/auth/ProtectedRoute";

const AppRoutes = () => {
  return (
    <Routes>

      {/* PUBLIC ROUTES */}

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* PROTECTED ROUTES */}

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <PageWrapper>
              <Dashboard />
            </PageWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <PageWrapper>
              <Analytics />
            </PageWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <PageWrapper>
              <History />
            </PageWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <PageWrapper>
              <Reports />
            </PageWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <PageWrapper>
              <Settings />
            </PageWrapper>
          </ProtectedRoute>
        }
      />

    </Routes>
  );
};

export default AppRoutes;