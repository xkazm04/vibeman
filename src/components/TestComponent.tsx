import React from 'react';

/**
 * TestComponent
 * ---------------
 * A simple, reusable React component that renders a styled "Hello World" heading.
 *
 * The component uses Tailwind CSS utility classes (as inferred from the existing project
 * structure) to style the heading. It is intentionally minimal to serve as a test
 * component for the page integration.
 */
const TestComponent: React.FC = () => {
  return (
    <h1 className="text-2xl font-bold">
      Hello World
    </h1>
  );
};

export default TestComponent;