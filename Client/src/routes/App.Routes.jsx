import React from "react";
import { Routes, Route } from "react-router-dom";

import Dashboard from "../pages/Dashboard";
import Analytics from "../pages/Analytics";
import History from "../pages/History";
import Reports from "../pages/Reports";
import Settings from "../pages/Settings";
import Alerts from "../pages/Alerts";
import Notifications from "../pages/Notifications";
import Incidents from "../pages/Incidents";
import Impact from "../pages/Impact";
import Buildings from "../pages/Buildings";
import Locations from "../pages/Locations";
import Recommendations from "../pages/Recommendations";
import Sensors from "../pages/Sensors";

import Login from "../pages/Login";
import Register from "../pages/Register";

import PageWrapper from "../components/layout/PageWrapper";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import Profile from "../pages/Profile";

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
        path="/alerts"
        element={
          <ProtectedRoute>
            <PageWrapper>
              <Alerts />
            </PageWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/incidents"
        element={
          <ProtectedRoute>
            <PageWrapper>
              <Incidents />
            </PageWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/impact"
        element={
          <ProtectedRoute>
            <PageWrapper>
              <Impact />
            </PageWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/buildings"
        element={
          <ProtectedRoute>
            <PageWrapper>
              <Buildings />
            </PageWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/locations"
        element={
          <ProtectedRoute>
            <PageWrapper>
              <Locations />
            </PageWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/recommendations"
        element={
          <ProtectedRoute>
            <PageWrapper>
              <Recommendations />
            </PageWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/sensors"
        element={
          <ProtectedRoute>
            <PageWrapper>
              <Sensors />
            </PageWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <PageWrapper>
              <Notifications />
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


      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <PageWrapper>
              <Profile />
            </PageWrapper>
          </ProtectedRoute>
        }
      />

    </Routes>
  );
};

export default AppRoutes;
