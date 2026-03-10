import React from "react";
import { Routes, Route } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import Analytics from "../pages/Analytics";
import History from "../pages/History";
import Reports from "../pages/Reports";
import Settings from "../pages/Settings";
import PageWrapper from "../components/layout/PageWrapper";

const AppRoutes = () => {
  return (
    <Routes>

      <Route
        path="/"
        element={
          <PageWrapper>
            <Dashboard />
          </PageWrapper>
        }
      />

      <Route
        path="/analytics"
        element={
          <PageWrapper>
            <Analytics />
          </PageWrapper>
        }
      />

      <Route
        path="/history"
        element={
          <PageWrapper>
            <History />
          </PageWrapper>
        }
      />

      <Route
        path="/reports"
        element={
          <PageWrapper>
            <Reports />
          </PageWrapper>
        }
      />

      <Route
        path="/settings"
        element={
          <PageWrapper>
            <Settings />
          </PageWrapper>
        }
      />

    </Routes>
  );
};

export default AppRoutes;