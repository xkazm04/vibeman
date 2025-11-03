import React from 'react';

interface SectionHeaderProps {
  title: string;
  color: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, color }) => {
  return (
    <h6 className="text-sm font-semibold font-mono" style={{ color }}>
      {title}
    </h6>
  );
};
