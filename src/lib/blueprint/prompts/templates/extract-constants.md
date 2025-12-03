## Extract Magic Numbers to Constants

Found {{issueCount}} magic number(s) that should be extracted to named constants.

### Files Affected
{{fileList}}

### Issues to Address
{{issueDetails}}

### Guidelines
1. Create named constants for numeric values
2. Use UPPER_SNAKE_CASE for constant names
3. Group related constants in dedicated files
4. Add comments explaining the constant's purpose
5. Place configuration values in config files

### Naming Conventions
- Timeouts: `TIMEOUT_MS`, `DEBOUNCE_DELAY_MS`
- Limits: `MAX_RETRIES`, `PAGE_SIZE`, `MAX_FILE_SIZE`
- HTTP: `HTTP_STATUS_OK`, `HTTP_STATUS_NOT_FOUND`
- Dimensions: `SIDEBAR_WIDTH`, `HEADER_HEIGHT`

### Acceptance Criteria
- [ ] Magic numbers extracted to named constants
- [ ] Constants have descriptive names
- [ ] Constants grouped logically
- [ ] Build passes without errors
- [ ] Functionality unchanged
