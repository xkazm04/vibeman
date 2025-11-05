const contextId = "2d67989d-9349-4195-8c8f-bc704991b8df";

const selectors = [
  // DarkBlueprintLayout.tsx
  { dataTestid: "blueprint-layout", title: "Blueprint layout", filepath: "src/app/features/Onboarding/sub_Blueprint/DarkBlueprintLayout.tsx" },
  { dataTestid: "context-selector-modal", title: "Context selector modal", filepath: "src/app/features/Onboarding/sub_Blueprint/DarkBlueprintLayout.tsx" },
  { dataTestid: "blueprint-main-content", title: "Blueprint main content", filepath: "src/app/features/Onboarding/sub_Blueprint/DarkBlueprintLayout.tsx" },
  { dataTestid: "blueprint-column-grid", title: "Blueprint column grid", filepath: "src/app/features/Onboarding/sub_Blueprint/DarkBlueprintLayout.tsx" },
  
  // DecisionPanel.tsx
  { dataTestid: "decision-panel", title: "Decision panel", filepath: "src/app/features/Onboarding/sub_Blueprint/components/DecisionPanel.tsx" },
  { dataTestid: "decision-title", title: "Decision title", filepath: "src/app/features/Onboarding/sub_Blueprint/components/DecisionPanel.tsx" },
  { dataTestid: "decision-description", title: "Decision description", filepath: "src/app/features/Onboarding/sub_Blueprint/components/DecisionPanel.tsx" },
  { dataTestid: "decision-count-badge", title: "Decision count badge", filepath: "src/app/features/Onboarding/sub_Blueprint/components/DecisionPanel.tsx" },
  { dataTestid: "decision-close-btn", title: "Decision close button", filepath: "src/app/features/Onboarding/sub_Blueprint/components/DecisionPanel.tsx" },
  { dataTestid: "decision-reject-btn", title: "Decision reject button", filepath: "src/app/features/Onboarding/sub_Blueprint/components/DecisionPanel.tsx" },
  
  // IlluminatedButton.tsx (dynamic testids based on label)
  { dataTestid: "blueprint-button-vision", title: "Blueprint Vision button", filepath: "src/app/features/Onboarding/sub_Blueprint/components/IlluminatedButton.tsx" },
  { dataTestid: "blueprint-button-contexts", title: "Blueprint Contexts button", filepath: "src/app/features/Onboarding/sub_Blueprint/components/IlluminatedButton.tsx" },
  { dataTestid: "blueprint-button-structure", title: "Blueprint Structure button", filepath: "src/app/features/Onboarding/sub_Blueprint/components/IlluminatedButton.tsx" },
  { dataTestid: "blueprint-button-build", title: "Blueprint Build button", filepath: "src/app/features/Onboarding/sub_Blueprint/components/IlluminatedButton.tsx" },
  { dataTestid: "blueprint-button-photo", title: "Blueprint Photo button", filepath: "src/app/features/Onboarding/sub_Blueprint/components/IlluminatedButton.tsx" },
  { dataTestid: "blueprint-button-selectors", title: "Blueprint Selectors button", filepath: "src/app/features/Onboarding/sub_Blueprint/components/IlluminatedButton.tsx" },
  
  // ContextSelector.tsx
  { dataTestid: "context-selector-backdrop", title: "Context selector backdrop", filepath: "src/app/features/Onboarding/sub_Blueprint/components/ContextSelector.tsx" },
  { dataTestid: "context-selector-content", title: "Context selector content", filepath: "src/app/features/Onboarding/sub_Blueprint/components/ContextSelector.tsx" },
  { dataTestid: "context-selector-close-btn", title: "Context selector close", filepath: "src/app/features/Onboarding/sub_Blueprint/components/ContextSelector.tsx" },
  { dataTestid: "context-preview-close-btn", title: "Context preview close", filepath: "src/app/features/Onboarding/sub_Blueprint/components/ContextSelector.tsx" },
  
  // BlueprintKeyboardShortcuts.tsx
  { dataTestid: "keyboard-shortcuts-btn", title: "Keyboard shortcuts button", filepath: "src/app/features/Onboarding/sub_Blueprint/components/BlueprintKeyboardShortcuts.tsx" },
  { dataTestid: "keyboard-shortcuts-modal", title: "Keyboard shortcuts modal", filepath: "src/app/features/Onboarding/sub_Blueprint/components/BlueprintKeyboardShortcuts.tsx" },
  { dataTestid: "keyboard-shortcuts-close-btn", title: "Shortcuts close button", filepath: "src/app/features/Onboarding/sub_Blueprint/components/BlueprintKeyboardShortcuts.tsx" },
];

async function saveSelectors() {
  for (const selector of selectors) {
    try {
      const response = await fetch("http://localhost:3000/api/tester/selectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contextId,
          ...selector
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log(`✓ Saved: ${selector.dataTestid}`);
      } else {
        console.error(`✗ Failed: ${selector.dataTestid}`, result.error);
      }
    } catch (error) {
      console.error(`✗ Error saving ${selector.dataTestid}:`, error.message);
    }
  }
  console.log("\n✓ All selectors saved!");
}

saveSelectors();
