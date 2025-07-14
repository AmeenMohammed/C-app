# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/3df2053b-e033-4b8f-9ccf-263c84f6936c

## Important Setup Required

⚠️ **Before running the application, you need to set up environment variables:**

1. Create a `.env` file in the root directory
2. Add your Google Maps API key and other required variables
3. See [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for detailed instructions

## Recent Changes

- **Fixed Google OAuth**: Resolved OAuth callback issues with Supabase authentication
- **Replaced MapBox with Google Maps**: Removed MapBox dependency and implemented Google Maps for location services
- **Environment Configuration**: Added proper environment variable setup for Google Maps API

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/3df2053b-e033-4b8f-9ccf-263c84f6936c) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Set up environment variables (REQUIRED!)
# Create a .env file and add your Google Maps API key
# See ENVIRONMENT_SETUP.md for details

# Step 5: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Google Maps API
- Supabase (Backend & Authentication)

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/3df2053b-e033-4b8f-9ccf-263c84f6936c) and click on Share -> Publish.

**Important for deployment**: Make sure to set your environment variables in your hosting platform's environment settings.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)
