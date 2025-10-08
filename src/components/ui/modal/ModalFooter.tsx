"use client";
import React from "react";

interface ModalFooterProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export default function ModalFooter({ left, right, className }: ModalFooterProps) {
  return (
    <div className={`p-4 border-t border-gray-700 bg-gray-800/30 ${className || ""}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">{left}</div>
        <div className="flex items-center space-x-3">{right}</div>
      </div>
    </div>
  );
}
