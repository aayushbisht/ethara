# ProjectGrid

A full-stack project management application built with the MERN stack (MongoDB, Express, React, Node.js).

## Features

- Authentication — username/password with JWT
- Role-based access control — Admin and Member roles
- Project management — create projects, manage team members
- Task management — create, assign, update, and delete tasks
- Dashboard — overview of projects, tasks, and overdue items
- Kanban board and list view for tasks
- Dark/light theme toggle

## Role Permissions

| Action | Admin | Member |
|---|---|---|
| Create project | Yes | No |
| Delete project | Yes (creator only) | No |
| Add/remove members | Yes | No |
| Create/edit/delete tasks | Yes | No |
| View all tasks in a project | Yes | Yes |
| Update status of assigned task | Yes | Yes |

## Project Structure

```
ethara/
  backend/    Node.js + Express REST API
  frontend/   React (Vite) client
```

## Prerequisites

- Node.js >= 18
- MongoDB running locally on port 27017 (or a MongoDB Atlas URI)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/aayushbisht/ethara.git
cd ethara
```

### 2. Backend setup

```bash
cd backend
cp .env.example .env
# Edit .env and set your MONGO_URI and JWT_SECRET
npm install
npm run dev
```

Backend runs on `http://localhost:5000`

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

## Environment Variables

### backend/.env

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/projectgrid
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=7d
```

## API Overview

| Method | Route | Access | Description |
|---|---|---|---|
| POST | /api/auth/register | Public | Register a new user |
| POST | /api/auth/login | Public | Login and get token |
| GET | /api/auth/me | Auth | Get current user |
| GET | /api/projects | Auth | List user's projects |
| POST | /api/projects | Admin | Create a project |
| GET | /api/projects/:id | Member | Project details |
| POST | /api/projects/:id/members | Admin | Add member |
| DELETE | /api/projects/:id/members/:userId | Admin | Remove member |
| DELETE | /api/projects/:id | Admin | Delete project |
| GET | /api/tasks/dashboard | Auth | Dashboard stats |
| POST | /api/tasks/project/:id | Admin | Create task |
| GET | /api/tasks/project/:id | Member | List project tasks |
| PATCH | /api/tasks/:taskId/status | Member | Update task status |
| PATCH | /api/tasks/:taskId | Admin | Edit task |
| DELETE | /api/tasks/:taskId | Admin | Delete task |
| GET | /api/users/search?q= | Auth | Search users |
