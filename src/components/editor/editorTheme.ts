/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Defines the custom Vibeman dark theme for Monaco Editor
 */
export function defineVibemanTheme(monacoInstance: any) {
  monacoInstance.editor.defineTheme('vibeman-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'keyword', foreground: '569CD6' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'type', foreground: '4EC9B0' },
      { token: 'class', foreground: '4EC9B0' },
      { token: 'function', foreground: 'DCDCAA' },
      { token: 'variable', foreground: '9CDCFE' },
    ],
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      'editor.lineHighlightBackground': '#2d2d30',
      'editor.selectionBackground': '#264f78',
      'editor.inactiveSelectionBackground': '#3a3d41',
      'editorCursor.foreground': '#aeafad',
      'editorWhitespace.foreground': '#404040',
      'editorIndentGuide.background': '#404040',
      'editorIndentGuide.activeBackground': '#707070',
      'diffEditor.insertedTextBackground': '#2b5a2b55',
      'diffEditor.removedTextBackground': '#7a2b2b55',
    },
  });
}

/**
 * Clears error markers for TypeScript and JavaScript models
 */
export function clearErrorMarkers(
  monacoInstance: any,
  model: any
) {
  if (!model) return;

  monacoInstance.editor.setModelMarkers(model, 'typescript', []);
  monacoInstance.editor.setModelMarkers(model, 'javascript', []);
}

/**
 * Sets up a listener to continuously clear error markers
 */
export function setupMarkerClearer(
  monacoInstance: any,
  model: any
): any {
  return monacoInstance.editor.onDidChangeMarkers(() => {
    clearErrorMarkers(monacoInstance, model);
  });
}
