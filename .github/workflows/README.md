# GitHub Actions Workflow

This directory contains GitHub Actions workflows for automating various tasks in the Ultimate Secure Chat application.

## Deploy Workflow (`deploy.yml`)

This workflow handles the continuous integration and deployment of the application to GitHub Pages.

### Triggered by:
- Pushes to the `main` or `master` branch
- Pull requests targeting the `main` or `master` branch
- Manual runs from the GitHub Actions tab

### Workflow steps:

#### Build Job:
1. **Checkout repository**: Fetches the latest code
2. **Setup Node.js**: Configures Node.js v20 with npm caching
3. **Install dependencies**: Runs `npm ci` for clean installs
4. **Run lint**: Executes ESLint to check code quality
5. **Build project**: Compiles the application with Vite
6. **Setup Pages**: Configures GitHub Pages
7. **Upload artifact**: Packages the build output (`dist` folder) for deployment

#### Deploy Job:
1. **Deploy to GitHub Pages**: Publishes the build artifacts to GitHub Pages

### Notes:
- The deployment only happens on pushes to main/master or manual workflow runs, not on pull requests
- The workflow uses concurrency control to prevent multiple deployments running simultaneously

## Setting up GitHub Pages

To use this workflow:

1. Go to your repository settings
2. Navigate to the "Pages" section
3. Set the source to "GitHub Actions"
4. Make sure your repository has the necessary permissions set up

## Manual Deployment

You can manually trigger the workflow by:
1. Going to the "Actions" tab in your repository
2. Selecting the "Build and Deploy" workflow
3. Clicking "Run workflow" 