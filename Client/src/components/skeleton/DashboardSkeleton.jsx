import React from "react";
import { Skeleton } from "@mui/material";

const DashboardSkeleton = () => {
  return (
    <div className="space-y-8 animate-pulse">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton variant="text" width={200} height={30} />
          <Skeleton variant="text" width={300} height={20} />
        </div>
        <Skeleton variant="text" width={100} height={20} />
      </div>

      {/* Top Grid */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-6 lg:col-span-4">
          <Skeleton variant="rectangular" height={200} className="rounded-lg" />
        </div>
        <div className="col-span-12 md:col-span-6 lg:col-span-8">
          <Skeleton variant="rectangular" height={200} className="rounded-lg" />
        </div>
      </div>

      {/* Charts */}
      <div className="space-y-6">
        <Skeleton variant="rectangular" height={300} className="rounded-lg" />
        <Skeleton variant="rectangular" height={300} className="rounded-lg" />
      </div>

      {/* Alerts & Suggestions */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-6">
          <Skeleton variant="rectangular" height={200} className="rounded-lg" />
        </div>
        <div className="col-span-12 lg:col-span-6">
          <Skeleton variant="rectangular" height={200} className="rounded-lg" />
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-6">
          <Skeleton variant="rectangular" height={150} className="rounded-lg" />
        </div>
        <div className="col-span-12 md:col-span-6">
          <Skeleton variant="rectangular" height={150} className="rounded-lg" />
        </div>
      </div>

    </div>
  );
};

export default DashboardSkeleton;