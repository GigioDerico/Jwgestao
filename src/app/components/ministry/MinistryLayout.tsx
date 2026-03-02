import React from 'react';
import { Outlet } from 'react-router';

export function MinistryLayout() {
  return (
    <div className="space-y-4">
      <Outlet />
    </div>
  );
}
