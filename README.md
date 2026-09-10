# CollabHub

CollabHub is a modern, real-time workspace and project management application built with Next.js, Supabase, and Tailwind CSS. It brings together task tracking, team communication, and scheduling into a single platform.

## Features

- **Interactive Kanban Boards**: Drag-and-drop task management with priority levels, status columns, and inline task creation.
- **Schedule & Calendar View**: Dynamic week and month views to track task due dates and workspace deadlines.
- **Real-Time Workspace Chat**: Integrated chat rooms for instant team communication within specific workspaces.
- **Notification System**: Built-in notification bell and activity updates for user actions and task deadlines.
- **Authentication & Security**: Email/password sign-up, password reset flows, protected dashboard routes, and Supabase Row Level Security (RLS).
- **Workspace Management**: Multi-workspace switching, member invitations, and team administration.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Server Components, Turbopack)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Realtime, Auth)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- A Supabase project

### Environment Variables

Create a `.env.local` file in the root directory and add your Supabase credentials:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
\`\`\`

### Installation

1. Clone the repository:
   \`\`\`bash
   git clone https://github.com/your-username/collab-hub.git
   cd collab-hub
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

4. Open [http://localhost:3000](http://localhost:3000) in your browser.