const contextId = "2d67989d-9349-4195-8c8f-bc704991b8df";

const testScenario = `1. Navigate to http://localhost:3000
2. Wait for the main application to load
3. Click on the Blueprint/Onboarding navigation element to open the Blueprint layout
4. Wait for [data-testid="blueprint-layout"] to be visible
5. The Blueprint layout should display with a grid background and four columns
6. Click on [data-testid="blueprint-button-vision"] to select the Vision scan button
7. Wait for [data-testid="decision-panel"] to appear with a pre-scan decision
8. Verify that [data-testid="decision-title"] displays "Execute Vision Scan?"
9. Click on [data-testid="decision-accept-btn"] to accept the scan
10. Wait for the scan progress to complete (progress bar at top of screen)
11. A new decision panel should appear with scan results
12. Click on [data-testid="decision-accept-btn"] to accept the scan results
13. Click on [data-testid="blueprint-button-contexts"] to select the Contexts scan
14. Wait for [data-testid="context-selector-modal"] to appear
15. A modal with [data-testid="context-selector-content"] should display available contexts
16. Click on the first context card to select it
17. Accept the pre-scan decision when it appears
18. Click on [data-testid="task-panel-toggle"] on the right side to open the task progress panel
19. The task progress panel should expand showing task completion progress
20. Click on [data-testid="keyboard-shortcuts-btn"] in the bottom right corner
21. Wait for [data-testid="keyboard-shortcuts-modal"] to appear
22. The keyboard shortcuts modal should display all available shortcuts
23. Click on [data-testid="keyboard-shortcuts-close-btn"] to close the modal
24. The Blueprint layout should remain visible with all interactive elements functional`;

async function saveTestScenario() {
  try {
    const response = await fetch("http://localhost:3000/api/contexts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contextId,
        updates: {
          test_scenario: testScenario
        }
      })
    });
    
    const result = await response.json();
    if (result.success) {
      console.log("✓ Test scenario saved successfully!");
    } else {
      console.error("✗ Failed to save test scenario:", result.error);
    }
  } catch (error) {
    console.error("✗ Error saving test scenario:", error.message);
  }
}

saveTestScenario();
