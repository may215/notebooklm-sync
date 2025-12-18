# Contributing to NotebookLM Sync

Thank you for your interest in contributing! We welcome all contributions that align with the goal of creating a living project memory for NotebookLM.

## How to Contribute

### Reporting Bugs
Please open an issue on GitHub with:
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node.js version, OS)

### Suggesting Features
Open an issue tagged `enhancement` describing the feature and why it fits the "incremental memory" philosophy.

### Pull Requests
1. Fork the repository.
2. Create a new branch: `git checkout -b feature/my-new-feature`.
3. Make your changes and write tests.
4. Ensure tests pass: `npm test`.
5. Submit a Pull Request.

## Development

### Setup
```bash
npm run dev
```

### Testing
```bash
npm test
```

## Extensions
- **VS Code**: Located in `apps/vscode-extension`. Use "Debug Extension" launch config in VS Code.
- **Chrome**: Located in `apps/browser-extension`. Load unpacked in `chrome://extensions`.

## Code of Conduct
Please be respectful and kind. We are all here to learn and build together.
