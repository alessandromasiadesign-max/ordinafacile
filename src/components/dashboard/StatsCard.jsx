import React from 'react';
import { Card, CardHeader } from "@/components/ui/card";

export default function StatsCard({ title, value, icon: Icon, bgColor, trend, onClick }) {
  return (
    <Card
      className={`relative overflow-hidden hover:shadow-lg transition-shadow duration-200${onClick ? ' cursor-pointer' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === 'Enter' || e.key === ' ') onClick(e);
      }}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 ${bgColor} rounded-full opacity-10`} />
      <CardHeader className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="text-3xl font-bold mt-2">
              {value}
            </div>
          </div>
          <div className={`p-3 rounded-xl ${bgColor} bg-opacity-20`}>
            <Icon className={`w-6 h-6 ${bgColor.replace('bg-', 'text-')}`} />
          </div>
        </div>
        {trend && (
          <div className="flex items-center mt-4 text-sm text-muted-foreground">
            <span>{trend}</span>
          </div>
        )}
      </CardHeader>
    </Card>
  );
}